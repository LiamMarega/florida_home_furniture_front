'use client';

import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserAddress } from '../types';

interface AddressFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: UserAddress | null;
  onSubmit: (address: Omit<UserAddress, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function AddressFormModal({
  open,
  onOpenChange,
  address,
  onSubmit,
  onDelete,
}: AddressFormModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    nickname: '',
    fullName: '',
    street: '',
    streetLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phoneNumber: '',
    isDefault: false,
  });

  useEffect(() => {
    if (address) {
      setFormData({
        nickname: address.nickname || '',
        fullName: address.fullName || '',
        street: address.street,
        streetLine2: address.streetLine2 || '',
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        country: address.country || 'US',
        phoneNumber: address.phoneNumber || '',
        isDefault: address.isDefault,
      });
    } else {
      setFormData({
        nickname: '',
        fullName: '',
        street: '',
        streetLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'US',
        phoneNumber: '',
        isDefault: false,
      });
    }
  }, [address, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (address) {
        await onSubmit(formData as UserAddress);
      } else {
        await onSubmit(formData as Omit<UserAddress, 'id'>);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting address:', error);
      // Error handling will be done by parent component
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!address?.id || !onDelete) return;

    if (confirm('Are you sure you want to delete this address?')) {
      setLoading(true);
      try {
        await onDelete(address.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting address:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {address ? 'Edit Address' : 'Add New Address'}
          </DialogTitle>
          <DialogDescription>
            {address
              ? 'Update your address information below.'
              : 'Add a new shipping or billing address to your account.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname (Optional)</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData({ ...formData, nickname: e.target.value })
                  }
                  placeholder="e.g., Home, Office"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetLine2">Apartment, suite, etc. (Optional)</Label>
              <Input
                id="streetLine2"
                value={formData.streetLine2}
                onChange={(e) =>
                  setFormData({ ...formData, streetLine2: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData({ ...formData, zipCode: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-end gap-2">
            {address && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : address ? 'Update' : 'Add Address'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

