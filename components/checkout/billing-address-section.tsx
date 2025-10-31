import { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { FormField } from './form-field';
import { CustomerFormData } from '@/lib/checkout/types';

interface BillingAddressSectionProps {
  register: UseFormRegister<CustomerFormData>;
  errors: FieldErrors<CustomerFormData>;
  watch: UseFormWatch<CustomerFormData>;
}

export function BillingAddressSection({ register, errors, watch }: BillingAddressSectionProps) {
  const billingSameAsShipping = watch('billingSameAsShipping');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="billingSameAsShipping"
          {...register('billingSameAsShipping')}
          className="w-4 h-4 text-brand-primary focus:ring-brand-primary border-brand-cream rounded"
        />
        <Label htmlFor="billingSameAsShipping" className="font-medium cursor-pointer">
          Billing address same as shipping
        </Label>
      </div>

      {!billingSameAsShipping && (
        <div className="space-y-4 pl-6">
          <h3 className="text-lg font-semibold text-brand-dark-blue">Billing Address</h3>
          
          <FormField
            id="billingFullName"
            label="Full Name"
            required
            register={register}
            error={errors.billingFullName}
          />
          
          <FormField
            id="billingStreetLine1"
            label="Street Address"
            required
            register={register}
            error={errors.billingStreetLine1}
          />
          
          <FormField
            id="billingStreetLine2"
            label="Apartment, suite, etc. (optional)"
            register={register}
            error={errors.billingStreetLine2}
          />
          
          <div className="grid md:grid-cols-3 gap-4">
            <FormField
              id="billingCity"
              label="City"
              required
              register={register}
              error={errors.billingCity}
            />
            <FormField
              id="billingProvince"
              label="State / Province"
              required
              register={register}
              error={errors.billingProvince}
            />
            <FormField
              id="billingPostalCode"
              label="Postal Code"
              required
              register={register}
              error={errors.billingPostalCode}
            />
          </div>
          
          <FormField
            id="billingPhoneNumber"
            label="Phone Number"
            type="tel"
            required
            register={register}
            error={errors.billingPhoneNumber}
          />
        </div>
      )}
    </div>
  );
}
