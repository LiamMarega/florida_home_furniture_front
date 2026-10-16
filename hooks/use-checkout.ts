import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CustomerFormData, ShippingMethod } from '@/lib/checkout/types';
import type { CartLine } from '@/lib/checkout/sign-in-flow';

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  shippingMethods: () => [...checkoutKeys.all, 'shipping-methods'] as const,
};

// Types
interface PaymentIntentData {
  clientSecret: string;
  orderCode: string;
  amount?: number;
  currency?: string;
}

/**
 * Error from a checkout API route that keeps the route's `code` and HTTP `status`
 * (the global React Query retry policy skips 4xx based on `status`).
 */
export class CheckoutApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'CheckoutApiError';
    this.code = code;
    this.status = status;
  }
}

const PAYMENT_START_ERROR = "We couldn't start the payment. Try again.";

export type CheckoutResult =
  | { ok: true }
  | { ok: false; reason: 'email-conflict' | 'error' };

const EMAIL_CONFLICT_CODE = 'EMAIL_ADDRESS_CONFLICT_ERROR';

// API functions
async function fetchShippingMethods(): Promise<{ eligibleShippingMethods: ShippingMethod[] }> {
  const response = await fetch('/api/checkout/shipping-methods', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new CheckoutApiError(data.error || 'Failed to load shipping methods', data.code, response.status);
  }

  return response.json();
}

async function setCustomer(customerData: {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
}): Promise<any> {
  const response = await fetch('/api/checkout/set-customer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CheckoutApiError(data.message || data.error || 'Failed to set customer', data.code, response.status);
  }

  return data;
}

async function setShippingAddress(addressData: CustomerFormData): Promise<any> {
  const response = await fetch('/api/checkout/set-shipping-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(addressData),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CheckoutApiError(data.error || 'Failed to set shipping address', data.code, response.status);
  }

  return data;
}

async function setShippingMethod(shippingMethodId: string): Promise<any> {
  const response = await fetch('/api/checkout/shipping-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shippingMethodIds: [shippingMethodId] }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new CheckoutApiError(data.error || 'Failed to set shipping method', data.code, response.status);
  }

  return data;
}

async function createPaymentIntent(): Promise<PaymentIntentData> {
  const response = await fetch('/api/checkout/payment-intent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // `details` can be an array of GraphQL errors; only show a readable string.
    const message = typeof data.message === 'string' && data.message.trim() ? data.message : PAYMENT_START_ERROR;
    throw new CheckoutApiError(message, data.code, response.status);
  }

  if (!data.clientSecret) {
    throw new CheckoutApiError(PAYMENT_START_ERROR);
  }

  return data;
}

/**
 * Adds cart lines back one at a time (each add may move the order back to
 * AddingItems). Failures are ignored: callers refetch the cart and compare.
 */
export async function addCartLines(lines: CartLine[]): Promise<void> {
  for (const line of lines) {
    try {
      await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productVariantId: line.variantId, quantity: line.quantity }),
      });
    } catch {
      // Network failure for this line: the refetched cart will show it as missing.
    }
  }
}

// Hooks
export function useShippingMethods() {
  return useQuery({
    queryKey: checkoutKeys.shippingMethods(),
    queryFn: fetchShippingMethods,
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      shippingMethods: data.eligibleShippingMethods || [],
      selectedShippingMethod: data.eligibleShippingMethods?.[0]?.id || '',
    }),
  });
}

export function useCheckoutProcess() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Email that already has an account; the page offers sign-in instead of an error.
  const [emailConflict, setEmailConflict] = useState<string | null>(null);

  const setCustomerMutation = useMutation({
    mutationFn: setCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const setShippingAddressMutation = useMutation({
    mutationFn: setShippingAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const setShippingMethodMutation = useMutation({
    mutationFn: setShippingMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: createPaymentIntent,
  });

  const processCheckout = useCallback(
    async (data: CustomerFormData, selectedShippingMethod: string): Promise<CheckoutResult> => {
      setError(null);
      setEmailConflict(null);

      try {
        // Set customer information only if user is not authenticated
        if (!isAuthenticated) {
          try {
            await setCustomerMutation.mutateAsync({
              firstName: data.firstName,
              lastName: data.lastName,
              emailAddress: data.emailAddress,
              phoneNumber: data.shippingPhoneNumber,
            });
          } catch (err) {
            if (err instanceof CheckoutApiError && err.code === EMAIL_CONFLICT_CODE) {
              setEmailConflict(data.emailAddress.trim());
              return { ok: false, reason: 'email-conflict' };
            }
            throw err;
          }
        }

        // Set shipping address (includes billing if needed)
        await setShippingAddressMutation.mutateAsync(data);

        // Set shipping method
        if (selectedShippingMethod) {
          await setShippingMethodMutation.mutateAsync(selectedShippingMethod);
        }

        // Create payment intent
        const paymentIntent = await createPaymentIntentMutation.mutateAsync();
        setClientSecret(paymentIntent.clientSecret);
        setOrderCode(paymentIntent.orderCode);
        return { ok: true };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during checkout';
        setError(errorMessage);
        return { ok: false, reason: 'error' };
      }
    },
    [setCustomerMutation, setShippingAddressMutation, setShippingMethodMutation, createPaymentIntentMutation, isAuthenticated]
  );

  const resetCheckout = useCallback(() => {
    setClientSecret(null);
    setOrderCode(null);
    setError(null);
  }, []);

  const clearEmailConflict = useCallback(() => {
    setEmailConflict(null);
  }, []);

  return {
    clientSecret,
    orderCode,
    isProcessing:
      setCustomerMutation.isPending ||
      setShippingAddressMutation.isPending ||
      setShippingMethodMutation.isPending ||
      createPaymentIntentMutation.isPending,
    error,
    emailConflict,
    clearEmailConflict,
    processCheckout,
    resetCheckout,
    setError,
  };
}
