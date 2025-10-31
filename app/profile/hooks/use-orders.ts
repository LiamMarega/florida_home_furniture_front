'use client';

import { useState, useEffect } from 'react';
import { UserOrder, OrderFilter } from '../types';

export function useOrders(filter: OrderFilter = 'all') {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async (statusFilter?: OrderFilter) => {
    setLoading(true);
    setError(null);
    try {
      const url =
        statusFilter && statusFilter !== 'all'
          ? `/api/user/orders?status=${statusFilter}`
          : '/api/user/orders';

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filter);
  }, [filter]);

  return {
    orders,
    loading,
    error,
    refetch: () => fetchOrders(filter),
  };
}

