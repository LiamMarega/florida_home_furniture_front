import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CustomerFormData, ShippingMethod } from '@/lib/checkout/types';

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

// API functions
async function fetchShippingMethods(): Promise<{ eligibleShippingMethods: ShippingMethod[] }> {
  const response = await fetch('/api/checkout/shipping-methods', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load shipping methods');
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set customer');
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set shipping address');
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set shipping method');
  }

  return data;
}

async function createPaymentIntent(): Promise<PaymentIntentData> {
  const response = await fetch('/api/checkout/payment-intent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.details || data.error || 'Failed to create payment intent';
    throw new Error(errorMsg);
  }

  if (!data.clientSecret) {
    throw new Error('No client secret received');
  }

  return data;
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
  const { openAuthModal, isAuthenticated } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    async (data: CustomerFormData, selectedShippingMethod: string) => {
      setError(null);

      try {
        // Set customer information only if user is not authenticated
        if (!isAuthenticated) {
          const setCustomerData = await setCustomerMutation.mutateAsync({
            firstName: data.firstName,
            lastName: data.lastName,
            emailAddress: data.emailAddress,
            phoneNumber: data.shippingPhoneNumber,
          });

          // Check for EMAIL_ADDRESS_CONFLICT_ERROR
          if (
            setCustomerData?.setCustomerForOrder?.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR' ||
            setCustomerData?.errors?.some(
              (e: any) =>
                e.extensions?.code === 'EMAIL_ADDRESS_CONFLICT_ERROR' ||
                e.message?.includes('EMAIL_ADDRESS_CONFLICT_ERROR')
            )
          ) {
            const errorMessage =
              setCustomerData?.setCustomerForOrder?.message ||
              setCustomerData?.errors?.[0]?.message ||
              'This email address is already registered. Please login to continue.';
            setError(errorMessage);
            openAuthModal('login');
            return;
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during checkout';
        setError(errorMessage);
        throw err;
      }
    },
    [setCustomerMutation, setShippingAddressMutation, setShippingMethodMutation, createPaymentIntentMutation, openAuthModal, isAuthenticated]
  );

  const resetCheckout = useCallback(() => {
    setClientSecret(null);
    setOrderCode(null);
    setError(null);
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
    processCheckout,
    resetCheckout,
    setError,
  };
}
