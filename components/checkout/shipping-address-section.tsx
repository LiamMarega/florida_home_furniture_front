import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Truck } from 'lucide-react';
import { FormField } from './form-field';
import { CustomerFormData } from '@/lib/checkout/types';

interface ShippingAddressSectionProps {
  register: UseFormRegister<CustomerFormData>;
  errors: FieldErrors<CustomerFormData>;
}

export function ShippingAddressSection({ register, errors }: ShippingAddressSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-brand-dark-blue flex items-center gap-2">
        <Truck className="w-5 h-5" />
        Shipping Address
      </h2>

      <FormField
        id="shippingFullName"
        label="Full Name"
        required
        register={register}
        error={errors.shippingFullName}
      />

      <FormField
        id="shippingStreetLine1"
        label="Street Address"
        placeholder="123 Main St"
        required
        register={register}
        error={errors.shippingStreetLine1}
      />

      <FormField
        id="shippingStreetLine2"
        label="Apartment, suite, etc. (optional)"
        placeholder="Apt 4B"
        register={register}
        error={errors.shippingStreetLine2}
      />

      <div className="grid md:grid-cols-3 gap-4">
        <FormField
          id="shippingCity"
          label="City"
          required
          register={register}
          error={errors.shippingCity}
        />
        <FormField
          id="shippingProvince"
          label="State / Province"
          placeholder="FL"
          required
          register={register}
          error={errors.shippingProvince}
        />
        <FormField
          id="shippingPostalCode"
          label="Postal Code"
          placeholder="33101"
          required
          register={register}
          error={errors.shippingPostalCode}
        />
      </div>

      <FormField
        id="shippingPhoneNumber"
        label="Phone Number"
        type="tel"
        placeholder="+1 (555) 123-4567"
        required
        register={register}
        error={errors.shippingPhoneNumber}
      />
    </div>
  );
}
