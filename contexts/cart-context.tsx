'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    price: number;
    sale_price: number | null;
    images: { url: string; alt: string }[];
    slug: string;
  };
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getSessionId() {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCart = useCallback(async () => {
    const sessionId = getSessionId();

    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(id, name, price, sale_price, images, slug)
      `)
      .eq('session_id', sessionId);

    if (!error && data) {
      setItems(data as CartItem[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = async (productId: string, quantity = 1) => {
    const sessionId = getSessionId();

    const existingItem = items.find(item => item.product_id === productId);

    if (existingItem) {
      await updateQuantity(productId, existingItem.quantity + quantity);
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          session_id: sessionId,
          product_id: productId,
          quantity
        });

      if (!error) {
        await loadCart();
      }
    }
  };

  const removeItem = async (productId: string) => {
    const sessionId = getSessionId();

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId)
      .eq('product_id', productId);

    if (!error) {
      await loadCart();
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(productId);
      return;
    }

    const sessionId = getSessionId();

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('product_id', productId);

    if (!error) {
      await loadCart();
    }
  };

  const clearCart = async () => {
    const sessionId = getSessionId();

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId);

    if (!error) {
      setItems([]);
    }
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  const total = items.reduce((sum, item) => {
    const price = item.product?.sale_price ?? item.product?.price ?? 0;
    return sum + (price * item.quantity);
  }, 0);

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
        isLoading
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
