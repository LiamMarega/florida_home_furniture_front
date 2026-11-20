'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShoppingCart,
  Mail,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useAffirmConfig } from '@/hooks/use-affirm-config';
import { useAffirmResume, type AffirmResumeAction } from '@/components/checkout/affirm-resume';

// Order states of a placed order: payment authorized (Affirm captures it a moment later) or settled
const SUCCESS_STATES = ['PaymentAuthorized', 'PaymentSettled', 'PartiallyShipped', 'Shipped', 'PartiallyDelivered', 'Delivered'];
// Stripe redirect statuses after which the card (or other Stripe method) payment is going through
const STRIPE_PAYMENT_IN_PROGRESS = ['succeeded', 'processing'];
// How the backend's Affirm handler says a card payment of the order moved money or may still move it
// (its Error message; Shop API payments expose no private metadata to tell it otherwise).
const CARD_PAYMENT_IN_PROGRESS = /card payment/i;

// The backend places the order once the payment lands (Stripe webhook or reconciliation task,
// Affirm authorization). While the payment is still processing, re-check the order on this interval,
// a bounded number of times: 40 attempts x 3 s = about 2 minutes.
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

interface OrderPayment {
  id: string;
  createdAt?: string;
  state: string;
  errorMessage?: string;
  method: string;
}

interface OrderData {
  id: string;
  code: string;
  state: string;
  totalWithTax: number;
  currencyCode: string;
  customer?: {
    emailAddress: string;
  };
  payments?: OrderPayment[];
}

/**
 * - success: the order is placed
 * - processing: no final payment result yet: no payment, one still being confirmed (an Affirm payment in
 *   the Error state: Affirm busy or unreachable, the order changed meanwhile, a card payment in progress),
 *   or Stripe accepted the payment and its webhook is pending
 * - stalled: still processing after the last automatic re-check
 * - failed: the latest payment was declined while the order still awaits payment
 * - changed: the cart was edited before the payment completed (the order is back in AddingItems)
 * - cancelled: the order was cancelled
 * - signin: the order belongs to an account this session is not signed in to (or a guest order past its
 *   viewing window); nothing about its payment is known here
 * - unknown: the order could not be loaded
 */
type DisplayStatus =
  | 'success'
  | 'processing'
  | 'stalled'
  | 'failed'
  | 'changed'
  | 'cancelled'
  | 'signin'
  | 'unknown';

type OrderResult = { order: OrderData } | { signIn: true } | { error: string };

