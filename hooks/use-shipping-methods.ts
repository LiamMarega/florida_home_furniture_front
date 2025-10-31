import { useState, useCallback } from 'react';
import { ShippingMethod } from '@/lib/checkout/types';

interface UseShippingMethodsReturn {
  shippingMethods: ShippingMethod[];
  selectedShippingMethod: string;
  isLoadingShippingMethods: boolean;
  setSelectedShippingMethod: (methodId: string) => void;
  fetchShippingMethods: () => Promise<void>;
}

export function useShippingMethods(): UseShippingMethodsReturn {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');
  const [isLoadingShippingMethods, setIsLoadingShippingMethods] = useState(false);

  const fetchShippingMethods = useCallback(async () => {
    setIsLoadingShippingMethods(true);
    try {
      const response = await fetch('/api/checkout/shipping-methods', {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.eligibleShippingMethods?.length) {
        setShippingMethods(data.eligibleShippingMethods);
        const first = data.eligibleShippingMethods[0];
        setSelectedShippingMethod(first.id);
      }
    } catch (error) {
      console.error('Error fetching shipping methods:', error);
    } finally {
      setIsLoadingShippingMethods(false);
    }
  }, []);

  return {
    shippingMethods,
    selectedShippingMethod,
    isLoadingShippingMethods,
    setSelectedShippingMethod,
    fetchShippingMethods,
  };
}
