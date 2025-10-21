'use client';

import React, { createContext, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Order, OrderLine } from '@/lib/types';
import { 
  useActiveCart, 
  useAddToCart, 
  useRemoveFromCart, 
  useUpdateCartQuantity, 
  useClearCart 
} from '@/hooks/use-cart';

interface CartContextType {
  items: OrderLine[];
  itemCount: number;
  total: number;
  addItem: (productVariantId: string, quantity?: number) => Promise<void>;
  removeItem: (orderLineId: string) => Promise<void>;
  updateQuantity: (orderLineId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  resetSession: () => Promise<void>; // 🆕 Para limpiar sesión completa
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  order: Order | null;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  // React Query hooks
  const { data: cartData, isLoading, error: cartError, refetch } = useActiveCart();
  const addToCartMutation = useAddToCart();
  const removeFromCartMutation = useRemoveFromCart();
  const updateQuantityMutation = useUpdateCartQuantity();
  const clearCartMutation = useClearCart();

  // Derived state
  const order = cartData?.activeOrder || null;
  const items = order?.lines || [];
  const itemCount = items.reduce((total: number, item: OrderLine) => total + item.quantity, 0);
  const total = order?.totalWithTax || 0;
  
  // Combined loading and error states
  const isUpdating = addToCartMutation.isPending || 
                    removeFromCartMutation.isPending || 
                    updateQuantityMutation.isPending || 
                    clearCartMutation.isPending;
  
  const error = cartError?.message || 
               addToCartMutation.error?.message || 
               removeFromCartMutation.error?.message || 
               updateQuantityMutation.error?.message || 
               clearCartMutation.error?.message || 
               null;

  // 🆕 Wrapper mejorado con auto-recovery
  const addItem = async (productVariantId: string, quantity = 1) => {
    try {
      console.log('🛒 Adding item to cart:', { productVariantId, quantity });
      await addToCartMutation.mutateAsync({ productVariantId, quantity });
      console.log('✅ Item added successfully');
    } catch (error: any) {
      console.error('❌ Error adding item to cart:', error);
      
      // 🔄 Si el error es por estado inválido de la orden, intentar recuperar
      if (
        error?.message?.includes('state') || 
        error?.message?.includes('AddingItems') ||
        error?.message?.includes('requiresClearCart')
      ) {
        console.log('🔄 Order in invalid state, attempting auto-recovery...');
        
        try {
          // Limpiar el carrito
          await clearCartMutation.mutateAsync();
          console.log('✅ Cart cleared, retrying...');
          
          // Reintentar agregar el producto
          await addToCartMutation.mutateAsync({ productVariantId, quantity });
          console.log('✅ Item added after recovery');
          
          return; // Éxito después de recovery
        } catch (retryError) {
          console.error('❌ Auto-recovery failed:', retryError);
          throw new Error('Cart was in an invalid state. Please refresh the page and try again.');
        }
      }
      
      // Si no es un error de estado, propagar el error original
      throw error;
    }
  };

  const removeItem = async (orderLineId: string) => {
    try {
      await removeFromCartMutation.mutateAsync({ orderLineId });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw error;
    }
  };

  const updateQuantity = async (orderLineId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(orderLineId);
      return;
    }

    try {
      await updateQuantityMutation.mutateAsync({ orderLineId, quantity });
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      console.log('🧹 Clearing cart...');
      await clearCartMutation.mutateAsync();
      console.log('✅ Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  // 🆕 Reset completo de la sesión (para casos extremos)
  const resetSession = async () => {
    try {
      console.log('🔄 Resetting session...');
      
      // 1. Limpiar carrito en el servidor
      try {
        await clearCartMutation.mutateAsync();
      } catch (e) {
        console.log('Cart already empty or error clearing:', e);
      }
      
      // 2. Limpiar cache de React Query
      queryClient.clear();
      
      // 3. Limpiar cookies del cliente (solo las que podemos acceder)
      if (typeof document !== 'undefined') {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
      
      // 4. Refetch para crear nueva sesión
      await refetch();
      
      console.log('✅ Session reset complete');
    } catch (error) {
      console.error('Error resetting session:', error);
      throw error;
    }
  };

  const refreshCart = () => {
    refetch();
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        resetSession, // 🆕
        isLoading,
        isUpdating,
        error,
        order,
        refreshCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}