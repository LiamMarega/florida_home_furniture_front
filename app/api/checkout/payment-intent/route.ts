import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER_FOR_PAYMENT, GET_ELIGIBLE_PAYMENT_METHODS } from '@/lib/graphql/queries';
import { TRANSITION_ORDER_TO_STATE, CREATE_STRIPE_PAYMENT_INTENT } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';
import { findAffirmPaymentMethod } from '@/lib/affirm';
import { getAffirmConfig } from '@/lib/affirm-config';
import type { EligiblePaymentMethod } from '@/lib/checkout/types';

// Error bodies carry a readable `message` for the shopper; backend error details stay in the server logs.
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar que existe una orden activa
    const orderRes = await fetchGraphQL(
      { query: GET_ACTIVE_ORDER_FOR_PAYMENT },
      { req }
    );

    if (orderRes.errors) {
      console.error('Failed to fetch the active order for payment:', orderRes.errors[0]?.message);
      return createErrorResponse(
        'Failed to fetch order',
        'We could not load your order. Please refresh the page and try again.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const order = orderRes.data?.activeOrder;
    if (!order) {
      return createErrorResponse(
        'No active order',
        'Add items to cart before payment',
        HTTP_STATUS.CONFLICT,
        'NO_ACTIVE_ORDER'
      );
    }

    // 2. Asegurar que la orden esté en estado ArrangingPayment
    if (order.state !== 'ArrangingPayment') {
      const transitionRes = await fetchGraphQL(
        { query: TRANSITION_ORDER_TO_STATE, variables: { state: 'ArrangingPayment' } },
        { req }
      );

      const transition = transitionRes.data?.transitionOrderToState;

      if (transition?.__typename === 'Order') {
        order.state = transition.state;
      } else if (transition?.__typename === 'OrderStateTransitionError') {
        if (!transition.transitionError?.includes('from "ArrangingPayment" to "ArrangingPayment"')) {
          console.error('Order not ready for payment:', transition.transitionError);
          return createErrorResponse(
            'Failed to transition order',
            typeof transition.transitionError === 'string' && transition.transitionError.trim()
              ? `Your order is not ready for payment: ${transition.transitionError}`
              : 'Your order is not ready for payment. Please review it and try again.',
            HTTP_STATUS.CONFLICT,
            'ORDER_TRANSITION_FAILED'
          );
        }
        order.state = 'ArrangingPayment';
      }
    }

    // 3. Payment methods enabled for the order (Stripe, Affirm, ...). Not blocking: if this query
    // fails, checkout continues with the card payment exactly as before.
    const paymentMethodsRes = await fetchGraphQL<{ eligiblePaymentMethods?: EligiblePaymentMethod[] }>(
      { query: GET_ELIGIBLE_PAYMENT_METHODS },
      { req }
    );
    if (paymentMethodsRes.errors) {
      console.error('Failed to load eligible payment methods:', paymentMethodsRes.errors[0]?.message);
    }
    const paymentMethods = paymentMethodsRes.data?.eligiblePaymentMethods ?? [];
    // With an eligible Affirm method (the channel's affirmConfig names its code), a failed
    // PaymentIntent no longer blocks checkout.
    const affirmConfig = await getAffirmConfig();
    const affirmAvailable =
      affirmConfig.ok && findAffirmPaymentMethod(paymentMethods, affirmConfig.config)?.isEligible === true;

    // 4. Crear PaymentIntent usando la mutación de Vendure (StripePlugin)
    // El StripePlugin maneja la creación del PaymentIntent con los metadatos correctos
    // y el webhook de Vendure (/payments/stripe) manejará la confirmación del pago
    const paymentIntentRes = await fetchGraphQL(
      { query: CREATE_STRIPE_PAYMENT_INTENT },
      { req }
    );

    if (paymentIntentRes.errors && !affirmAvailable) {
      console.error('Failed to create the Stripe PaymentIntent:', paymentIntentRes.errors[0]?.message);
      return createErrorResponse(
        'Failed to create payment intent',
        'We could not start the card payment. Please try again in a moment.',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const clientSecret: string | null = paymentIntentRes.data?.createStripePaymentIntent ?? null;

    if (!clientSecret && !affirmAvailable) {
      return createErrorResponse(
        'No client secret',
        'We could not start the card payment. Please try again in a moment.',
        HTTP_STATUS.INTERNAL_ERROR,
        ERROR_CODES.INTERNAL_ERROR
      );
    }

    if (!clientSecret) {
      console.error(
        'Stripe PaymentIntent unavailable, offering Affirm only:',
        paymentIntentRes.errors?.[0]?.message ?? 'no client secret'
      );
    }

    const res = NextResponse.json({
      clientSecret,
      orderCode: order.code,
      paymentMethods,
    });

    forwardCookies(res, orderRes);
    forwardCookies(res, paymentMethodsRes);
    forwardCookies(res, paymentIntentRes);
    return res;
  } catch (error) {
    console.error('Payment intent route failed:', error instanceof Error ? error.message : error);
    return createErrorResponse(
      'Internal server error',
      'We could not start the payment. Please try again in a moment.',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}
