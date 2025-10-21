'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderSummary } from '@/components/checkout/order-summary';
import { Order } from '@/lib/types';
import { useOrderByCode } from '@/hooks/use-orders';
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Mail,
  Package,
  CreditCard,
  AlertCircle,
} from 'lucide-react';

export default function CheckoutConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderCode = params.orderCode as string;
  
  // Stripe redirect params
  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');

  // Use React Query to fetch order
  const { 
    data: order, 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useOrderByCode(orderCode, {
    enabled: !!orderCode,
    retry: redirectStatus !== 'processing' // Don't retry if payment is processing
  });

  const error = queryError?.message || null;

  useEffect(() => {
    if (orderCode) {
      // If payment is pending, poll for updates
      if (redirectStatus === 'processing') {
        const pollInterval = setInterval(() => {
          refetch();
        }, 3000); // Poll every 3 seconds
        
        // Stop polling after 30 seconds
        const timeout = setTimeout(() => {
          clearInterval(pollInterval);
        }, 30000);
        
        return () => {
          clearInterval(pollInterval);
          clearTimeout(timeout);
        };
      }
    }
  }, [orderCode, redirectStatus, refetch]);

  // Handle special case for completed orders that require auth
  const displayOrder = useMemo(() => {
    if (order) return order;
    
    // If we have a successful payment but no order data, create a minimal order for display
    if (redirectStatus === 'succeeded' && error?.includes('requires authentication')) {
      return {
        code: orderCode,
        state: 'PaymentSettled',
        customer: { emailAddress: '' },
        payments: [{ state: 'Settled' }]
      } as Order;
    }
    
    return null;
  }, [order, redirectStatus, error, orderCode]);

  const getPaymentStatus = () => {
    console.log('🔍 Checking payment status...');
    console.log('📊 Stripe redirect status:', redirectStatus);
    console.log('📊 Order payments:', displayOrder?.payments);

    // Check Stripe redirect status first
    if (redirectStatus === 'succeeded') {
      console.log('✅ Payment succeeded per Stripe redirect');
      return 'succeeded';
    }

    if (redirectStatus === 'processing') {
      console.log('⏳ Payment processing per Stripe redirect');
      return 'processing';
    }

    if (redirectStatus === 'requires_payment_method') {
      console.log('❌ Payment failed per Stripe redirect');
      return 'failed';
    }

    // Then check order payment state
    if (displayOrder?.payments && displayOrder.payments.length > 0) {
      const lastPayment = displayOrder.payments[displayOrder.payments.length - 1];
      const state = lastPayment.state?.toLowerCase();
      console.log('💳 Last payment state:', state);
      return state;
    }

    console.log('❓ Payment status unknown');
    return 'unknown';
  };

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-primary mx-auto mb-4"></div>
          <p className="text-brand-dark-blue/60 text-lg">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !displayOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-brand-dark-blue mb-4">Order Not Found</h1>
            <p className="text-brand-dark-blue/70 mb-6">
              {error || 'We could not find the order you are looking for.'}
            </p>
            <Button asChild>
              <Link href="/">Return to Home</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const paymentStatus = getPaymentStatus();
  const isSuccess = paymentStatus === 'succeeded' || paymentStatus === 'settled';
  const isPending = paymentStatus === 'pending' || paymentStatus === 'authorized' || paymentStatus === 'processing';
  const isFailed = paymentStatus === 'failed' || paymentStatus === 'declined' || paymentStatus === 'error' || paymentStatus === 'cancelled';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success State */}
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="p-8 mb-8">
              <div className="text-center mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                </motion.div>
                
                <h1 className="text-4xl font-bold text-brand-dark-blue mb-2 font-tango-sans">
                  Order Confirmed!
                </h1>
                
                <p className="text-xl text-brand-dark-blue/70 mb-4">
                  Thank you for your purchase
                </p>

                <div className="inline-block bg-brand-cream px-6 py-2 rounded-full">
                  <span className="text-sm text-brand-dark-blue/70">Order Number:</span>
                  <span className="font-mono font-bold text-brand-dark-blue ml-2">
                    #{displayOrder.code}
                  </span>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-brand-dark-blue mb-1">
                      Confirmation Email Sent
                    </h3>
                    <p className="text-sm text-brand-dark-blue/70">
                      {displayOrder.customer?.emailAddress ? (
                        <>
                          We&apos;ve sent a confirmation email to{' '}
                          <strong>{displayOrder.customer.emailAddress}</strong> with your order details.
                        </>
                      ) : (
                        <>
                          A confirmation email has been sent with your order details. 
                          Please check your inbox for order #{displayOrder.code}.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
                  <Package className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-brand-dark-blue mb-1">
                      Order Processing
                    </h3>
                    <p className="text-sm text-brand-dark-blue/70">
                      Your order is being prepared for shipment. You&apos;ll receive tracking
                      information once it ships.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-brand-dark-blue mb-1">Payment Confirmed</h3>
                    <p className="text-sm text-brand-dark-blue/70">
                      {displayOrder.totalWithTax && displayOrder.currencyCode ? (
                        <>
                          Your payment of{' '}
                          <strong>{formatPrice(displayOrder.totalWithTax, displayOrder.currencyCode)}</strong> has been
                          successfully processed.
                        </>
                      ) : (
                        <>
                          Your payment has been successfully processed. Thank you for your order!
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild className="flex-1">
                  <Link href="/">
                    Continue Shopping
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                {displayOrder.customer?.emailAddress && (
                  <Button asChild variant="outline" className="flex-1 text-sm">
                    <Link href="/">Check your email for order details</Link>
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pending State */}
        {isPending && (
          <Card className="p-8 mb-8">
            <div className="text-center mb-6">
              <Clock className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-brand-dark-blue mb-2 font-tango-sans">
                Payment Pending
              </h1>
              <p className="text-xl text-brand-dark-blue/70 mb-4">
                Your order is being processed
              </p>
              <div className="inline-block bg-brand-cream px-6 py-2 rounded-full">
                <span className="text-sm text-brand-dark-blue/70">Order Number:</span>
                <span className="font-mono font-bold text-brand-dark-blue ml-2">
                  #{order.code}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-brand-dark-blue mb-1">
                    Payment Authorization
                  </h3>
                  <p className="text-sm text-brand-dark-blue/70">
                    Your payment is being authorized. This usually takes a few moments. You&apos;ll
                    receive a confirmation email once the payment is complete.
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={loadOrder} variant="outline" className="flex-1">
                Refresh Status
              </Button>
              <Button asChild className="flex-1">
                <Link href="/">Return to Home</Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Failed State */}
        {isFailed && (
          <Card className="p-8 mb-8">
            <div className="text-center mb-6">
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h1 className="text-4xl font-bold text-brand-dark-blue mb-2 font-tango-sans">
                Payment Failed
              </h1>
              <p className="text-xl text-brand-dark-blue/70 mb-4">
                We couldn&apos;t process your payment
              </p>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-brand-dark-blue mb-1">Payment Error</h3>
                  <p className="text-sm text-brand-dark-blue/70">
                    Your payment could not be processed. Please check your payment information and
                    try again, or contact your bank for more information.
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="flex-1">
                <Link href="/checkout">Try Again</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/cart">View Cart</Link>
              </Button>
            </div>
          </Card>
        )}

        {/* Order Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          {displayOrder.lines && displayOrder.lines.length > 0 ? (
            <div>
              <OrderSummary order={displayOrder} />
            </div>
          ) : (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-brand-dark-blue mb-4">Order Summary</h3>
              <div className="text-center py-8">
                <Package className="w-16 h-16 text-brand-primary/30 mx-auto mb-4" />
                <p className="text-brand-dark-blue/70">
                  Order details are being processed. Please check your email for complete order information.
                </p>
              </div>
            </Card>
          )}

          <div className="space-y-6">
            {/* Shipping Information */}
            {displayOrder.shippingAddress ? (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-brand-dark-blue mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Shipping Information
                </h3>
                <div className="text-sm text-brand-dark-blue/80 space-y-1">
                  <div className="font-medium">{displayOrder.shippingAddress.fullName}</div>
                  <div>{displayOrder.shippingAddress.streetLine1}</div>
                  {displayOrder.shippingAddress.streetLine2 && (
                    <div>{displayOrder.shippingAddress.streetLine2}</div>
                  )}
                  <div>
                    {displayOrder.shippingAddress.city}, {displayOrder.shippingAddress.province}{' '}
                    {displayOrder.shippingAddress.postalCode}
                  </div>
                  <div>{displayOrder.shippingAddress.country}</div>
                  {displayOrder.shippingAddress.phoneNumber && (
                    <div className="mt-2 pt-2 border-t">
                      📞 {displayOrder.shippingAddress.phoneNumber}
                    </div>
                  )}
                </div>
              </Card>
            ) : null}

            {/* Customer Support */}
            <Card className="p-6 bg-brand-cream/30">
              <h3 className="text-lg font-semibold text-brand-dark-blue mb-3">Need Help?</h3>
              <p className="text-sm text-brand-dark-blue/70 mb-4">
                If you have any questions about your order, please don&apos;t hesitate to contact us.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-primary" />
                  <a
                    href="mailto:support@floridahomefurniture.com"
                    className="text-brand-primary hover:underline"
                  >
                    support@floridahomefurniture.com
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

