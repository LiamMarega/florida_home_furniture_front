'use client';

import React, { useState } from 'react';
import { OrderCard } from './OrderCard';
import { OrderFilterTabs } from './OrderFilterTabs';
import { EmptyStateComponent } from './EmptyStateComponent';
import { useOrders } from '../hooks/use-orders';
import { OrderFilter, UserOrder } from '../types';
import { Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function OrdersPanel() {
  const [filter, setFilter] = useState<OrderFilter>('current');
  const { orders, loading, error } = useOrders(filter);

  const handleViewDetails = (orderId: string) => {
    // Navigate to order details page
    window.location.href = `/orders/${orderId}`;
  };

  const handleTrackOrder = (orderId: string) => {
    // Open tracking modal or navigate to tracking page
    alert(`Tracking for order ${orderId} - Coming soon!`);
  };

  const handleBuyAgain = async (order: UserOrder) => {
    // Add all products from order to cart
    try {
      // This would typically call an API to add items to cart
      alert(`Adding ${order.products.length} items to cart - Coming soon!`);
    } catch (error) {
      alert('Failed to add items to cart. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-brand-dark-blue font-tango-sans mb-6">
          My Orders
        </h2>
        <OrderFilterTabs activeFilter={filter} onFilterChange={setFilter} />
      </div>

      {orders.length === 0 ? (
        <EmptyStateComponent
          icon={Package}
          title="No orders yet"
          description={
            filter === 'current'
              ? "You don't have any current orders. Start shopping to see your orders here!"
              : filter === 'unpaid'
              ? "You don't have any unpaid orders."
              : "You haven't placed any orders yet. Start shopping to see your order history here!"
          }
          actionLabel="Start Shopping"
          onAction={() => {
            window.location.href = '/products';
          }}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onViewDetails={handleViewDetails}
              onTrackOrder={handleTrackOrder}
              onBuyAgain={handleBuyAgain}
            />
          ))}
        </div>
      )}
    </div>
  );
}

