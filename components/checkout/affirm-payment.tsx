'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AffirmPromo } from '@/components/affirm/affirm-promo';
import { cartKeys } from '@/hooks/use-cart';
import { useAffirmConfig } from '@/hooks/use-affirm-config';
import { loadAffirm, type Affirm, type AffirmCheckoutSuccess, type EnabledAffirmConfig } from '@/lib/affirm';
import {
  clearAffirmOpenedMarker,
  markAffirmOpened,
  savePendingAffirmToken,
} from '@/lib/checkout/affirm-session';
import { AFFIRM_PAYMENT_FAILED_MESSAGE, finishAffirmPayment } from '@/lib/checkout/affirm-token';
import type { PaymentAttemptHandlers } from '@/lib/checkout/types';
import { cn } from '@/lib/utils';

const UNAVAILABLE_MESSAGE = 'Affirm is unavailable right now. Please choose another payment method.';
const NOT_COMPLETED_MESSAGE =
  'Affirm checkout was not completed. You can try again or choose another payment method.';
const VALIDATION_FALLBACK_MESSAGE =
  'Affirm could not validate this order. Please review your details or choose another payment method.';

interface AffirmPaymentProps extends PaymentAttemptHandlers {
  orderCode: string;
  /** The channel's Affirm settings (public key, environment) for affirm.js. */
  affirm: EnabledAffirmConfig;
  // Order total in cents for "As low as" messaging; omitted when the payment option already shows it
  promoAmount?: number;
  /** True while another tab is paying this order. */
  disabled?: boolean;
  /** Goes to the confirmation page, which decides from the real order state. */
  onPaid: (orderCode: string) => void;
  onBack: () => void;
}

/** The affirm.js checkout object the backend builds for the active order. */
async function fetchAffirmCheckout(): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch('/api/checkout/affirm', { credentials: 'include', cache: 'no-store' });
  } catch {
    throw new Error(UNAVAILABLE_MESSAGE);
  }
  const data: { checkout?: Record<string, unknown>; error?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !data.checkout) {
    throw new Error(data.error || UNAVAILABLE_MESSAGE);
  }
  return data.checkout;
}

function validationMessage(validationError: unknown): string {
  const message =
    validationError && typeof validationError === 'object' && 'message' in validationError
      ? (validationError as { message?: unknown }).message
      : undefined;
  return typeof message === 'string' && message.trim() ? message : VALIDATION_FALLBACK_MESSAGE;
}

