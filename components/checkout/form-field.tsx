import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from 'react-hook-form';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: FieldError;
  register: any;
  className?: string;
}

export function FormField({
  id,
  label,
  type = 'text',
  placeholder,
  required = false,
  error,
  register,
  className = '',
}: FormFieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        {...register(id)}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}