async function requestOrder(orderCode: string): Promise<OrderResult> {
  try {
    const response = await fetch(`/api/orders/${orderCode}`, {
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      // FORBIDDEN: this session may not read the order. Its state is unknown, so nothing is claimed.
      if (data.requiresAuth) {
        return { signIn: true };
      }
      throw new Error(typeof data.error === 'string' ? data.error : 'Failed to fetch order');
    }

    return { order: data.order };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to fetch order' };
  }
}

/** Orders payments by createdAt, then by id (creation order) when timestamps tie or are missing. */
function comparePayments(a: OrderPayment, b: OrderPayment): number {
  const byTime = Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '');
  if (!Number.isNaN(byTime) && byTime !== 0) {
    return byTime;
  }
  // Vendure's default ids are increasing integers ("9" before "10"); other id strategies compare as text
  if (/^\d+$/.test(a.id) && /^\d+$/.test(b.id) && a.id.length !== b.id.length) {
    return a.id.length - b.id.length;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The most recent payment attempt on the order. */
function latestPayment(payments: OrderPayment[] | undefined): OrderPayment | undefined {
  return payments?.reduce<OrderPayment | undefined>(
    (latest, payment) => (!latest || comparePayments(payment, latest) > 0 ? payment : latest),
    undefined
  );
}

/** The latest payment, when it was declined: final for that attempt, nothing was paid. */
function latestDeclinedPayment(order: OrderData | null): OrderPayment | undefined {
  const latest = latestPayment(order?.payments);
  return latest?.state === 'Declined' ? latest : undefined;
}

/**
 * A card payment of the order is going through: Stripe's redirect says so, or the latest (Affirm) payment
 * was refused because a card payment of the order moved money or may still move it.
 */
function isCardPaymentInProgress(order: OrderData | null, redirectStatus: string | null): boolean {
  if (redirectStatus !== null && STRIPE_PAYMENT_IN_PROGRESS.includes(redirectStatus)) {
    return true;
  }
  const latest = latestPayment(order?.payments);
  return latest?.state === 'Error' && CARD_PAYMENT_IN_PROGRESS.test(latest.errorMessage ?? '');
}

/**
 * The order's real state decides what happened to the payment. Stripe's redirect_status only keeps
 * the page waiting after Stripe accepted a payment (never "failed" then), or reports a failed
 * redirect; it never overrides a placed order.
 */
function getDisplayStatus(
  order: OrderData | null,
  redirectStatus: string | null
): Exclude<DisplayStatus, 'stalled' | 'signin'> {
  const stripePaymentInProgress = redirectStatus !== null && STRIPE_PAYMENT_IN_PROGRESS.includes(redirectStatus);

  if (!order) {
    return stripePaymentInProgress ? 'processing' : 'unknown';
  }
  if (SUCCESS_STATES.includes(order.state)) {
    return 'success';
  }
  if (order.state === 'Cancelled') {
    return 'cancelled';
  }
  if (order.state !== 'ArrangingPayment' && order.state !== 'AddingItems') {
    return 'unknown';
  }
  if (stripePaymentInProgress) {
    // Money may be moving: the Stripe webhook records the payment even if the cart changed meanwhile
    return 'processing';
  }
  if (order.state === 'AddingItems') {
    // The cart was edited before the payment completed: the payment was voided or never made
    return 'changed';
  }
  if (latestDeclinedPayment(order) || redirectStatus === 'failed') {
    return 'failed';
  }
  // No payment yet, or one still being confirmed: a payment in the Error state is not final (the
  // backend's contract for Affirm: busy or unreachable, the order changed meanwhile, a card payment in
  // progress), so the page keeps checking instead of suggesting another payment method.
  return 'processing';
}

/** Why the payment is still being confirmed, when the order says (calm: never "try another method"). */
function paymentNote(
  order: OrderData | null,
  cardPaymentInProgress: boolean,
  affirmMethodCode: string | undefined
): string | null {
  if (cardPaymentInProgress) {
    return "A card payment for this order is being processed. Please don't pay again: we'll confirm your order as soon as it completes.";
  }
  const latest = latestPayment(order?.payments);
  if (latest?.state !== 'Error') {
    return null;
  }
  return latest.method === affirmMethodCode
    ? "We're still confirming your Affirm payment. Please don't start another payment while we check."
    : "We're still confirming your payment. Please don't start another payment while we check.";
}

export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { isAuthenticated, openAuthModal } = useAuth();
  const { affirm } = useAffirmConfig();

  const orderCode = params.orderCode as string;
  const paymentIntent = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signInRequired, setSignInRequired] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [pollAttempts, setPollAttempts] = useState(0);

  // Only the initial load and manual retries show the full-page loader (handleRetry turns it on),
  // so background re-checks refresh the order without swapping out the current view.
  // The setters never change; they are listed so the React Compiler lint can verify this memo.
  const applyOrderResult = useCallback((result: OrderResult) => {
    if ('order' in result) {
      setOrder(result.order);
      setError(null);
      setSignInRequired(false);
    } else if ('signIn' in result) {
      setOrder(null);
      setError(null);
      setSignInRequired(true);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [setOrder, setError, setSignInRequired, setLoading]);

  // Also re-read once the shopper signs in (the "Sign in to view this order" view).
  useEffect(() => {
    let ignore = false;

    const fetchOrder = async () => {
      const result = await requestOrder(orderCode);
      if (!ignore) {
        applyOrderResult(result);
      }
    };

    if (orderCode) {
      fetchOrder();
    }

    return () => {
      ignore = true;
    };
  }, [orderCode, retryCount, isAuthenticated, applyOrderResult]);

  // Re-reads the order in the background and restarts the automatic re-checks.
  const refreshOrder = async () => {
    const result = await requestOrder(orderCode);
    applyOrderResult(result);
    setPollAttempts(0);
  };

  const baseStatus = getDisplayStatus(order, redirectStatus);
  const cardPaymentInProgress = isCardPaymentInProgress(order, redirectStatus);

  // An Affirm token this browser holds for the order but never got a final answer for (a refresh, a closed
  // tab, a lost answer): sent again while the order awaits payment and no card payment decides, dropped
  // once the order is placed, cancelled or changed. Its answer only triggers a re-read: the order decides.
  const resumeAction: AffirmResumeAction =
    !order || signInRequired
      ? 'wait'
      : baseStatus === 'success' || baseStatus === 'cancelled' || baseStatus === 'changed'
        ? 'discard'
        : order.state === 'ArrangingPayment' && !cardPaymentInProgress
          ? 'resume'
          : 'wait';
  const affirmResume = useAffirmResume({
    orderCode,
    action: resumeAction,
    onOutcome: () => {
      void refreshOrder();
    },
  });
  // Affirm refused that token (declined, not eligible): final for it, even when no payment was recorded.
  const resumeRejection =
    affirmResume.outcome?.outcome === 'rejected' && order?.state === 'ArrangingPayment'
      ? affirmResume.outcome.error
      : null;

  let displayStatus: DisplayStatus;
  if (signInRequired) {
    displayStatus = 'signin';
  } else if (resumeRejection && baseStatus === 'processing' && !cardPaymentInProgress) {
    displayStatus = 'failed';
  } else if (baseStatus === 'processing' && pollAttempts >= MAX_POLL_ATTEMPTS && !affirmResume.finishing) {
    // Out of automatic re-checks while still processing: a calm "still confirming" view, never "failed"
    displayStatus = 'stalled';
  } else {
    displayStatus = baseStatus;
  }
  const shouldPoll = !loading && displayStatus === 'processing' && !affirmResume.finishing;
  const note = paymentNote(order, cardPaymentInProgress, affirm?.methodCode);

  // While the payment is processing, re-check the order until it reaches a final state or the
  // attempts run out. Each check is scheduled only after the previous one finished, so requests
  // never overlap. On unmount or a manual retry the pending timer is cleared and any in-flight
  // result is dropped.
  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await requestOrder(orderCode);
      if (!cancelled) {
        applyOrderResult(result);
        setPollAttempts(prev => prev + 1);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [shouldPoll, pollAttempts, orderCode, applyOrderResult]);

  const handleRetry = () => {
    // A stored Affirm token that never got an answer is sent again first; its answer re-reads the order.
    if (
      affirmResume.hasPendingToken &&
      order?.state === 'ArrangingPayment' &&
      !cardPaymentInProgress &&
      affirmResume.resend()
    ) {
      setPollAttempts(0);
      return;
    }
    setLoading(true);
    setPollAttempts(0);
    setRetryCount(prev => prev + 1);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Verifying your order...
            </h1>
            <p className="text-brand-dark-blue/70">
              Please wait while we confirm your payment.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  // This session may not read the order (FORBIDDEN): neutral, since its state is unknown here
  if (displayStatus === 'signin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <LogIn className="w-12 h-12 text-gray-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Sign In to View This Order
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              For your security, order details are only shown to the account that placed the order.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
              <p className="text-2xl font-bold text-brand-primary">{orderCode}</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                Checked out as a guest? Your order confirmation email has the details of this order.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={() => openAuthModal('login')} size="lg">
                  Sign In
                </Button>
                <Button onClick={handleRetry} variant="outline" size="lg">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (displayStatus === 'success') {
    // Affirm orders arrive here without Stripe's payment_intent / redirect_status params
    const paidWithAffirm =
      !!affirm &&
      order?.payments?.some(
        p => p.method === affirm.methodCode && (p.state === 'Settled' || p.state === 'Authorized')
      );

    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Order Confirmed!
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              Thank you for your purchase. Your order has been confirmed and will be processed shortly.
            </p>

            <div className="bg-brand-cream/30 rounded-lg p-6 mb-8">
              <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
              <p className="text-2xl font-bold text-brand-primary">{orderCode}</p>
              {order?.state && (
                <>
                  <p className="text-sm text-brand-dark-blue/60 mt-4 mb-2">Order Status</p>
                  <p className="text-sm font-medium text-green-600">{order.state}</p>
                </>
              )}
              {paymentIntent && (
                <>
                  <p className="text-sm text-brand-dark-blue/60 mt-4 mb-2">Payment ID</p>
                  <p className="text-sm font-mono text-brand-dark-blue/80">{paymentIntent}</p>
                </>
              )}
              {paidWithAffirm && (
                <>
                  <p className="text-sm text-brand-dark-blue/60 mt-4 mb-2">Payment Method</p>
                  <p className="text-sm font-medium text-brand-dark-blue/80">Paid with Affirm</p>
                </>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                A confirmation email has been sent to your email address with order details.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline" size="lg">
                  <Link href="/">
                    Continue Shopping
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Processing state (payment pending)
  if (displayStatus === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                {affirmResume.finishing ? (
                  <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
                ) : (
                  <Clock className="w-12 h-12 text-yellow-600" />
                )}
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              {affirmResume.finishing ? 'Finishing your Affirm payment…' : 'Payment Processing'}
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              {affirmResume.finishing
                ? 'Please keep this page open while we confirm your payment with Affirm.'
                : 'Your payment is being processed. This may take a few moments.'}
            </p>

            {note && !affirmResume.finishing && (
              <p role="status" className="text-sm text-brand-dark-blue/80 bg-yellow-50 rounded-lg p-4 mb-8">
                {note}
              </p>
            )}

            <div className="bg-yellow-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
              <p className="text-2xl font-bold text-brand-primary">{orderCode}</p>
              {order?.state && (
                <>
                  <p className="text-sm text-brand-dark-blue/60 mt-4 mb-2">Current Status</p>
                  <p className="text-sm font-medium text-yellow-600">{order.state}</p>
                </>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                Please do not close this page. You will receive a confirmation email once the payment is complete.
              </p>

              <Button onClick={handleRetry} variant="outline" size="lg" disabled={affirmResume.finishing}>
                <RefreshCw className="w-5 h-5 mr-2" />
                Check Status
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Still processing after the automatic re-checks: the payment may still land, so do not suggest paying again
  if (displayStatus === 'stalled') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Still Confirming Your Payment
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              This is taking longer than usual. Please check your email for an order confirmation before
              paying again.
            </p>

            {note && (
              <p role="status" className="text-sm text-brand-dark-blue/80 bg-yellow-50 rounded-lg p-4 mb-8">
                {note}
              </p>
            )}

            <div className="bg-yellow-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
              <p className="text-2xl font-bold text-brand-primary">{orderCode}</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                No email after a few minutes? Contact us with your order number and we will check it for you.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={handleRetry} variant="outline" size="lg">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Check Status
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact">
                    <Mail className="w-5 h-5 mr-2" />
                    Contact Us
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // The latest payment attempt was declined: the order still awaits payment
  if (displayStatus === 'failed') {
    const paymentError = resumeRejection ?? latestDeclinedPayment(order)?.errorMessage;

    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Payment Not Completed
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              Your payment did not go through, so this order has not been placed.
            </p>

            <div className="bg-red-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
              <p className="text-xl font-bold text-brand-primary">{orderCode}</p>
              {paymentError && (
                <>
                  <p className="text-sm text-brand-dark-blue/60 mt-4 mb-2">Error Details</p>
                  <p className="text-sm text-red-600">{paymentError}</p>
                </>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                You can go back to checkout to try again.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/checkout">
                    Back to Checkout
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/">
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // The cart was edited before the payment completed, so the order went back to the cart
  if (displayStatus === 'changed') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-12 h-12 text-amber-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Your Order Changed
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              Your order changed before the payment completed. Nothing was charged.
            </p>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                Please review your cart and check out again.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/cart">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Review Your Cart
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Cancelled order
  if (displayStatus === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 w-full">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <XCircle className="w-12 h-12 text-gray-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Order Cancelled
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              This order has been cancelled.
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
              <p className="text-2xl font-bold text-brand-primary">{orderCode}</p>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-brand-dark-blue/70">
                If you have any questions about this order, please contact us.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline" size="lg">
                  <Link href="/contact">
                    <Mail className="w-5 h-5 mr-2" />
                    Contact Us
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/">
                    Continue Shopping
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Unknown/Error state
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 w-full">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-gray-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
            Order Status Unknown
          </h1>

          <p className="text-lg text-brand-dark-blue/70 mb-8">
            {error || 'We could not retrieve your order information.'}
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <p className="text-sm text-brand-dark-blue/60 mb-2">Order Number</p>
            <p className="text-2xl font-bold text-brand-primary">{orderCode}</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-brand-dark-blue/70">
              If you completed the payment, please check your email for confirmation or contact our support team.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleRetry} variant="outline" size="lg">
                <RefreshCw className="w-5 h-5 mr-2" />
                Retry
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">
                  Continue Shopping
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
