'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { StripeError } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useAffirmConfig } from '@/hooks/use-affirm-config';
import { PaymentStepProps } from '@/lib/checkout/types';
import { getStripe } from '@/lib/stripe';

// Stripe error types that mean nothing was charged: the card was declined, or its details are invalid.
const DEFINITIVE_ERROR_TYPES: ReadonlySet<StripeError['type']> = new Set(['card_error', 'validation_error']);

const UNCERTAIN_MESSAGE = "We couldn't confirm your card payment. Check your order status before trying again.";
const CARD_FORM_FAILED_MESSAGE = "We couldn't load the card payment form. Please refresh the page and try again.";
// Only where the store offers Affirm; whether this order can use it shows in the payment method choice above.
const CARD_FORM_FAILED_AFFIRM_HINT = "You can also choose Affirm above if it's offered for your order.";

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
  // The card form could not load (Stripe.js blocked or unreachable, or the Payment Element failed): said so instead
  // of a disabled "Pay now" over an empty panel.
  const [cardFormFailed, setCardFormFailed] = useState(false);
  const { affirm } = useAffirmConfig();

  const cardFormAlertRef = useRef<HTMLDivElement>(null);

  // getStripe() resolves to null when Stripe.js could not load.
  useEffect(() => {
    let active = true;
    void getStripe().then((loaded) => {
      if (!loaded && active) setCardFormFailed(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // The page may still be scrolled to where "Continue to Payment" was (on a phone, below this form).
  useEffect(() => {
    if (cardFormFailed) cardFormAlertRef.current?.scrollIntoView({ block: 'center' });
  }, [cardFormFailed]);

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
      <PaymentElement onLoadError={() => setCardFormFailed(true)} />
      {cardFormFailed && (
        <div ref={cardFormAlertRef} role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">
            {CARD_FORM_FAILED_MESSAGE}
            {affirm && ` ${CARD_FORM_FAILED_AFFIRM_HINT}`}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 text-sm font-medium text-brand-dark-blue underline underline-offset-2"
          >
            Refresh the page
          </button>
        </div>
      )}
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
          disabled={!stripe || !elements || status !== 'idle' || disabled || cardFormFailed}
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
