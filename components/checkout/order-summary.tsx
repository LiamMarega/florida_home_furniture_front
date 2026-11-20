'use client';

import { useId } from 'react';
import { Card } from '@/components/ui/card';
import { useCart } from '@/contexts/cart-context';
import { CartItem } from '@/components/cart/cart-item';
import { Separator } from '@/components/ui/separator';
import { usePaymentLock } from '@/hooks/use-payment-lock';

export function OrderSummary() {
  const { items, itemCount, order } = useCart();
  // A card or Affirm payment of this order is in flight (in this tab or another): a quantity change or removal
  // would change the order being paid, so the item controls are paused until the payment ends.
  const paymentInFlight = usePaymentLock(order?.code) !== 'free';
  const hintId = useId();

  const formatPrice = (price: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  if (!order) {
    return (
      <Card className="p-6 sticky top-24">
        <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Order Summary</h3>
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-16" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
            <div className="flex justify-between pt-2">
              <div className="h-5 bg-gray-200 rounded w-14" />
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sticky top-24">
      <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Order Summary</h3>
      
      {/* Cart Items: a disabled fieldset disables every quantity and remove button inside it */}
      {items.length > 0 && (
        <>
          <fieldset
            disabled={paymentInFlight}
            aria-label="Items in your order"
            aria-describedby={paymentInFlight ? hintId : undefined}
            className="min-w-0 space-y-3 mb-4"
          >
            {items.map((item) => (
              <CartItem key={item.id} item={item} currencyCode={order.currencyCode} />
            ))}
          </fieldset>
          {/* Always mounted, so the hint is announced when it appears */}
          <div role="status" aria-live="polite">
            {paymentInFlight && (
              <p id={hintId} className="text-xs text-brand-dark-blue/70 mb-4">
                Cart changes are paused while your payment is being processed.
              </p>
            )}
          </div>
          <Separator className="my-4" />
        </>
      )}
      
      {/* Order Totals */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-brand-dark-blue/70">Subtotal ({itemCount} items)</span>
          <span className="font-medium">
            {formatPrice(order.total, order.currencyCode)}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-brand-dark-blue/70">Taxes</span>
          <span className="font-medium">
            {formatPrice(order.totalWithTax - order.total, order.currencyCode)}
          </span>
        </div>
        
        <Separator />
        
        <div className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="text-brand-primary">
            {formatPrice(order.totalWithTax, order.currencyCode)}
          </span>
        </div>
      </div>

      {/* Shipping Info */}
      {order.shippingLines && order.shippingLines.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <h4 className="font-medium text-brand-dark-blue">Shipping</h4>
            {order.shippingLines.map((shippingLine, idx) => (
              <div key={idx} className="text-sm text-brand-dark-blue/70">
                <div className="font-medium">{shippingLine.shippingMethod.name}</div>
                {shippingLine.shippingMethod.description && (
                  <div className="text-xs">{shippingLine.shippingMethod.description}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}