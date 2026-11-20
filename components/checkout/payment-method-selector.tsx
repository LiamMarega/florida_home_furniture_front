'use client';

import { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PaymentStep } from '@/components/checkout/payment-step';
import { AffirmPayment } from '@/components/checkout/affirm-payment';
import { AffirmPromo } from '@/components/affirm/affirm-promo';
import { useAffirmConfig } from '@/hooks/use-affirm-config';
import {
  acquirePaymentLock,
  letPaymentLockExpire,
  releasePaymentLock,
  usePaymentLock,
  type PaymentKind,
} from '@/hooks/use-payment-lock';
import { findAffirmPaymentMethod } from '@/lib/affirm';
import { getStripe } from '@/lib/stripe';
import { EligiblePaymentMethod, PaymentAttemptOutcome } from '@/lib/checkout/types';
import { cn } from '@/lib/utils';

type PaymentOptionValue = PaymentKind;

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
  // Order total in cents, for Affirm's "As low as" messaging
  orderTotal?: number;
  onPaid: (orderCode: string) => void;
  onBack: () => void;
  // Called when a card or Affirm payment attempt starts
  onPaymentStart?: () => void;
}

/**
 * - idle: no payment running here
 * - active: a payment is running (or just succeeded): the method choice is locked
 * - uncertain: a payment's outcome is unknown: the choice stays locked so the shopper cannot pay twice
 */
type AttemptState = 'idle' | 'active' | 'uncertain';

/** Shown in every other tab while one tab pays the order. */
export function PaymentInOtherTabNotice({ className }: { className?: string }) {
  return (
    <div role="status" className={cn('p-4 border rounded-lg bg-amber-50 border-amber-200', className)}>
      <p className="text-sm text-amber-800">A payment for this order is in progress in another tab.</p>
    </div>
  );
}

export function PaymentMethodSelector({
  clientSecret,
  orderCode,
  paymentMethods,
  orderTotal,
  onPaid,
  onBack,
  onPaymentStart,
}: PaymentMethodSelectorProps) {
  const [selected, setSelected] = useState<PaymentOptionValue | null>(null);
  const [attempt, setAttempt] = useState<AttemptState>('idle');
  const { affirm, isLoading: affirmLoading } = useAffirmConfig();
  const lockState = usePaymentLock(orderCode);

  // A card or Affirm payment is running (or its outcome is unknown) here: switching methods could pay twice.
  const paymentBusy = attempt !== 'idle';
  // Another tab is paying this order: no payment may start here until it ends (or its lock expires).
  const lockedElsewhere = lockState === 'elsewhere' && !paymentBusy;

  const startAttempt = (kind: PaymentKind): boolean => {
    if (!acquirePaymentLock(orderCode, kind)) return false;
    setAttempt('active');
    onPaymentStart?.();
    return true;
  };

  const endAttempt = (outcome: PaymentAttemptOutcome) => {
    if (outcome === 'uncertain') {
      // Other tabs stay blocked until the lock expires; this one stays locked.
      letPaymentLockExpire(orderCode);
      setAttempt('uncertain');
      return;
    }
    releasePaymentLock(orderCode);
    // Paid: the page is moving on to the confirmation, so the choice stays locked meanwhile.
    setAttempt(outcome === 'paid' ? 'active' : 'idle');
  };

  const cardClientSecret = clientSecret && clientSecret.trim() !== '' ? clientSecret : null;
  const affirmMethod = findAffirmPaymentMethod(paymentMethods, affirm);
  // The PaymentIntent could not be created, so only Affirm is offered
  const cardUnavailable = !cardClientSecret && affirmMethod?.isEligible === true;

  const options: PaymentOption[] = [];
  if (cardClientSecret) {
    options.push({
      value: 'card',
      label: 'Credit or debit card',
      description: 'Processed securely by Stripe',
      disabled: false,
    });
  }
  if (affirm && affirmMethod) {
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

  // Which listed method is Affirm is only known once its settings load: wait for them rather than show the
  // card alone and then add Affirm (or show "nothing available" when Affirm is the only method).
  const waitingForAffirm = affirmLoading && paymentMethods.length > (cardClientSecret ? 1 : 0);
  if (waitingForAffirm) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading payment options...</p>
      </div>
    );
  }

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

  const locked = paymentBusy || lockedElsewhere;

  return (
    <div className="space-y-6">
      {lockedElsewhere && <PaymentInOtherTabNotice />}

      {cardUnavailable && (
        <p className="text-sm text-brand-dark-blue/80">Card payments are temporarily unavailable.</p>
      )}

      {/* With a single option the chooser is skipped, so card-only checkout looks as before */}
      {options.length > 1 && (
        <RadioGroup
          value={current}
          onValueChange={(value) => setSelected(value as PaymentOptionValue)}
          // Locked while a payment is in flight here or in another tab
          disabled={locked}
          aria-label="Payment method"
          className="gap-3"
        >
          {options.map((option) => {
            const id = `payment-method-${option.value}`;
            const optionLocked = option.disabled || locked;
            return (
              <div
                key={option.value}
                className={cn(
                  'rounded-lg border transition-colors',
                  current === option.value
                    ? 'border-brand-primary bg-brand-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <Label
                  htmlFor={id}
                  className={cn(
                    'flex items-start gap-3 p-4 leading-normal',
                    optionLocked ? 'cursor-not-allowed' : 'cursor-pointer',
                    // The option being paid keeps full opacity while the others are locked
                    optionLocked && current !== option.value && 'opacity-60'
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
                {/* Outside the label: Affirm's messaging contains its own "Learn more" link */}
                {option.value === 'affirm' && !option.disabled && (
                  <AffirmPromo amount={orderTotal} pageType="payment" className="-mt-2 pb-4 pl-11 pr-4" />
                )}
              </div>
            );
          })}
        </RadioGroup>
      )}

      {current === 'card' && cardClientSecret && (
        <Elements stripe={getStripe()} options={{ clientSecret: cardClientSecret }}>
          <PaymentStep
            clientSecret={cardClientSecret}
            orderCode={orderCode}
            disabled={lockedElsewhere}
            onPaid={onPaid}
            onBack={onBack}
            onAttemptStart={() => startAttempt('card')}
            onAttemptEnd={endAttempt}
          />
        </Elements>
      )}
      {current === 'affirm' && affirm && (
        <AffirmPayment
          orderCode={orderCode}
          affirm={affirm}
          // Without the chooser, the messaging moves into the Affirm panel
          promoAmount={options.length > 1 ? undefined : orderTotal}
          disabled={lockedElsewhere}
          onPaid={onPaid}
          onBack={onBack}
          onAttemptStart={() => startAttempt('affirm')}
          onAttemptEnd={endAttempt}
        />
      )}
    </div>
  );
}
