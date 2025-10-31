'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, MapPin } from 'lucide-react';
import { AddressCard } from './AddressCard';
import { AddressFormModal } from './AddressFormModal';
import { EmptyStateComponent } from './EmptyStateComponent';
import { useAddresses } from '../hooks/use-addresses';
import { UserAddress } from '../types';
import { Skeleton } from '@/components/ui/skeleton';

export function AddressesPanel() {
  const {
    addresses,
    loading,
    error,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
  } = useAddresses();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<UserAddress | null>(null);

  const handleAdd = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress(id);
      if (editingAddress?.id === id) {
        setIsModalOpen(false);
        setEditingAddress(null);
      }
    } catch (error) {
      alert('Failed to delete address. Please try again.');
    }
  };

  const handleSubmit = async (addressData: Omit<UserAddress, 'id'> | UserAddress) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, addressData);
      } else {
        await createAddress(addressData as Omit<UserAddress, 'id'>);
      }
      setIsModalOpen(false);
      setEditingAddress(null);
    } catch (error) {
      alert(
        `Failed to ${editingAddress ? 'update' : 'create'} address. Please try again.`
      );
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold text-brand-dark-blue font-tango-sans">
          My Addresses
        </h2>
        <Button onClick={handleAdd} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add New Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyStateComponent
          icon={MapPin}
          title="No addresses yet"
          description="Add your first address to make checkout faster. You can save multiple addresses for home, office, or any other location."
          actionLabel="Add Your First Address"
          onAction={handleAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={setDefaultAddress}
            />
          ))}
        </div>
      )}

      <AddressFormModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingAddress(null);
          }
        }}
        address={editingAddress}
        onSubmit={handleSubmit}
        onDelete={editingAddress ? handleDelete : undefined}
      />
    </div>
  );
}

