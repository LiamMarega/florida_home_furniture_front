'use client';

import { Card } from '@/components/ui/card';
import { useCart } from '@/contexts/cart-context';
import { CartItem } from '@/components/cart/cart-item';
import { Separator } from '@/components/ui/separator';

export function OrderSummary() {
  const { items, itemCount, order } = useCart();

  const formatPrice = (price: number, currencyCode: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  if (!order) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Order Summary</h3>
        <p className="text-brand-dark-blue/70">Loading order details...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sticky top-4">
      <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Order Summary</h3>
      
      {/* Cart Items */}
      {items.length > 0 && (
        <>
          <div className="space-y-3 mb-4">
            {items.map((item) => (
              <CartItem key={item.id} item={item} currencyCode={order.currencyCode} />
            ))}
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