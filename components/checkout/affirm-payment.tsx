'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AffirmPromo } from '@/components/affirm/affirm-promo';
import { cartKeys } from '@/hooks/use-cart';
import { getAffirmPublicConfig, loadAffirm, type Affirm, type AffirmCheckoutSuccess } from '@/lib/affirm';
import { cn } from '@/lib/utils';

const UNAVAILABLE_MESSAGE = 'Affirm is unavailable right now. Please choose another payment method.';
const NOT_COMPLETED_MESSAGE =
  'Affirm checkout was not completed. You can try again or choose another payment method.';
const PAYMENT_FAILED_MESSAGE =
  'Affirm could not complete the payment. You can try again or choose another payment method.';
const VALIDATION_FALLBACK_MESSAGE =
  'Affirm could not validate this order. Please review your details or choose another payment method.';
// The token may already have reached the store, so this never suggests another payment method.
const UNKNOWN_OUTCOME_MESSAGE =
  'We could not confirm your Affirm payment yet. Please check your email for an order confirmation before trying to pay again.';

interface AffirmPaymentProps {
  orderCode: string;
  // Order total in cents for "As low as" messaging; omitted when the payment option already shows it
  promoAmount?: number;
  onPaid: (orderCode: string) => void;
  onBack: () => void;
  // true when an Affirm attempt starts, false once it stops without leaving the page
  onBusyChange?: (busy: boolean) => void;
}

/**
 * Answer of POST /api/checkout/affirm. Only two are final: `paid` (200) and `rejected` (400 invalid
 * token or not eligible, 402 declined), which ends this Affirm checkout. Everything else is `unknown`:
 * the payment may or may not have gone through. `retry` marks a server error, a body that is not the
 * route's JSON, or a network failure, where sending the same token once more is worthwhile.
 */
type PaymentAttempt =
  | { outcome: 'paid'; orderCode?: string }
  | { outcome: 'rejected'; error?: string }
  | { outcome: 'unknown'; retry: boolean };

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

/** The response body when it is a JSON object (what the route always sends), otherwise null. */
async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Sends the checkout token with plain fetch, not a React Query mutation: its global retry would
 * replay the request on its own.
 */
async function submitCheckoutToken(checkoutToken: string): Promise<PaymentAttempt> {
  let response: Response;
  try {
    response = await fetch('/api/checkout/affirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutToken }),
    });
  } catch {
    // Network failure: the request may still have reached the server.
    return { outcome: 'unknown', retry: true };
  }

  const data = await readJsonObject(response);
  if (!data) {
    // A platform or proxy error page (a 504, for example) or a cut-off body, not the route's answer.
    return { outcome: 'unknown', retry: true };
  }
  if (response.status === 200) {
    return { outcome: 'paid', orderCode: typeof data.orderCode === 'string' ? data.orderCode : undefined };
  }
  if (response.status === 400 || response.status === 402) {
    return { outcome: 'rejected', error: typeof data.error === 'string' ? data.error : undefined };
  }
  // 409 (the order is no longer awaiting this payment) and any other status: retry server errors only.
  return { outcome: 'unknown', retry: response.status >= 500 };
}

function validationMessage(validationError: unknown): string {
  const message =
    validationError && typeof validationError === 'object' && 'message' in validationError
      ? (validationError as { message?: unknown }).message
      : undefined;
  return typeof message === 'string' && message.trim() ? message : VALIDATION_FALLBACK_MESSAGE;
}

export function AffirmPayment({ orderCode, promoAmount, onPaid, onBack, onBusyChange }: AffirmPaymentProps) {
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

  // The parent locks the payment method choice while an Affirm attempt is in progress
  const updateBusy = (next: boolean) => {
    busyRef.current = next;
    setBusy(next);
    onBusyChange?.(next);
  };

  const stop = (message: string, tone: 'error' | 'info' = 'error') => {
    updateBusy(false);
    setSubmitting(false);
    setFeedback({ message, tone });
  };

  const goToConfirmation = (confirmationOrderCode: string) => {
    // The order may have left the cart: refresh cart data, then let the confirmation page read the
    // order and show what happened.
    void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    onPaid(confirmationOrderCode);
  };

  const completePayment = async (checkoutToken: string) => {
    let attempt = await submitCheckoutToken(checkoutToken);
    if (attempt.outcome === 'unknown' && attempt.retry) {
      // Authorizing is idempotent per order and token: sending the same token again completes a
      // payment that did not get through, or finds the order already paid.
      attempt = await submitCheckoutToken(checkoutToken);
    }

    if (attempt.outcome === 'rejected') {
      // Declined or not eligible: final for this Affirm checkout; a new attempt opens a new one.
      stop(attempt.error || PAYMENT_FAILED_MESSAGE);
      return;
    }

    // Paid, or still unknown (409: the order changed or was already paid; repeated server or network
    // failures). The confirmation page decides from the real order state; offering another payment
    // method here could charge the customer twice.
    const paidOrderCode = attempt.outcome === 'paid' ? attempt.orderCode : undefined;
    goToConfirmation(paidOrderCode || orderCode);
  };

  const handleContinue = async () => {
    if (busyRef.current) return;
    updateBusy(true);
    setFeedback(null);

    let affirm: Affirm;
    let checkout: Record<string, unknown>;
    try {
      [affirm, checkout] = await Promise.all([
        loadAffirm().catch(() => {
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
      return;
    }

    try {
      affirm.checkout(checkout);
      affirm.checkout.open({
        onSuccess: (result: AffirmCheckoutSuccess) => {
          const checkoutToken = result?.checkout_token ?? result?.checkout_id;
          if (!checkoutToken) {
            console.error('Affirm onSuccess returned no checkout token');
            stop(PAYMENT_FAILED_MESSAGE);
            return;
          }
          setSubmitting(true);
          completePayment(checkoutToken).catch((error: unknown) => {
            console.error('Affirm payment confirmation failed:', error);
            stop(UNKNOWN_OUTCOME_MESSAGE, 'info');
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
        <Button type="button" onClick={handleContinue} disabled={busy} aria-busy={busy} className="flex-1">
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
 * Notice for `?affirm=cancelled`. The checkout object's confirmation and cancel URLs both lead here,
 * and Affirm only uses them if it redirects instead of calling the modal callbacks; nothing is paid
 * from that redirect. The checkout page drops the parameter when the next payment attempt starts.
 * Reads search params, so render it inside <Suspense>.
 */
export function AffirmReturnNotice() {
  const searchParams = useSearchParams();
  if (!getAffirmPublicConfig() || searchParams.get('affirm') !== 'cancelled') return null;

  return (
    <div role="status" className="mb-6 p-4 border rounded-lg bg-amber-50 border-amber-200">
      <p className="text-sm text-amber-800">{NOT_COMPLETED_MESSAGE}</p>
    </div>
  );
}
