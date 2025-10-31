'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Eye, ShoppingCart, Truck } from 'lucide-react';
import { UserOrder } from '../types';
import Image from 'next/image';

interface OrderCardProps {
  order: UserOrder;
  onViewDetails?: (orderId: string) => void;
  onTrackOrder?: (orderId: string) => void;
  onBuyAgain?: (order: UserOrder) => void;
}

const statusBadgeMap: Record<UserOrder['status'], string> = {
  'on-the-way': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  shipped: 'bg-green-100 text-green-800 border-green-200',
  delivered: 'bg-blue-100 text-blue-800 border-blue-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabelMap: Record<UserOrder['status'], string> = {
  'on-the-way': 'On the way',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  pending: 'Pending',
};

export function OrderCard({
  order,
  onViewDetails,
  onTrackOrder,
  onBuyAgain,
}: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-brand-dark-blue font-tango-sans">
              Order #{order.orderNumber}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {order.productCount} Products | {formatTime(order.timestamp)}, {formatDate(order.timestamp)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Status:</span>{' '}
            <Badge
              className={`${statusBadgeMap[order.status]} border`}
              variant="outline"
            >
              {statusLabelMap[order.status]}
            </Badge>
          </div>
          {order.deliveryDate && (
            <div>
              <span className="text-muted-foreground">Date of delivery:</span>{' '}
              <span className="font-medium">{formatDate(order.deliveryDate)}</span>
            </div>
          )}
          <div className="w-full">
            <span className="text-muted-foreground">Delivered to:</span>{' '}
            <span className="font-medium">{order.deliveryAddress}</span>
          </div>
          <div className="w-full">
            <span className="text-muted-foreground">Total:</span>{' '}
            <span className="text-lg font-bold text-brand-dark-blue">
              {order.currency} {order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {order.products.length > 0 && (
          <div className="border-t pt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-sm font-medium text-brand-dark-blue hover:text-brand-primary transition-colors"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Hide' : 'Show'} products in order`}
            >
              <span>Products ({order.products.length})</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {order.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex gap-3 p-3 border rounded-lg bg-brand-cream/30"
                  >
                    {product.featuredAsset?.preview && (
                      <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                        <Image
                          src={product.featuredAsset.preview}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-dark-blue truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Quantity: {product.quantity}x = {order.currency}{' '}
                        {product.totalPrice.toFixed(2)}
                      </p>
                      {product.color && (
                        <p className="text-xs text-muted-foreground">
                          Color: {product.color}
                        </p>
                      )}
                      {product.size && (
                        <p className="text-xs text-muted-foreground">
                          Size: {product.size}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {onViewDetails && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(order.id)}
              className="flex-1 sm:flex-none"
            >
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
          )}
          {onTrackOrder && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTrackOrder(order.id)}
              className="flex-1 sm:flex-none"
            >
              <Truck className="h-4 w-4 mr-1" />
              Track Order
            </Button>
          )}
          {onBuyAgain && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onBuyAgain(order)}
              className="flex-1 sm:flex-none"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Buy Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

