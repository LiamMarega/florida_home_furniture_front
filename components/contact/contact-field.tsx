'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '@/components/ui/input';
import { Textarea, type TextareaProps } from '@/components/ui/textarea';

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function FieldShell({ id, label, required, error, children, className }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium text-brand-dark-blue"
      >
        {label}
        {required && <span className="text-brand-primary ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-600"
        >
          {error}
        </motion.span>
      )}
    </div>
  );
}

interface ContactFieldProps extends InputProps {
  id: string;
  label: string;
  error?: string;
  containerClassName?: string;
}

export const ContactField = React.forwardRef<HTMLInputElement, ContactFieldProps>(
  ({ id, label, error, required, containerClassName, className, ...props }, ref) => (
    <FieldShell id={id} label={label} required={required} error={error} className={containerClassName}>
      <Input
        id={id}
        ref={ref}
        aria-invalid={!!error}
        className={cn(
          'h-11 rounded-md border-brand-cream bg-white text-brand-dark-blue focus-visible:ring-brand-primary',
          error && 'border-red-400 focus-visible:ring-red-400',
          className
        )}
        {...props}
      />
    </FieldShell>
  )
);
ContactField.displayName = 'ContactField';

interface ContactTextareaProps extends TextareaProps {
  id: string;
  label: string;
  error?: string;
  containerClassName?: string;
}

export const ContactTextarea = React.forwardRef<HTMLTextAreaElement, ContactTextareaProps>(
  ({ id, label, error, required, containerClassName, className, ...props }, ref) => (
    <FieldShell id={id} label={label} required={required} error={error} className={containerClassName}>
      <Textarea
        id={id}
        ref={ref}
        aria-invalid={!!error}
        className={cn(
          'min-h-[120px] rounded-md border-brand-cream bg-white text-brand-dark-blue focus-visible:ring-brand-primary',
          error && 'border-red-400 focus-visible:ring-red-400',
          className
        )}
        {...props}
      />
    </FieldShell>
  )
);
ContactTextarea.displayName = 'ContactTextarea';
