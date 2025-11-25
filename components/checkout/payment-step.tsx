'use client';

import { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { PaymentStepProps } from '@/lib/checkout/types';

export function PaymentStep({ clientSecret, orderCode, onPaid, onBack }: PaymentStepProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate clientSecret and orderCode before rendering PaymentElement
  const isValidClientSecret = clientSecret && typeof clientSecret === 'string' && clientSecret.trim() !== '';
  const isValidOrderCode = orderCode && typeof orderCode === 'string' && orderCode.trim() !== '';

  const handlePay = async () => {
    if (!stripe || !elements || !isValidOrderCode) return;
    
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

      // Confirm payment with Stripe
      // El webhook de Vendure (/payments/stripe) manejará la confirmación del pago automáticamente
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/confirmation/${orderCode}`,
        },
      });

      // Si hay error, mostrarlo (Stripe solo llama al callback si NO redirige)
      if (confirmError) {
        setError(confirmError.message || 'Payment failed');
        setPaying(false);
        return;
      }

      // Si llegamos aquí sin error y sin redirección, el pago fue exitoso
      // (esto puede pasar con algunos métodos de pago que no requieren redirección)
      onPaid(orderCode);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment error');
      setPaying(false);
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={paying}>
          Back
        </Button>
        <Button 
          type="button" 
          onClick={handlePay} 
          disabled={!stripe || !elements || paying}
          className="flex-1"
        >
          {paying ? (
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
