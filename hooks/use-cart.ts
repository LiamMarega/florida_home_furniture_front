import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  active: () => [...cartKeys.all, 'active'] as const,
};

// Types
interface AddToCartParams {
  productVariantId: string;
  quantity: number;
}

interface RemoveFromCartParams {
  orderLineId: string;
}

interface UpdateQuantityParams {
  orderLineId: string;
  quantity: number;
}

// API functions
async function fetchActiveCart() {
  const response = await fetch('/api/cart', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch cart');
  }

  return response.json();
}

async function addToCart({ productVariantId, quantity }: AddToCartParams) {
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productVariantId, quantity }),
  });

  const data = await response.json();

  if (!response.ok) {
    // 🔑 Propagar información del error incluyendo requiresClearCart
    const error: any = new Error(data.error || 'Failed to add item to cart');
    error.requiresClearCart = data.requiresClearCart;
    error.errorCode = data.errorCode;
    throw error;
  }

  return data;
}

async function removeFromCart({ orderLineId }: RemoveFromCartParams) {
  const response = await fetch('/api/cart/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderLineId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to remove item from cart');
  }

  return data;
}

async function updateCartQuantity({ orderLineId, quantity }: UpdateQuantityParams) {
  const response = await fetch('/api/cart/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ orderLineId, quantity }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update quantity');
  }

  return data;
}

async function clearCart() {
  const response = await fetch('/api/cart/clear', {
    method: 'POST',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to clear cart');
  }

  return data;
}

// Hooks
export function useActiveCart() {
  return useQuery({
    queryKey: cartKeys.active(),
    queryFn: fetchActiveCart,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToCart,
    onSuccess: () => {
      // Invalidar cache para refetch automático
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
    // 🔑 NO hacer onError aquí para que el error se propague al cart-context
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
  });
}

export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCartQuantity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      // Limpiar el cache completamente después de clear
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}