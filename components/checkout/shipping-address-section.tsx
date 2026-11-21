import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Truck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField } from './form-field';
import { StateSelect } from './state-select';
import { CustomerFormData } from '@/lib/checkout/types';
import { cn } from '@/lib/utils';

interface ShippingAddressSectionProps {
  register: UseFormRegister<CustomerFormData>;
  errors: FieldErrors<CustomerFormData>;
}

export function ShippingAddressSection({ register, errors }: ShippingAddressSectionProps) {
  const countryError = errors.shippingCountry?.message;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark-blue flex items-center gap-2">
          <Truck className="w-5 h-5" />
          Shipping Address
        </h2>
        <p id="shipping-us-only" className="mt-1 text-sm text-brand-dark-blue/70">
          We deliver within the United States only.
        </p>
      </div>

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
        <StateSelect
          id="shippingProvince"
          required
          error={errors.shippingProvince?.message}
          {...register('shippingProvince')}
        />
        <FormField
          id="shippingPostalCode"
          label="ZIP Code"
          placeholder="33101"
          required
          register={register}
          error={errors.shippingPostalCode}
        />
      </div>

      {/* No country to choose: a saved address from another country is refused here (focused on submit). */}
      <div>
        <Label htmlFor="shippingCountry">Country</Label>
        <Input
          id="shippingCountry"
          value="United States"
          readOnly
          aria-invalid={countryError ? true : undefined}
          aria-describedby={countryError ? 'shipping-us-only shippingCountry-error' : 'shipping-us-only'}
          className={cn('bg-gray-50 text-brand-dark-blue/80', countryError && 'border-red-500')}
        />
        {countryError && (
          <p id="shippingCountry-error" className="text-red-500 text-sm mt-1">
            {countryError}
          </p>
        )}
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
