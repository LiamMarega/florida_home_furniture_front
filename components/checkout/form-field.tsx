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
  // The message is linked to the field, so screen readers announce it with the field.
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...register(id)}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <p id={errorId} className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}
