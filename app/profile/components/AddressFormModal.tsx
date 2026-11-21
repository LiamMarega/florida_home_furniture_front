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
import { StateSelect } from '@/components/checkout/state-select';
import { savedAddressSchema } from '@/lib/checkout/types';
import { toUsStateCode } from '@/lib/checkout/us-states';
import { friendlyCheckoutMessage } from '@/lib/checkout/utils';
import { UserAddress } from '../types';

interface AddressFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: UserAddress | null;
  onSubmit: (address: Omit<UserAddress, 'id'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const EMPTY_FORM = {
  nickname: '',
  fullName: '',
  street: '',
  streetLine2: '',
  city: '',
  state: '',
  zipCode: '',
  phoneNumber: '',
  isDefault: false,
};

type AddressFormState = typeof EMPTY_FORM;

/** The fields the saved-address rules check (the checkout's US rules), with the message under each. */
type CheckedField = 'fullName' | 'street' | 'city' | 'state' | 'zipCode';
type FieldErrors = Partial<Record<CheckedField, string>>;

/** The first message for each field that breaks the saved-address rules; none when the address passes. */
function fieldErrorsOf(formData: AddressFormState): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of savedAddressSchema.safeParse(formData).error?.issues ?? []) {
    const field = issue.path[0] as CheckedField;
    errors[field] ??= issue.message;
  }
  return errors;
}

function FieldMessage({ field, errors }: { field: CheckedField; errors: FieldErrors }) {
  return errors[field] ? (
    <p id={`${field}-error`} className="text-red-500 text-sm">
      {errors[field]}
    </p>
  ) : null;
}

export function AddressFormModal({
  open,
  onOpenChange,
  address,
  onSubmit,
  onDelete,
}: AddressFormModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<AddressFormState>(EMPTY_FORM);
  // Messages under the fields, and why a save or delete failed: shown in the dialog, never only in the console.
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  // Populate/reset the form when the edited address (or open state) changes — standard form-sync effect.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (address) {
      setFormData({
        nickname: address.nickname || '',
        fullName: address.fullName || '',
        street: address.street || '',
        streetLine2: address.streetLine2 || '',
        city: address.city || '',
        // Saved names ("Florida") and lowercase codes select their state; anything else asks for one.
        state: toUsStateCode(address.state),
        zipCode: address.zipCode || '',
        phoneNumber: address.phoneNumber || '',
        isDefault: address.isDefault,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFieldErrors({});
    setFormError(null);
  }, [address, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // A flagged field is checked again as it changes, so its message goes away once it is right.
  const update = (field: Exclude<keyof AddressFormState, 'isDefault'>, value: string) => {
    const next = { ...formData, [field]: value } as AddressFormState;
    setFormData(next);
    if (fieldErrors[field as CheckedField]) {
      setFieldErrors({ ...fieldErrors, [field]: fieldErrorsOf(next)[field as CheckedField] });
    }
  };

  // A field to fix is marked and linked to its message for screen readers.
  const checked = (field: CheckedField) =>
    fieldErrors[field]
      ? { 'aria-invalid': true, 'aria-describedby': `${field}-error`, className: 'border-red-500' }
      : {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors = fieldErrorsOf(formData);
    setFieldErrors(errors);
    const firstToFix = Object.keys(errors)[0];
    if (firstToFix) {
      document.getElementById(firstToFix)?.focus();
      return;
    }

    setLoading(true);
    try {
      // Trimmed by the rules; the store delivers within the United States only.
      await onSubmit({ ...formData, ...savedAddressSchema.parse(formData), country: 'US' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting address:', error);
      setFormError(
        friendlyCheckoutMessage(
          error instanceof Error ? error.message : undefined,
          'We could not save this address. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!address?.id || !onDelete) return;

    if (confirm('Are you sure you want to delete this address?')) {
      setLoading(true);
      setFormError(null);
      try {
        await onDelete(address.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting address:', error);
        setFormError(
          friendlyCheckoutMessage(
            error instanceof Error ? error.message : undefined,
            'We could not delete this address. Please try again.'
          )
        );
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
              : 'Add a new shipping or billing address to your account.'}{' '}
            We deliver within the United States only.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nickname">Nickname (Optional)</Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => update('nickname', e.target.value)}
                  placeholder="e.g., Home, Office"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  required
                  {...checked('fullName')}
                />
                <FieldMessage field="fullName" errors={fieldErrors} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={formData.street}
                onChange={(e) => update('street', e.target.value)}
                required
                {...checked('street')}
              />
              <FieldMessage field="street" errors={fieldErrors} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="streetLine2">Apartment, suite, etc. (Optional)</Label>
              <Input
                id="streetLine2"
                value={formData.streetLine2}
                onChange={(e) => update('streetLine2', e.target.value)}
              />
            </div>
            {/* Stacked on phones, as on checkout: a state name needs the width */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => update('city', e.target.value)}
                  required
                  {...checked('city')}
                />
                <FieldMessage field="city" errors={fieldErrors} />
              </div>
              <StateSelect
                id="state"
                className="space-y-2"
                error={fieldErrors.state}
                value={formData.state}
                onChange={(e) => update('state', e.target.value)}
                aria-required
              />
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => update('zipCode', e.target.value)}
                  required
                  {...checked('zipCode')}
                />
                <FieldMessage field="zipCode" errors={fieldErrors} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value="United States"
                  readOnly
                  className="bg-gray-50 text-brand-dark-blue/80"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => update('phoneNumber', e.target.value)}
                />
              </div>
            </div>
          </div>
          {formError && (
            <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{formError}</p>
            </div>
          )}
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
