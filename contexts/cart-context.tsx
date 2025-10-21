'use client';

import React, { createContext, useContext } from 'react';
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
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  order: Order | null;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  // React Query hooks
  const { data: cartData, isLoading, error: cartError, refetch } = useActiveCart();
  const addToCartMutation = useAddToCart();
  const removeFromCartMutation = useRemoveFromCart();
  const updateQuantityMutation = useUpdateCartQuantity();
  const clearCartMutation = useClearCart();

  // Derived state
  const order = cartData?.activeOrder || null;
  const items = order?.lines || [];
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
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

  // Wrapper functions that use React Query mutations
  const addItem = async (productVariantId: string, quantity = 1) => {
    try {
      await addToCartMutation.mutateAsync({ productVariantId, quantity });
    } catch (error) {
      console.error('Error adding item to cart:', error);
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
      await clearCartMutation.mutateAsync();
    } catch (error) {
      console.error('Error clearing cart:', error);
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
