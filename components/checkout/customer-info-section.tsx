import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { FormField } from './form-field';
import { CustomerFormData } from '@/lib/checkout/types';

interface CustomerInfoSectionProps {
  register: UseFormRegister<CustomerFormData>;
  errors: FieldErrors<CustomerFormData>;
}

export function CustomerInfoSection({ register, errors }: CustomerInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-brand-dark-blue">Contact Information</h2>
      
      <div className="grid md:grid-cols-2 gap-4">
        <FormField
          id="firstName"
          label="First Name"
          required
          register={register}
          error={errors.firstName}
        />
        <FormField
          id="lastName"
          label="Last Name"
          required
          register={register}
          error={errors.lastName}
        />
      </div>
      
      <FormField
        id="emailAddress"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
        register={register}
        error={errors.emailAddress}
      />
    </div>
  );
}
