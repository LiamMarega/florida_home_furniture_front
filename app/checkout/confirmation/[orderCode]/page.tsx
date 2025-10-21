'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Package, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/cart-context';

export default function ConfirmationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const [isClearing, setIsClearing] = useState(false);
  
  const orderCode = params.orderCode as string;
  const paymentIntent = searchParams.get('payment_intent');
  const paymentIntentClientSecret = searchParams.get('payment_intent_client_secret');
  const redirectStatus = searchParams.get('redirect_status');

  // Limpiar el carrito cuando llegamos a esta página
  useEffect(() => {
    const cleanupCart = async () => {
      if (isClearing) return;
      
      try {
        setIsClearing(true);
        console.log('🧹 Clearing cart after successful payment...');
        await clearCart();
        console.log('✅ Cart cleared successfully');
      } catch (error) {
        console.error('Error clearing cart:', error);
        // No mostramos error al usuario, solo logueamos
      } finally {
        setIsClearing(false);
      }
    };

    // Solo limpiar si el pago fue exitoso
    if (redirectStatus === 'succeeded') {
      cleanupCart();
    }
  }, [redirectStatus, clearCart, isClearing]);

  const isSuccess = redirectStatus === 'succeeded';

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="p-8 text-center">
          {isSuccess ? (
            <>
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
                    <Link href="/products">
                      Continue Shopping
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Package className="w-12 h-12 text-yellow-600" />
                </div>
              </div>

              <h1 className="text-3xl font-bold text-brand-dark-blue mb-4">
                Payment Processing
              </h1>

              <p className="text-lg text-brand-dark-blue/70 mb-8">
                Your payment is being processed. Please check your email for confirmation.
              </p>

              <Button asChild size="lg">
                <Link href="/products">Return to Shop</Link>
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}