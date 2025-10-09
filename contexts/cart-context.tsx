'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { vendureClient } from '@/lib/vendure-client';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';
import { ADD_ITEM_TO_ORDER, ADJUST_ORDER_LINE, REMOVE_ORDER_LINE, REMOVE_ALL_ORDER_LINES } from '@/lib/graphql/mutations';
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
  order: Order | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCart = useCallback(async () => {
    try {
      const data = await vendureClient.request<{ activeOrder: Order | null }>(GET_ACTIVE_ORDER);
      setOrder(data.activeOrder);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = async (productVariantId: string, quantity = 1) => {
    try {
      const data = await vendureClient.request<{ addItemToOrder: Order }>(ADD_ITEM_TO_ORDER, {
        productVariantId,
        quantity,
      });

      if (data.addItemToOrder) {
        setOrder(data.addItemToOrder);
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  };

  const removeItem = async (orderLineId: string) => {
    try {
      const data = await vendureClient.request<{ removeOrderLine: Order }>(REMOVE_ORDER_LINE, {
        orderLineId,
      });

      if (data.removeOrderLine) {
        setOrder(data.removeOrderLine);
      }
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
      const data = await vendureClient.request<{ adjustOrderLine: Order }>(ADJUST_ORDER_LINE, {
        orderLineId,
        quantity,
      });

      if (data.adjustOrderLine) {
        setOrder(data.adjustOrderLine);
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    try {
      const data = await vendureClient.request<{ removeAllOrderLines: Order }>(REMOVE_ALL_ORDER_LINES);

      if (data.removeAllOrderLines) {
        setOrder(data.removeAllOrderLines);
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
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
        order
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
