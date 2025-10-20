'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Order, OrderLine } from '@/lib/types';

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
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/cart/active', {
        credentials: 'include', // Include cookies in request
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch cart');
      }

      setOrder(data.activeOrder);
    } catch (error) {
      console.error('Error loading cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to load cart');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = async (productVariantId: string, quantity = 1) => {
    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({
          productVariantId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add item to cart');
      }

      // Check if the result is an error
      if (data.addItemToOrder?.__typename === 'ErrorResult') {
        throw new Error(data.addItemToOrder.message || 'Failed to add item to cart');
      }

      setOrder(data.addItemToOrder);
    } catch (error) {
      console.error('Error adding item to cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to add item to cart');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const removeItem = async (orderLineId: string) => {
    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({
          orderLineId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove item from cart');
      }

      // Check if the result is an error
      if (data.removeOrderLine?.__typename === 'ErrorResult') {
        throw new Error(data.removeOrderLine.message || 'Failed to remove item from cart');
      }

      setOrder(data.removeOrderLine);
    } catch (error) {
      console.error('Error removing item from cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove item from cart');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateQuantity = async (orderLineId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(orderLineId);
      return;
    }

    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch('/api/cart/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request
        body: JSON.stringify({
          orderLineId,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update cart item');
      }

      // Check if the result is an error
      if (data.adjustOrderLine?.__typename === 'ErrorResult') {
        throw new Error(data.adjustOrderLine.message || 'Failed to update cart item');
      }

      setOrder(data.adjustOrderLine);
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError(error instanceof Error ? error.message : 'Failed to update cart item');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const clearCart = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      const response = await fetch('/api/cart/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in request
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear cart');
      }

      // Check if the result is an error
      if (data.removeAllOrderLines?.__typename === 'ErrorResult') {
        throw new Error(data.removeAllOrderLines.message || 'Failed to clear cart');
      }

      setOrder(data.removeAllOrderLines);
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear cart');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const items = order?.lines || [];
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const total = order?.totalWithTax || 0;

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
        refreshCart: loadCart
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