export function AffirmPayment({
  orderCode,
  affirm,
  promoAmount,
  disabled,
  onPaid,
  onBack,
  onAttemptStart,
  onAttemptEnd,
}: AffirmPaymentProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  // From Affirm's onSuccess until the page changes or the payment is rejected: the token POST is in
  // flight, so Back is disabled. Back stays enabled otherwise, so an Affirm modal that closes
  // without calling back never traps the customer.
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'info' } | null>(null);
  // Blocks a second click before the disabled state has rendered.
  const busyRef = useRef(false);
  // False once the customer has left this step (Back), so a late affirm.js load opens no modal.
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateBusy = (next: boolean) => {
    busyRef.current = next;
    setBusy(next);
  };

  // Nothing was paid (not started, closed, declined): the payment method choice unlocks.
  const stop = (message: string, tone: 'error' | 'info' = 'error') => {
    clearAffirmOpenedMarker();
    updateBusy(false);
    setSubmitting(false);
    setFeedback({ message, tone });
    onAttemptEnd('failed');
  };

  const goToConfirmation = (confirmationOrderCode: string) => {
    // The order may have left the cart: refresh cart data, then let the confirmation page read the
    // order and show what happened.
    void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    onPaid(confirmationOrderCode);
  };

  const completePayment = async (checkoutToken: string) => {
    // Stored before it is sent: a refresh, a closed tab or a lost answer leaves it for the checkout or
    // confirmation page to finish (bound to this order, 30 minutes, cleared on any final answer).
    const pending = savePendingAffirmToken(orderCode, checkoutToken);
    const result = await finishAffirmPayment(pending);

    if (result.outcome === 'rejected') {
      // Declined or not eligible: final for this Affirm checkout; a new attempt opens a new one.
      stop(result.error);
      return;
    }
    if (result.outcome === 'paid') {
      onAttemptEnd('paid');
      goToConfirmation(result.orderCode);
      return;
    }
    // Still unknown (409: the order changed or was already paid; repeated server or network failures).
    // The confirmation page decides from the real order state; offering another payment method here
    // could charge the customer twice.
    onAttemptEnd('uncertain');
    goToConfirmation(orderCode);
  };

  const handleContinue = async () => {
    if (busyRef.current || disabled) return;
    // Another tab is paying this order: the payment method selector says so.
    if (!onAttemptStart()) return;
    updateBusy(true);
    setFeedback(null);

    let affirmJs: Affirm;
    let checkout: Record<string, unknown>;
    try {
      [affirmJs, checkout] = await Promise.all([
        loadAffirm(affirm).catch(() => {
          throw new Error(UNAVAILABLE_MESSAGE);
        }),
        fetchAffirmCheckout(),
      ]);
    } catch (err) {
      stop(err instanceof Error ? err.message : UNAVAILABLE_MESSAGE);
      return;
    }

    if (!mountedRef.current) {
      // The customer went Back while Affirm was loading: do not open the modal over another step.
      updateBusy(false);
      onAttemptEnd('failed');
      return;
    }

    try {
      affirmJs.checkout(checkout);
      // Lets Affirm's redirect back (/checkout/affirm/return) through, should it redirect instead of
      // calling the callbacks below.
      markAffirmOpened(orderCode);
      affirmJs.checkout.open({
        onSuccess: (result: AffirmCheckoutSuccess) => {
          clearAffirmOpenedMarker();
          const checkoutToken = result?.checkout_token ?? result?.checkout_id;
          if (!checkoutToken) {
            console.error('Affirm onSuccess returned no checkout token');
            stop(AFFIRM_PAYMENT_FAILED_MESSAGE);
            return;
          }
          setSubmitting(true);
          completePayment(checkoutToken).catch((error: unknown) => {
            // finishAffirmPayment never throws; this only guards the navigation itself.
            console.error('Affirm payment confirmation failed:', error);
            onAttemptEnd('uncertain');
            goToConfirmation(orderCode);
          });
        },
        // Closed, cancelled or not approved by Affirm: informational, not an error on our side.
        onFail: () => stop(NOT_COMPLETED_MESSAGE, 'info'),
        onValidationError: (validationError) => {
          console.warn('Affirm checkout validation error:', validationError);
          stop(validationMessage(validationError));
        },
      });
    } catch (err) {
      console.error('Failed to open Affirm checkout:', err);
      stop(UNAVAILABLE_MESSAGE);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-brand-dark-blue/80">
          Pay over time with Affirm. Affirm opens in a secure window to complete your purchase; subject to
          eligibility check.
        </p>
        <AffirmPromo amount={promoAmount} pageType="payment" className="mt-2" />
      </div>
      {feedback && (
        <div
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'p-4 border rounded-lg',
            feedback.tone === 'error' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
          )}
        >
          <p className={cn('text-sm', feedback.tone === 'error' ? 'text-red-600' : 'text-amber-800')}>
            {feedback.message}
          </p>
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={busy || disabled}
          aria-busy={busy}
          className="flex-1"
        >
          {busy ? (
            <>
              <div
                className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"
                aria-hidden="true"
              ></div>
              Processing...
            </>
          ) : (
            'Continue with Affirm'
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Notice for `?affirm=cancelled`, Affirm's cancel URL: it only leads here if Affirm redirects instead of
 * calling the modal callbacks, and nothing is paid from it. The checkout page drops the parameter when the
 * next payment attempt starts. Reads search params, so render it inside <Suspense>.
 */
export function AffirmReturnNotice() {
  const searchParams = useSearchParams();
  const { affirm } = useAffirmConfig();
  const cancelled = searchParams.get('affirm') === 'cancelled';

  useEffect(() => {
    // That Affirm checkout is over: no redirect back with a token is expected for it anymore.
    if (cancelled) clearAffirmOpenedMarker();
  }, [cancelled]);

  if (!affirm || !cancelled) return null;

  return (
    <div role="status" className="mb-6 p-4 border rounded-lg bg-amber-50 border-amber-200">
      <p className="text-sm text-amber-800">{NOT_COMPLETED_MESSAGE}</p>
    </div>
  );
}
