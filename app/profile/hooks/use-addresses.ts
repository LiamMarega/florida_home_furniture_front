'use client';

import { useState, useEffect } from 'react';
import { UserAddress } from '../types';

export function useAddresses() {
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/addresses', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch addresses');
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const createAddress = async (address: Omit<UserAddress, 'id'>) => {
    try {
      const response = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create address');
      }

      const data = await response.json();
      setAddresses((prev) => [...prev, data.address]);
      return data.address;
    } catch (err) {
      throw err;
    }
  };

  const updateAddress = async (id: string, address: Partial<UserAddress>) => {
    try {
      const response = await fetch(`/api/user/addresses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(address),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update address');
      }

      const data = await response.json();
      setAddresses((prev) =>
        prev.map((addr) => (addr.id === id ? data.address : addr))
      );
      return data.address;
    } catch (err) {
      throw err;
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      const response = await fetch(`/api/user/addresses/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete address');
      }

      setAddresses((prev) => prev.filter((addr) => addr.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      const response = await fetch(`/api/user/addresses/${id}/default`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default address');
      }

      const data = await response.json();
      // Optimistically update: set all to false, then set the selected one to true
      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          isDefault: addr.id === id,
        }))
      );
      return data.address;
    } catch (err) {
      throw err;
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  };
}

