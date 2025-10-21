import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/lib/types';

// Query keys for cart operations
export const cartKeys = {
  all: ['cart'] as const,
  active: () => [...cartKeys.all, 'active'] as const,
};

// Fetch active cart/order
async function fetchActiveCart(): Promise<{ activeOrder: Order | null }> {
  const response = await fetch('/api/cart/active', {
    credentials: 'include',
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch cart');
  }
  
  return response.json();
}

// Add item to cart
async function addItemToCart({ productVariantId, quantity }: { productVariantId: string; quantity: number }): Promise<Order> {
  const response = await fetch('/api/cart/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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

  return data.addItemToOrder;
}

// Remove item from cart
async function removeItemFromCart({ orderLineId }: { orderLineId: string }): Promise<Order> {
  const response = await fetch('/api/cart/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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

  return data.removeOrderLine;
}

// Update item quantity in cart
async function updateCartItemQuantity({ orderLineId, quantity }: { orderLineId: string; quantity: number }): Promise<Order> {
  const response = await fetch('/api/cart/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
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

  return data.adjustOrderLine;
}

// Clear cart
async function clearCart(): Promise<Order> {
  const response = await fetch('/api/cart/clear', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to clear cart');
  }

  // Check if the result is an error
  if (data.removeAllOrderLines?.__typename === 'ErrorResult') {
    throw new Error(data.removeAllOrderLines.message || 'Failed to clear cart');
  }

  return data.removeAllOrderLines;
}

// Hook to get active cart
export function useActiveCart() {
  return useQuery({
    queryKey: cartKeys.active(),
    queryFn: fetchActiveCart,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to add item to cart
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addItemToCart,
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
  });
}

// Hook to remove item from cart
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeItemFromCart,
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
  });
}

// Hook to update cart item quantity
export function useUpdateCartQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCartItemQuantity,
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
  });
}

// Hook to clear cart
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      // Invalidate and refetch cart data
      queryClient.invalidateQueries({ queryKey: cartKeys.active() });
    },
  });
}
