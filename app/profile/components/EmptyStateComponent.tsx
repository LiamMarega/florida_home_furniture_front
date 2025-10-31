'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateComponentProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateComponent({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateComponentProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 rounded-full bg-brand-cream p-6">
        <Icon className="h-12 w-12 text-brand-secondary" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold text-brand-dark-blue mb-2 font-tango-sans">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="default" size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

