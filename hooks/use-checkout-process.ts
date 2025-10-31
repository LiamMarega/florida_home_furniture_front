import { useState, useCallback } from 'react';
import { CustomerFormData } from '@/lib/checkout/types';

interface UseCheckoutProcessReturn {
  clientSecret: string | null;
  paymentIntentId: string | null;
  isProcessing: boolean;
  error: string | null;
  processCheckout: (data: CustomerFormData, selectedShippingMethod: string) => Promise<void>;
  resetCheckout: () => void;
  setError: (error: string | null) => void;
}

export function useCheckoutProcess(): UseCheckoutProcessReturn {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCheckout = useCallback(async (data: CustomerFormData, selectedShippingMethod: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Set customer information
      await fetch('/api/checkout/set-customer', {
        method: 'POST',
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          emailAddress: data.emailAddress,
          phoneNumber: data.shippingPhoneNumber,
        }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // Set shipping address
      await fetch('/api/checkout/set-shipping-address', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      // Set shipping method
      if (selectedShippingMethod) {
        await fetch('/api/checkout/shipping-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ shippingMethodIds: [selectedShippingMethod] }),
        });
      }

      // Create payment intent
      const piRes = await fetch('/api/checkout/payment-intent', {
        method: 'POST',
        credentials: 'include',
      });
      const pi = await piRes.json();
      
      if (!pi?.clientSecret || !pi?.paymentIntentId) {
        throw new Error('Failed to create Payment Intent');
      }
      
      setClientSecret(pi.clientSecret);
      setPaymentIntentId(pi.paymentIntentId);
    } catch (error) {
      console.error('Checkout error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during checkout');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetCheckout = useCallback(() => {
    setClientSecret(null);
    setPaymentIntentId(null);
    setError(null);
  }, []);

  return {
    clientSecret,
    paymentIntentId,
    isProcessing,
    error,
    processCheckout,
    resetCheckout,
    setError,
  };
}
