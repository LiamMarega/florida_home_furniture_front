'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserAddress } from '../types';

interface AddressesResponse {
  addresses: UserAddress[];
}

interface AddressResponse {
  address: UserAddress;
}

/**
 * Fetch addresses from the API
 */
async function fetchAddresses(): Promise<AddressesResponse> {
  const response = await fetch('/api/user/addresses', {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Failed to fetch addresses',
      message: `HTTP ${response.status}: ${response.statusText}`,
    }));
    throw new Error(errorData.message || errorData.error || 'Failed to fetch addresses');
  }

  return response.json();
}

/**
 * Create a new address
 */
async function createAddress(address: Omit<UserAddress, 'id'>): Promise<AddressResponse> {
  const response = await fetch('/api/user/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(address),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Failed to create address',
    }));
    throw new Error(errorData.error || 'Failed to create address');
  }

  return response.json();
}

/**
 * Update an existing address
 */
async function updateAddress(
  id: string,
  address: Partial<UserAddress>
): Promise<AddressResponse> {
  const response = await fetch(`/api/user/addresses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(address),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Failed to update address',
    }));
    throw new Error(errorData.error || 'Failed to update address');
  }

  return response.json();
}

/**
 * Delete an address
 */
async function deleteAddress(id: string): Promise<void> {
  const response = await fetch(`/api/user/addresses/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Failed to delete address',
    }));
    throw new Error(errorData.error || 'Failed to delete address');
  }
}

/**
 * Set an address as default
 */
async function setDefaultAddress(id: string): Promise<AddressResponse> {
  const response = await fetch(`/api/user/addresses/${id}/default`, {
    method: 'PATCH',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'Failed to set default address',
    }));
    throw new Error(errorData.error || 'Failed to set default address');
  }

  return response.json();
}

/**
 * Hook to manage user addresses with React Query
 */
export function useAddresses() {
  const queryClient = useQueryClient();

  // Query to fetch addresses
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AddressesResponse, Error>({
    queryKey: ['addresses'],
    queryFn: fetchAddresses,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      if (error?.message?.includes('Authentication') || error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      // Invalidate and refetch addresses
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, address }: { id: string; address: Partial<UserAddress> }) =>
      updateAddress(id, address),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  return {
    addresses: data?.addresses || [],
    loading: isLoading,
    error: error?.message || null,
    fetchAddresses: refetch,
    createAddress: createMutation.mutateAsync,
    updateAddress: (id: string, address: Partial<UserAddress>) =>
      updateMutation.mutateAsync({ id, address }),
    deleteAddress: deleteMutation.mutateAsync,
    setDefaultAddress: setDefaultMutation.mutateAsync,
    // Expose mutation states for UI feedback
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending,
  };
}

