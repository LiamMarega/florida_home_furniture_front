'use client';

import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PaymentStep } from '@/components/checkout/payment-step';
import { AffirmPayment } from '@/components/checkout/affirm-payment';
import { findAffirmPaymentMethod } from '@/lib/affirm';
import { getStripe } from '@/lib/stripe';
import { EligiblePaymentMethod } from '@/lib/checkout/types';
import { cn } from '@/lib/utils';

type PaymentOptionValue = 'card' | 'affirm';

interface PaymentOption {
  value: PaymentOptionValue;
  label: string;
  description: string;
  disabled: boolean;
}

interface PaymentMethodSelectorProps {
  // Null when the Stripe PaymentIntent could not be created (card payment unavailable)
  clientSecret: string | null;
  orderCode: string;
  paymentMethods: EligiblePaymentMethod[];
  onPaid: (orderCode: string) => void;
  onBack: () => void;
}

export function PaymentMethodSelector({
  clientSecret,
  orderCode,
  paymentMethods,
  onPaid,
  onBack,
}: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState<PaymentOptionValue | null>(null);

  const cardClientSecret = clientSecret && clientSecret.trim() !== '' ? clientSecret : null;
  const affirmMethod = findAffirmPaymentMethod(paymentMethods);

  const options: PaymentOption[] = [];
  if (cardClientSecret) {
    options.push({
      value: 'card',
      label: 'Credit or debit card',
      description: 'Processed securely by Stripe',
      disabled: false,
    });
  }
  if (affirmMethod) {
    options.push({
      value: 'affirm',
      label: 'Affirm',
      description: affirmMethod.isEligible
        ? 'Pay over time'
        : affirmMethod.eligibilityMessage || 'Not available for this order',
      disabled: !affirmMethod.isEligible,
    });
  }

  // The customer's choice while it is available, otherwise the first enabled option.
  const enabledOptions = options.filter((option) => !option.disabled);
  const current = enabledOptions.find((option) => option.value === selected)?.value ?? enabledOptions[0]?.value;

  if (!current) {
    return (
      <div className="space-y-4">
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">
            No payment method is available for this order right now. Please try again later or contact us
            for help.
          </p>
          {affirmMethod?.eligibilityMessage && (
            <p className="text-red-600 text-sm mt-2">Affirm: {affirmMethod.eligibilityMessage}</p>
          )}
        </div>
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* With a single option the chooser is skipped, so card-only checkout looks as before */}
      {options.length > 1 && (
        <RadioGroup
          value={current}
          onValueChange={(value) => setSelected(value as PaymentOptionValue)}
          aria-label="Payment method"
          className="gap-3"
        >
          {options.map((option) => {
            const id = `payment-method-${option.value}`;
            return (
              <Label
                key={option.value}
                htmlFor={id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 leading-normal transition-colors',
                  option.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  current === option.value
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <RadioGroupItem id={id} value={option.value} disabled={option.disabled} className="mt-1" />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-base font-medium text-brand-dark-blue">
                    {option.value === 'card' && <CreditCard className="w-4 h-4" aria-hidden="true" />}
                    {option.label}
                  </span>
                  <span className="block text-sm font-normal text-brand-dark-blue/70">{option.description}</span>
                </span>
              </Label>
            );
          })}
        </RadioGroup>
      )}

      {current === 'card' && cardClientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret: cardClientSecret }}>
          <PaymentStep clientSecret={cardClientSecret} orderCode={orderCode} onPaid={onPaid} onBack={onBack} />
        </Elements>
      )}
      {current === 'affirm' && <AffirmPayment orderCode={orderCode} onPaid={onPaid} onBack={onBack} />}
    </div>
  );
}
