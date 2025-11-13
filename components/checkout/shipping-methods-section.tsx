import { Package } from 'lucide-react';
import { ShippingMethod } from '@/lib/checkout/types';

interface ShippingMethodsSectionProps {
  shippingMethods: ShippingMethod[];
  selectedShippingMethod: string;
  isLoadingShippingMethods: boolean;
  onShippingMethodSelect: (methodId: string) => void;
}

export function ShippingMethodsSection({
  shippingMethods,
  selectedShippingMethod,
  isLoadingShippingMethods,
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
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary mx-auto mb-2"></div>
          <p className="text-brand-dark-blue/70">Loading shipping methods...</p>
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
        <div className="text-center py-4">
          <p className="text-brand-dark-blue/70 mb-4">
            Shipping methods will be available after entering your address
          </p>
        </div>
      )}
    </div>
  );
}
