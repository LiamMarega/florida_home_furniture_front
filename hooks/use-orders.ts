import { useQuery } from '@tanstack/react-query';

// Query keys for order operations
export const orderKeys = {
  all: ['orders'] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (orderCode: string) => [...orderKeys.details(), orderCode] as const,
};

// Types
interface Order {
  code: string;
  state: string;
  customer: {
    emailAddress: string;
  };
  payments: Array<{
    state: string;
  }>;
  // Add other order properties as needed
}

interface OrderResponse {
  order: Order;
}

// Fetch order by code
async function fetchOrderByCode(orderCode: string): Promise<Order> {
  const response = await fetch(`/api/orders/${orderCode}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json();
    
    // Handle the case where order is completed but not accessible (403)
    if (response.status === 403 && data.requiresAuth) {
      // For completed orders, we might want to return a minimal order object
      // This depends on your business logic
      throw new Error('Order requires authentication to view');
    }
    
    throw new Error(data.error || 'Failed to load order');
  }

  const data: OrderResponse = await response.json();
  return data.order;
}

// Hook to get order by code
export function useOrderByCode(orderCode: string, options?: {
  enabled?: boolean;
  retry?: boolean;
}) {
  return useQuery({
    queryKey: orderKeys.detail(orderCode),
    queryFn: () => fetchOrderByCode(orderCode),
    enabled: options?.enabled !== false && !!orderCode,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: options?.retry !== false ? 2 : false,
  });
}
