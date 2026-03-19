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
  resetSession: () => Promise<void>;
  isInCart: (productVariantId: string) => boolean;
  getCartItemByVariant: (productVariantId: string) => OrderLine | undefined;
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

  // Check if a product variant is already in the cart
  const isInCart = (productVariantId: string): boolean => {
    return items.some((item: OrderLine) => item.productVariant.id === productVariantId);
  };

  // Get a cart item by its product variant ID
  const getCartItemByVariant = (productVariantId: string): OrderLine | undefined => {
    return items.find((item: OrderLine) => item.productVariant.id === productVariantId);
  };

  // Add item with auto-recovery for invalid order states
  const addItem = async (productVariantId: string, quantity = 1) => {
    try {
      await addToCartMutation.mutateAsync({ productVariantId, quantity });
    } catch (error: any) {
      // If the error is due to an invalid order state, attempt recovery
      if (
        error?.message?.includes('state') ||
        error?.message?.includes('AddingItems') ||
        error?.message?.includes('requiresClearCart')
      ) {
        try {
          await clearCartMutation.mutateAsync();
          await addToCartMutation.mutateAsync({ productVariantId, quantity });
          return;
        } catch (retryError) {
          console.error('Auto-recovery failed:', retryError);
          throw new Error('Cart was in an invalid state. Please refresh the page and try again.');
        }
      }
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

  // Full session reset (for extreme cases)
  const resetSession = async () => {
    try {
      // Clear cart on server
      try {
        await clearCartMutation.mutateAsync();
      } catch (e) {
        // Cart may already be empty
      }

      // Clear React Query cache
      queryClient.clear();

      // Clear accessible client cookies
      if (typeof document !== 'undefined') {
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }

      // Refetch to create a new session
      await refetch();
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
        resetSession,
        isInCart,
        getCartItemByVariant,
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