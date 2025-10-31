// En tu archivo hooks/use-checkout.ts

import { useMutation } from "@tanstack/react-query";

// Modificar el hook useCreatePaymentIntent para incluir el email

export function useCreatePaymentIntent() {
    return useMutation({
      mutationFn: async ({ 
        orderCode, 
        timestamp, 
        forceNew,
        emailAddress // 🔑 NUEVO: pasar el email explícitamente
      }: { 
        orderCode: string; 
        timestamp?: number; 
        forceNew?: boolean;
        emailAddress?: string; // 🔑 NUEVO
      }) => {
        console.log('💳 Creating payment intent...', { orderCode, emailAddress });
        
        const response = await fetch('/api/checkout/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // 🔑 IMPORTANTE: Enviar cookies
          body: JSON.stringify({ 
            orderCode, 
            timestamp, 
            forceNew,
            emailAddress, // 🔑 NUEVO: pasar el email en el body
          }),
        });
  
        if (!response.ok) {
          const error = await response.json();
          console.error('❌ Payment intent error:', error);
          throw new Error(error.details || error.error || 'Failed to create payment intent');
        }
  
        const data = await response.json();
        console.log('✅ Payment intent created:', data);
        return data;
      },
    });
  }