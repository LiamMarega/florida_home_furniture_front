'use client';

import { Order } from '@/lib/types';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface OrderSummaryProps {
  order: Order;
  showItems?: boolean;
}

export function OrderSummary({ order, showItems = true }: OrderSummaryProps) {
  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  const subtotal = order.subTotalWithTax || 0;
  const shipping = order.shippingWithTax || 0;
  const total = order.totalWithTax || 0;

  return (
    <div className="bg-brand-cream/30 rounded-2xl p-6 space-y-6">
      <h2 className="text-2xl font-bold text-brand-dark-blue font-tango-sans">
        Order Summary
      </h2>

      {showItems && order.lines && order.lines.length > 0 && (
        <>
          <div className="space-y-4">
            {order.lines.map((line) => (
              <div key={line.id} className="flex gap-4">
                <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden flex-shrink-0">
                  {line.productVariant?.product?.featuredAsset?.preview ? (
                    <Image
                      src={line.productVariant.product.featuredAsset.preview}
                      alt={line.productVariant.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image
                        src="/images/logos/ISO.png"
                        alt={line.productVariant?.name || 'Product'}
                        width={40}
                        height={40}
                        className="opacity-50"
                      />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-brand-dark-blue text-sm line-clamp-2">
                    {line.productVariant?.product?.name || line.productVariant?.name}
                  </h3>
                  <p className="text-sm text-brand-dark-blue/70">
                    Qty: {line.quantity}
                  </p>
                  <p className="text-sm font-medium text-brand-dark-blue">
                    {formatPrice(line.linePriceWithTax, order.currencyCode)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Separator />
        </>
      )}

      <div className="space-y-3">
        <div className="flex justify-between text-brand-dark-blue/80">
          <span>Subtotal</span>
          <span className="font-medium">
            {formatPrice(subtotal, order.currencyCode)}
          </span>
        </div>
        
        {shipping > 0 && (
          <div className="flex justify-between text-brand-dark-blue/80">
            <span>Shipping</span>
            <span className="font-medium">
              {formatPrice(shipping, order.currencyCode)}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-brand-dark-blue text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(total, order.currencyCode)}</span>
        </div>
      </div>

      {order.shippingLines && order.shippingLines.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold text-brand-dark-blue">Shipping Method</h3>
            {order.shippingLines.map((shippingLine, idx) => (
              <div key={idx} className="text-sm text-brand-dark-blue/80">
                <div className="font-medium">{shippingLine.shippingMethod.name}</div>
                {shippingLine.shippingMethod.description && (
                  <div className="text-xs">{shippingLine.shippingMethod.description}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {order.shippingAddress && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold text-brand-dark-blue">Shipping Address</h3>
            <div className="text-sm text-brand-dark-blue/80">
              <div>{order.shippingAddress.fullName}</div>
              <div>{order.shippingAddress.streetLine1}</div>
              {order.shippingAddress.streetLine2 && (
                <div>{order.shippingAddress.streetLine2}</div>
              )}
              <div>
                {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                {order.shippingAddress.postalCode}
              </div>
              <div>{order.shippingAddress.country}</div>
              {order.shippingAddress.phoneNumber && (
                <div className="mt-1">📞 {order.shippingAddress.phoneNumber}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

