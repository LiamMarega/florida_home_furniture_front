import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys for checkout operations
export const checkoutKeys = {
  all: ['checkout'] as const,
  shippingMethods: () => [...checkoutKeys.all, 'shipping-methods'] as const,
  paymentIntent: (orderCode: string) => [...checkoutKeys.all, 'payment-intent', orderCode] as const,
};

// Types
interface ShippingMethod {
  id: string;
  code: string;
  name: string;
  description: string;
  priceWithTax: number;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  forceGuest?: boolean;
}

interface AddressData {
  fullName: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

interface PaymentIntentData {
  clientSecret: string;
}

// Fetch shipping methods
async function fetchShippingMethods(): Promise<{ shippingMethods: ShippingMethod[] }> {
  const response = await fetch('/api/checkout/shipping-methods', {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load shipping methods');
  }

  return response.json();
}

// Set customer information
async function setCustomer(customerData: CustomerData): Promise<any> {
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

// Set shipping address
async function setShippingAddress(addressData: AddressData): Promise<any> {
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

// Set billing address
async function setBillingAddress(addressData: AddressData): Promise<any> {
  const response = await fetch('/api/checkout/set-billing-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(addressData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set billing address');
  }

  return data;
}

// Set shipping method
async function setShippingMethod({ shippingMethodId }: { shippingMethodId: string }): Promise<any> {
  const response = await fetch('/api/checkout/set-shipping-method', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      shippingMethodId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set shipping method');
  }

  return data;
}

// Create payment intent
async function createPaymentIntent({ 
  orderCode, 
  emailAddress, 
  timestamp, 
  forceNew 
}: { 
  orderCode: string; 
  emailAddress?: string; 
  timestamp?: number; 
  forceNew?: boolean; 
}): Promise<PaymentIntentData> {
  const response = await fetch('/api/checkout/payment-intent', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ 
      orderCode,
      timestamp: timestamp || Date.now(),
      forceNew: forceNew || true,
      emailAddress,
    }),
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
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

// Hook to get shipping methods
export function useShippingMethods() {
  return useQuery({
    queryKey: checkoutKeys.shippingMethods(),
    queryFn: fetchShippingMethods,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to set customer
export function useSetCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setCustomer,
    onSuccess: () => {
      // Invalidate cart data to refresh order totals
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// Hook to set shipping address
export function useSetShippingAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setShippingAddress,
    onSuccess: () => {
      // Invalidate cart data to refresh order totals
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// Hook to set billing address
export function useSetBillingAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setBillingAddress,
    onSuccess: () => {
      // Invalidate cart data to refresh order totals
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// Hook to set shipping method
export function useSetShippingMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setShippingMethod,
    onSuccess: () => {
      // Invalidate cart data to refresh order totals
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// Hook to create payment intent
export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: createPaymentIntent,
  });
}
