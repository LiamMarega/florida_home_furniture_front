'use client';

import { useQuery } from '@tanstack/react-query';
import { UserOrder, OrderFilter } from '../types';

interface OrdersResponse {
  orders: UserOrder[];
  pagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    limit: number;
  };
}

interface OrdersErrorResponse {
  error: string;
  message: string;
  code?: string;
  orders: [];
  pagination: {
    totalItems: number;
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

/**
 * Fetch orders from the API
 */
async function fetchOrders(
  filter: OrderFilter,
  page: number = 1,
  limit: number = 10
): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (filter && filter !== 'all') {
    params.append('status', filter);
  }
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await fetch(`/api/orders?${params.toString()}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData: OrdersErrorResponse = await response.json().catch(() => ({
      error: 'Failed to fetch orders',
      message: `HTTP ${response.status}: ${response.statusText}`,
      orders: [],
      pagination: {
        totalItems: 0,
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
      },
    }));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch orders');
  }

  const data: OrdersResponse = await response.json();
  return data;
}

/**
 * Hook to fetch user orders with React Query
 * 
 * @param filter - Filter orders by status ('current', 'unpaid', 'all')
 * @param page - Page number for pagination (default: 1)
 * @param limit - Number of orders per page (default: 10)
 * @returns Query result with orders and pagination data
 */
export function useOrders(
  filter: OrderFilter = 'all',
  page: number = 1,
  limit: number = 10
) {
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<OrdersResponse, Error>({
    queryKey: ['orders', filter, page, limit],
    queryFn: () => fetchOrders(filter, page, limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('Authentication') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return {
    orders: data?.orders || [],
    pagination: data?.pagination,
    loading: isLoading,
    isFetching,
    error: error?.message || null,
    refetch,
  };
}

