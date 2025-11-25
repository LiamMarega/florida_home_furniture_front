'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

// Order states that indicate successful payment
const SUCCESS_STATES = ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'PartiallyShipped', 'Delivered', 'PartiallyDelivered'];
// Order states that indicate pending payment
const PENDING_STATES = ['ArrangingPayment', 'AddingItems'];
// Order states that indicate cancelled/failed
const FAILED_STATES = ['Cancelled'];

interface OrderData {
  id: string;
  code: string;
  state: string;
  totalWithTax: number;
  currencyCode: string;
  customer?: {
    emailAddress: string;
  };
  payments?: Array<{
    id: string;
    state: string;
    errorMessage?: string;
    method: string;
  }>;
}

export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const orderCode = params.orderCode as string;
  const paymentIntent = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${orderCode}`, {
          credentials: 'include',
        });

        const data = await response.json();

        if (!response.ok) {
          // If order requires auth, show a specific message
          if (data.requiresAuth) {
            setError('Order completed successfully. Please check your email for confirmation details.');
            return;
          }
          throw new Error(data.error || 'Failed to fetch order');
        }

        setOrder(data.order);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch order');
      } finally {
        setLoading(false);
      }
    };

    if (orderCode) {
      fetchOrder();
    }
  }, [orderCode, retryCount]);

  // Determine the display status based on order state and Stripe redirect status
  const getDisplayStatus = () => {
    // If Stripe indicates payment failed
    if (redirectStatus === 'failed') {
      return 'failed';
    }

    // If we couldn't fetch the order but Stripe says succeeded
    if (!order && redirectStatus === 'succeeded') {
      return 'processing';
    }

    if (!order) {
      return 'unknown';
    }

    // Check order state
    if (SUCCESS_STATES.includes(order.state)) {
      return 'success';
    }
    
    if (PENDING_STATES.includes(order.state)) {
      // Check if there's a payment error
      const failedPayment = order.payments?.find(p => p.state === 'Error' || p.state === 'Declined');
      if (failedPayment) {
        return 'failed';
      }
      // Payment is still processing
      return 'processing';
    }

    if (FAILED_STATES.includes(order.state)) {
      return 'failed';
    }

    return 'unknown';
  };

  const displayStatus = getDisplayStatus();

  const handleRetry = () => {
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

  // Success state
  if (displayStatus === 'success') {
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
                <Clock className="w-12 h-12 text-yellow-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">
              Payment Processing
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              Your payment is being processed. This may take a few moments.
            </p>

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

              <Button onClick={handleRetry} variant="outline" size="lg">
                <RefreshCw className="w-5 h-5 mr-2" />
                Check Status
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Failed state
  if (displayStatus === 'failed') {
    const paymentError = order?.payments?.find(p => p.state === 'Error' || p.state === 'Declined')?.errorMessage;
    
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
              Payment Failed
            </h1>

            <p className="text-lg text-brand-dark-blue/70 mb-8">
              Unfortunately, your payment could not be processed.
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
                Please try again or contact our support team for assistance.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/checkout">
                    Try Again
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
