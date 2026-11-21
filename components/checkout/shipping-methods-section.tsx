import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShippingMethod } from '@/lib/checkout/types';

/** The id of the "no shipping method" message, which also explains why the continue button is disabled. */
export const NO_SHIPPING_METHOD_ID = 'shipping-methods-unavailable';

interface ShippingMethodsSectionProps {
  shippingMethods: ShippingMethod[];
  selectedShippingMethod: string;
  isLoadingShippingMethods: boolean;
  /** The list could not load: the section says so and offers a retry. */
  loadFailed: boolean;
  /** A retry is running. */
  isRetrying: boolean;
  onRetry: () => void;
  onShippingMethodSelect: (methodId: string) => void;
}

export function ShippingMethodsSection({
  shippingMethods,
  selectedShippingMethod,
  isLoadingShippingMethods,
  loadFailed,
  isRetrying,
  onRetry,
  onShippingMethodSelect,
}: ShippingMethodsSectionProps) {
  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-brand-dark-blue flex items-center gap-2">
        <Package className="w-5 h-5" />
        Shipping Method
      </h2>

      {isLoadingShippingMethods ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : loadFailed ? (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            We could not load the shipping methods. Please check your connection and try again.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRetrying} className="mt-3">
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      ) : shippingMethods.length > 0 ? (
        <div className="space-y-3">
          {shippingMethods.map((method) => (
            <div
              key={method.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedShippingMethod === method.id
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onShippingMethodSelect(method.id)}
            >
                
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={method.id}
                    checked={selectedShippingMethod === method.id}
                    onChange={() => onShippingMethodSelect(method.id)}
                    className="w-4 h-4 text-brand-primary focus:ring-brand-primary border-gray-300"
                  />
                  <div>
                    <p className="font-medium text-brand-dark-blue">
                      {method.name || 'Standard Shipping'}
                    </p>
                    {method.metadata && (
                      <p className="text-sm text-brand-dark-blue/70">
                        {method.metadata.deliveryTime || 'Estimated delivery time'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-brand-dark-blue">
                    {formatPrice(method.priceWithTax)}
                  </p>
                  {method.price !== method.priceWithTax && (
                    <p className="text-sm text-brand-dark-blue/70">(incl. tax)</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Loaded, and the order has none: payment cannot start, so the store's contact details (as on /contact)
        // are the way forward.
        <div id={NO_SHIPPING_METHOD_ID} role="status" className="p-4 border rounded-lg bg-amber-50 border-amber-200">
          <p className="text-sm font-medium text-amber-800">No shipping method is available for this address.</p>
          <p className="text-sm text-amber-800 mt-1">
            Please call us at{' '}
            <a href="tel:+13059240685" className="font-medium text-brand-dark-blue underline underline-offset-2">
              +1 (305) 924-0685
            </a>{' '}
            or{' '}
            <Link href="/contact" className="font-medium text-brand-dark-blue underline underline-offset-2">
              send us a message
            </Link>
            , and we&apos;ll help you arrange delivery.
          </p>
        </div>
      )}
    </div>
  );
}
