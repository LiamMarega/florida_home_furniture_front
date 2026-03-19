'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit, Trash2, Star, Plus, Check } from 'lucide-react';
import { UserAddress } from '@/app/profile/types';
import { AddressFormModal } from '@/app/profile/components/AddressFormModal';
import { toast } from 'sonner';

interface AddressSelectorProps {
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelect: (address: UserAddress) => void;
  onAddNew: () => void;
  onEdit: (address: UserAddress) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  canAddMore?: boolean;
}

export function AddressSelector({
  addresses,
  selectedAddressId,
  onSelect,
  onAddNew,
  onEdit,
  onDelete,
  isLoading,
  canAddMore = true,
}: AddressSelectorProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-brand-dark-blue flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Saved Addresses
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (addresses.length === 0) return null;

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      onDelete(id);
      setDeleteConfirmId(null);
      toast.success('Address deleted');
    } else {
      setDeleteConfirmId(id);
      // Auto-reset after 3 seconds
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const formatAddress = (addr: UserAddress) => {
    return [
      addr.street,
      addr.streetLine2,
      `${addr.city}, ${addr.state} ${addr.zipCode}`,
    ]
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-brand-dark-blue flex items-center gap-2">
        <MapPin className="w-5 h-5" />
        Saved Addresses
      </h3>
      <p className="text-sm text-muted-foreground">
        Select a saved address or add a new one below.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;
            return (
              <motion.div
                key={address.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-2 border-brand-primary ring-2 ring-brand-primary/20'
                      : 'border border-gray-200 hover:border-brand-primary/50'
                  }`}
                  onClick={() => onSelect(address)}
                >
                  <CardContent className="p-4 relative">
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Address info */}
                    <div className="pr-8">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-brand-dark-blue text-sm">
                          {address.nickname || address.fullName || 'Address'}
                        </span>
                        {address.isDefault && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 border-green-200 text-[10px] px-1.5 py-0"
                          >
                            <Star className="w-2.5 h-2.5 mr-0.5" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {address.fullName && address.nickname && (
                        <p className="text-xs text-muted-foreground mb-1">
                          {address.fullName}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {formatAddress(address)}
                      </p>
                      {address.phoneNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {address.phoneNumber}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 mt-3 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-brand-dark-blue"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(address);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 px-2 text-xs ${
                          deleteConfirmId === address.id
                            ? 'text-red-600 hover:text-red-700 bg-red-50'
                            : 'text-muted-foreground hover:text-red-500'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(address.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {deleteConfirmId === address.id ? 'Confirm?' : 'Delete'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add New Address card — hidden when at max capacity */}
        {canAddMore ? (
          <motion.div layout>
            <Card
              className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-brand-primary/50 transition-all duration-200 hover:shadow-md h-full min-h-[120px]"
              onClick={onAddNew}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center h-full gap-2 text-muted-foreground hover:text-brand-primary transition-colors">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Add New Address</span>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div layout>
            <Card className="border-2 border-dashed border-gray-200 h-full min-h-[120px] opacity-50">
              <CardContent className="p-4 flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Max 4 addresses</span>
                <span className="text-xs">Delete one to add another</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Wrapper that manages modal state for the address selector
interface AddressSelectorWithModalProps {
  addresses: UserAddress[];
  selectedAddressId: string | null;
  onSelect: (address: UserAddress) => void;
  onCreateAddress: (address: Omit<UserAddress, 'id'>) => Promise<any>;
  onUpdateAddress: (id: string, address: Partial<UserAddress>) => Promise<any>;
  onDeleteAddress: (id: string) => Promise<void>;
  isLoading?: boolean;
  canAddMore?: boolean;
}

export function AddressSelectorWithModal({
  addresses,
  selectedAddressId,
  onSelect,
  onCreateAddress,
  onUpdateAddress,
  onDeleteAddress,
  isLoading,
  canAddMore = true,
}: AddressSelectorWithModalProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const handleAddNew = () => {
    setEditingAddress(null);
    setModalOpen(true);
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
    setModalOpen(true);
  };

  const handleSubmit = async (addressData: Omit<UserAddress, 'id'>) => {
    if (editingAddress) {
      await onUpdateAddress(editingAddress.id, addressData);
      toast.success('Address updated');
    } else {
      await onCreateAddress(addressData);
      toast.success('Address added');
    }
  };

  const handleDelete = async (id: string) => {
    await onDeleteAddress(id);
  };

  return (
    <>
      <AddressSelector
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        onSelect={onSelect}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        canAddMore={canAddMore}
      />
      <AddressFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        address={editingAddress}
        onSubmit={handleSubmit}
        onDelete={editingAddress ? (id) => handleDelete(id) : undefined}
      />
    </>
  );
}
