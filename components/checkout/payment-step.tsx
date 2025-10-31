'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { PaymentStepProps } from '@/lib/checkout/types';
import { useCart } from '@/contexts/cart-context';

export function PaymentStep({ clientSecret, onPaid, onBack }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { clearCart } = useCart();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    
    setPaying(true);
    setError(null);

    try {
      // Validate payment element inputs
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || 'Payment validation failed');
        setPaying(false);
        return;
      }

      // Confirm payment intent
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setPaying(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        // Complete the order in Vendure
        const completeRes = await fetch('/api/checkout/payment-intent', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        const complete = await completeRes.json();

        if (complete.result?.__typename === 'Order') {
          // Limpiar el carrito usando el contexto después del pago exitoso
          try {
            await clearCart();
            console.log('✅ Cart cleared via context after successful payment');
          } catch (cartError) {
            console.warn('⚠️ Failed to clear cart via context, but payment was successful:', cartError);
            // No bloquear el flujo si falla el clear del carrito
          }
          
          onPaid(complete.result.code);
          return;
        }
        setError(complete.errors?.[0]?.message || 'Failed to complete order');
      } else {
        setError(`Unexpected intent status: ${paymentIntent?.status ?? 'unknown'}`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement  />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          type="button" 
          onClick={handlePay} 
          disabled={!stripe || !elements || paying}
        >
          {paying ? 'Processing...' : 'Pay now'}
          <CreditCard className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
