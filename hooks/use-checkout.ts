import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CustomerFormData, EligiblePaymentMethod, ShippingMethod } from '@/lib/checkout/types';
import {
  apiErrorCode,
  EMAIL_IN_USE_MESSAGE,
  friendlyCheckoutMessage,
  readableApiError,
} from '@/lib/checkout/utils';

// A checkout step failed without the route's answer: the request never reached the store.
const CHECKOUT_FAILED_MESSAGE = 'We could not reach the store. Please check your connection and try again.';

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  shippingMethods: () => [...checkoutKeys.all, 'shipping-methods'] as const,
};

// Types
interface PaymentIntentData {
  // Null when the Stripe PaymentIntent is unavailable but Affirm can still be used
  clientSecret: string | null;
  orderCode: string;
  paymentMethods: EligiblePaymentMethod[];
  amount?: number;
  currency?: string;
}

/** The JSON body of a response, or null when it has none (an error page, a cut-off body). */
async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

type ApiError = Error & { status: number; code?: string };

/**
 * An Error with the route's readable message, its HTTP status (so the global React Query retry skips 4xx
 * answers: a rejected change is not retried) and its error code, if any.
 */
function apiError(response: Response, data: unknown, fallback: string): ApiError {
  const error = new Error(readableApiError(data, fallback)) as ApiError;
  error.status = response.status;
  error.code = apiErrorCode(data);
  return error;
}

// API functions
async function fetchShippingMethods(): Promise<{ eligibleShippingMethods: ShippingMethod[] }> {
  const response = await fetch('/api/checkout/shipping-methods', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw apiError(response, await readJson(response), 'We could not load the shipping methods.');
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

  const data = await readJson(response);

  if (!response.ok) {
    throw apiError(response, data, 'We could not save your contact details. Please try again.');
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

  const data = await readJson(response);

  if (!response.ok) {
    throw apiError(response, data, 'We could not save your shipping address. Please try again.');
  }

  return data;
}

/**
 * Saves the shipping method on the order. Throws (with the route's readable message) unless the order really
 * has it, so checkout never moves on with a shipping price that would not be charged.
 */
async function setShippingMethod(shippingMethodId: string): Promise<any> {
  const response = await fetch('/api/checkout/shipping-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shippingMethodIds: [shippingMethodId] }),
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw apiError(response, data, 'We could not save the shipping method. Please try again.');
  }

  return data;
}

async function createPaymentIntent(): Promise<PaymentIntentData> {
  const response = await fetch('/api/checkout/payment-intent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await readJson(response);

  if (!response.ok || !data || typeof data !== 'object') {
    throw apiError(response, data, 'We could not start the payment. Please try again.');
  }

  // The route answers 200 only with a card client secret, or without one when Affirm is eligible; the
  // payment step shows what the order can use.
  const result = data as Partial<PaymentIntentData>;
  if (typeof result.orderCode !== 'string' || !result.orderCode) {
    throw new Error('We could not start the payment. Please try again.');
  }
  const paymentMethods: EligiblePaymentMethod[] = Array.isArray(result.paymentMethods) ? result.paymentMethods : [];

  return {
    ...result,
    orderCode: result.orderCode,
    clientSecret: typeof result.clientSecret === 'string' && result.clientSecret ? result.clientSecret : null,
    paymentMethods,
  };
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
  const [paymentMethods, setPaymentMethods] = useState<EligiblePaymentMethod[]>([]);
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
    // Also on failure: the order may have moved back to AddingItems before the change was refused, and
    // the summary must show what the order really charges.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: createPaymentIntent,
    // The order is now in ArrangingPayment.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  /**
   * Prepares the order for payment: contact details, shipping address and method, then the payment intent. True
   * once the payment step can open; false when a step failed, with the reason in `error`. Never throws: it runs
   * in the form's submit handler, where a rejection would be an unhandled promise rejection.
   */
  const processCheckout = useCallback(
    async (data: CustomerFormData, selectedShippingMethod: string): Promise<boolean> => {
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
            setError(EMAIL_IN_USE_MESSAGE);
            openAuthModal('login');
            return false;
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
        setPaymentMethods(paymentIntent.paymentMethods);
        setOrderCode(paymentIntent.orderCode);
        return true;
      } catch (err) {
        // The routes' messages are already readable; a network failure ("Failed to fetch") is not.
        setError(friendlyCheckoutMessage(err instanceof Error ? err.message : undefined, CHECKOUT_FAILED_MESSAGE));
        // The email belongs to an account (Vendure's EMAIL_ADDRESS_CONFLICT_ERROR): the shopper signs in instead.
        if ((err as Partial<ApiError> | null)?.code === 'EMAIL_ADDRESS_CONFLICT_ERROR') {
          openAuthModal('login');
        }
        return false;
      }
    },
    [setCustomerMutation, setShippingAddressMutation, setShippingMethodMutation, createPaymentIntentMutation, openAuthModal, isAuthenticated]
  );

  const resetCheckout = useCallback(() => {
    setClientSecret(null);
    setOrderCode(null);
    setPaymentMethods([]);
    setError(null);
  }, []);

  return {
    clientSecret,
    orderCode,
    paymentMethods,
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
