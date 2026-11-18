'use client';

import { useRef, useState } from 'react';
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

interface AffirmPaymentProps {
  orderCode: string;
  // Order total in cents for "As low as" messaging; omitted when the payment option already shows it
  promoAmount?: number;
  onPaid: (orderCode: string) => void;
  onBack: () => void;
}

interface PaymentAttempt {
  // HTTP status of POST /api/checkout/affirm; a network failure counts as 502 (outcome unknown)
  status: number;
  orderCode?: string;
  error?: string;
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

/**
 * Sends the checkout token with plain fetch, not a React Query mutation: its global retry would
 * replay the request on its own.
 */
async function submitCheckoutToken(checkoutToken: string): Promise<PaymentAttempt> {
  try {
    const response = await fetch('/api/checkout/affirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutToken }),
    });
    const data: { orderCode?: string; error?: string } = await response.json().catch(() => ({}));
    return { status: response.status, orderCode: data.orderCode, error: data.error };
  } catch {
    return { status: 502 };
  }
}

function validationMessage(validationError: unknown): string {
  const message =
    validationError && typeof validationError === 'object' && 'message' in validationError
      ? (validationError as { message?: unknown }).message
      : undefined;
  return typeof message === 'string' && message.trim() ? message : VALIDATION_FALLBACK_MESSAGE;
}

export function AffirmPayment({ orderCode, promoAmount, onPaid, onBack }: AffirmPaymentProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'error' | 'info' } | null>(null);
  // Blocks a second click before the disabled state has rendered.
  const busyRef = useRef(false);

  const stop = (message: string, tone: 'error' | 'info' = 'error') => {
    busyRef.current = false;
    setBusy(false);
    setFeedback({ message, tone });
  };

  const goToConfirmation = (paidOrderCode: string) => {
    // The order has left the cart: refresh cart data, then show the confirmation page.
    void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    onPaid(paidOrderCode);
  };

  const completePayment = async (checkoutToken: string) => {
    let attempt = await submitCheckoutToken(checkoutToken);
    if (attempt.status === 502) {
      // Affirm or the backend did not answer. Authorizing is idempotent per order and token,
      // so one retry with the same token is safe.
      attempt = await submitCheckoutToken(checkoutToken);
    }

    if (attempt.status === 200) {
      goToConfirmation(attempt.orderCode || orderCode);
    } else if (attempt.status === 502 || attempt.status === 409) {
      // Still unknown, or the order is no longer awaiting payment (usually already paid):
      // the confirmation page polls the real order state.
      goToConfirmation(orderCode);
    } else {
      // 400 / 402: declined or not eligible; a new attempt opens a new Affirm checkout.
      stop(attempt.error || PAYMENT_FAILED_MESSAGE);
    }
  };

  const handleContinue = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
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
          completePayment(checkoutToken).catch(() => stop(PAYMENT_FAILED_MESSAGE));
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
        <Button type="button" variant="outline" onClick={onBack} disabled={busy}>
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

function returnNotice(value: string | null): { message: string; isError: boolean } | null {
  switch (value) {
    case 'cancelled':
      return { message: NOT_COMPLETED_MESSAGE, isError: false };
    case 'failed':
      return {
        message: 'We could not complete your payment with Affirm. Please try again or choose another payment method.',
        isError: true,
      };
    case 'check':
      return {
        message:
          'We could not confirm your Affirm payment. It may already have gone through, so please check your email for an order confirmation before paying again.',
        isError: false,
      };
    default:
      return null;
  }
}

/**
 * Notice for `?affirm=cancelled|failed|check`, set when Affirm's redirect fallback sends the customer
 * back to the checkout. Reads search params, so render it inside <Suspense>.
 */
export function AffirmReturnNotice() {
  const searchParams = useSearchParams();
  const notice = getAffirmPublicConfig() ? returnNotice(searchParams.get('affirm')) : null;
  if (!notice) return null;

  return (
    <div
      role={notice.isError ? 'alert' : 'status'}
      className={cn(
        'mb-6 p-4 border rounded-lg',
        notice.isError ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
      )}
    >
      <p className={cn('text-sm', notice.isError ? 'text-red-600' : 'text-amber-800')}>{notice.message}</p>
    </div>
  );
}
