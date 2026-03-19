'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAddresses } from '@/app/profile/hooks/use-addresses';
import { UserAddress } from '@/app/profile/types';
import { CustomerFormData } from '@/lib/checkout/types';

const GUEST_ADDRESSES_KEY = 'fhf_guest_addresses';
const MAX_SAVED_ADDRESSES = 4;

// Map a UserAddress to checkout form fields
export function addressToFormData(addr: UserAddress): Partial<CustomerFormData> {
  return {
    shippingFullName: addr.fullName || '',
    shippingStreetLine1: addr.street,
    shippingStreetLine2: addr.streetLine2 || '',
    shippingCity: addr.city,
    shippingProvince: addr.state,
    shippingPostalCode: addr.zipCode,
    shippingCountry: addr.country || 'US',
    shippingPhoneNumber: addr.phoneNumber || '',
  };
}

// Map checkout form fields to a UserAddress (for saving)
export function formDataToAddress(data: CustomerFormData): Omit<UserAddress, 'id'> {
  return {
    fullName: data.shippingFullName,
    street: data.shippingStreetLine1,
    streetLine2: data.shippingStreetLine2 || '',
    city: data.shippingCity,
    state: data.shippingProvince,
    zipCode: data.shippingPostalCode,
    country: data.shippingCountry || 'US',
    phoneNumber: data.shippingPhoneNumber,
    isDefault: false,
  };
}

// Guest localStorage address management
function getGuestAddresses(): UserAddress[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(GUEST_ADDRESSES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGuestAddresses(addresses: UserAddress[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_ADDRESSES_KEY, JSON.stringify(addresses));
}

function generateId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useSavedAddresses() {
  const { isAuthenticated } = useAuth();

  // Authenticated user hooks (always called, conditionally used)
  const authAddresses = useAddresses();

  // Guest state
  const [guestAddresses, setGuestAddresses] = useState<UserAddress[]>([]);
  const [guestLoading, setGuestLoading] = useState(true);

  // Load guest addresses on mount
  useEffect(() => {
    if (!isAuthenticated) {
      setGuestAddresses(getGuestAddresses());
    }
    setGuestLoading(false);
  }, [isAuthenticated]);

  // Guest CRUD operations
  const createGuestAddress = useCallback(async (address: Omit<UserAddress, 'id'>) => {
    const current = getGuestAddresses();
    if (current.length >= MAX_SAVED_ADDRESSES) {
      throw new Error(`You can save up to ${MAX_SAVED_ADDRESSES} addresses. Please delete one to add a new one.`);
    }
    const newAddress: UserAddress = { ...address, id: generateId() };
    const updated = [...current, newAddress];
    // If first address or marked as default, ensure it's the only default
    if (newAddress.isDefault || updated.length === 1) {
      updated.forEach(a => { a.isDefault = a.id === newAddress.id; });
    }
    saveGuestAddresses(updated);
    setGuestAddresses(updated);
    return newAddress;
  }, []);

  const updateGuestAddress = useCallback(async (id: string, data: Partial<UserAddress>) => {
    const addresses = getGuestAddresses();
    const idx = addresses.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Address not found');
    addresses[idx] = { ...addresses[idx], ...data };
    if (data.isDefault) {
      addresses.forEach(a => { a.isDefault = a.id === id; });
    }
    saveGuestAddresses(addresses);
    setGuestAddresses(addresses);
    return addresses[idx];
  }, []);

  const deleteGuestAddress = useCallback(async (id: string) => {
    const addresses = getGuestAddresses().filter(a => a.id !== id);
    saveGuestAddresses(addresses);
    setGuestAddresses(addresses);
  }, []);

  const setGuestDefault = useCallback(async (id: string) => {
    const addresses = getGuestAddresses();
    addresses.forEach(a => { a.isDefault = a.id === id; });
    saveGuestAddresses(addresses);
    setGuestAddresses(addresses);
  }, []);

  // Unified interface
  if (isAuthenticated) {
    const canAddMore = authAddresses.addresses.length < MAX_SAVED_ADDRESSES;
    const guardedCreate = async (address: Omit<UserAddress, 'id'>) => {
      if (!canAddMore) {
        throw new Error(`You can save up to ${MAX_SAVED_ADDRESSES} addresses. Please delete one to add a new one.`);
      }
      return authAddresses.createAddress(address);
    };

    return {
      addresses: authAddresses.addresses,
      isLoading: authAddresses.loading,
      createAddress: guardedCreate,
      updateAddress: authAddresses.updateAddress,
      deleteAddress: authAddresses.deleteAddress,
      setDefaultAddress: authAddresses.setDefaultAddress,
      isCreating: authAddresses.isCreating,
      isUpdating: authAddresses.isUpdating,
      isDeleting: authAddresses.isDeleting,
      canAddMore,
    };
  }

  const canAddMore = guestAddresses.length < MAX_SAVED_ADDRESSES;

  return {
    addresses: guestAddresses,
    isLoading: guestLoading,
    createAddress: createGuestAddress,
    updateAddress: (id: string, data: Partial<UserAddress>) => updateGuestAddress(id, data),
    deleteAddress: deleteGuestAddress,
    setDefaultAddress: setGuestDefault,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    canAddMore,
  };
}
