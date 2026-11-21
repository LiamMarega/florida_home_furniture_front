import type { ComponentProps } from 'react';
import { Label } from '@/components/ui/label';
import { US_STATES } from '@/lib/checkout/us-states';
import { cn } from '@/lib/utils';

interface StateSelectProps extends Omit<ComponentProps<'select'>, 'id' | 'children'> {
  id: string;
  label?: string;
  /** Shows the required marker (validation itself is the form's). */
  required?: boolean;
  /** The message under the field, if any. */
  error?: string;
}

/**
 * The state of a US address: a native select of the states, DC and territories the store delivers to, whose value
 * is the two-letter code. Takes react-hook-form's `register()` props or a controlled `value` and `onChange`.
 */
export function StateSelect({ id, label = 'State', required = false, error, className = '', ...selectProps }: StateSelectProps) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <Label htmlFor={id}>
        {label} {required && '*'}
      </Label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...selectProps}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500'
        )}
      >
        <option value="">Select a state</option>
        {US_STATES.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="text-red-500 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
