'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeError } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { PaymentStepProps } from '@/lib/checkout/types';

// Stripe error types that mean nothing was charged: the card was declined, or its details are invalid.
const DEFINITIVE_ERROR_TYPES: ReadonlySet<StripeError['type']> = new Set(['card_error', 'validation_error']);

const UNCERTAIN_MESSAGE = "We couldn't confirm your card payment. Check your order status before trying again.";

/**
 * - idle: ready to pay
 * - paying: the card payment is being submitted or confirmed
 * - uncertain: Stripe answered with an error that does not prove nothing was charged (network, API, unexpected
 *   PaymentIntent state): everything stays locked and the shopper checks the order status first
 */
type CardStatus = 'idle' | 'paying' | 'uncertain';

export function PaymentStep({
  clientSecret,
  orderCode,
  disabled,
  onPaid,
  onBack,
  onAttemptStart,
  onAttemptEnd,
}: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState<CardStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Validate clientSecret and orderCode before rendering PaymentElement
  const isValidClientSecret = clientSecret && typeof clientSecret === 'string' && clientSecret.trim() !== '';
  const isValidOrderCode = orderCode && typeof orderCode === 'string' && orderCode.trim() !== '';

  // A definitive failure: nothing was charged, so the shopper may retry or switch payment method.
  const fail = (message: string) => {
    setError(message);
    setStatus('idle');
    onAttemptEnd('failed');
  };

  // The payment may have gone through: keep everything locked and point to the order status.
  const markUncertain = (reason: string) => {
    console.warn('Card payment outcome unknown:', reason);
    setError(null);
    setStatus('uncertain');
    onAttemptEnd('uncertain');
  };

  const handlePay = async () => {
    if (!stripe || !elements || !isValidOrderCode || status !== 'idle' || disabled) return;
    // Another tab is paying this order: the payment method selector says so.
    if (!onAttemptStart()) return;

    setStatus('paying');
    setError(null);

    try {
      // Validate payment element inputs (nothing is sent to Stripe yet)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        fail(submitError.message || 'Please check your payment details.');
        return;
      }

      // Confirm the payment with Stripe. Vendure's Stripe webhook (/payments/stripe) records it on the order.
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/confirmation/${orderCode}`,
        },
      });

      // Stripe only resolves here when it does not redirect, which means an error.
      if (confirmError) {
        if (DEFINITIVE_ERROR_TYPES.has(confirmError.type)) {
          fail(confirmError.message || 'Your card was declined.');
        } else {
          markUncertain(`${confirmError.type}${confirmError.code ? ` (${confirmError.code})` : ''}`);
        }
        return;
      }

      // No error and no redirect: some payment methods confirm without one.
      onAttemptEnd('paid');
      onPaid(orderCode);
    } catch (err) {
      markUncertain(err instanceof Error ? err.message : 'unexpected error');
    }
  };

  if (!isValidClientSecret || !isValidOrderCode) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-red-600 text-sm">Invalid payment configuration. Please try again.</p>
          <Button type="button" variant="outline" onClick={onBack} className="mt-4">
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      {status === 'uncertain' && (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-sm">{UNCERTAIN_MESSAGE}</p>
          <Link
            href={`/checkout/confirmation/${orderCode}`}
            className="mt-2 inline-block text-sm font-medium text-brand-dark-blue underline underline-offset-2"
          >
            Check your order status
          </Link>
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={status !== 'idle'}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handlePay}
          disabled={!stripe || !elements || status !== 'idle' || disabled}
          className="flex-1"
        >
          {status === 'paying' ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Processing Payment...
            </>
          ) : (
            <>
              Pay now
              <CreditCard className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
