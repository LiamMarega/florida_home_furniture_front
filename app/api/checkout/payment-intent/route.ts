import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER_FOR_PAYMENT } from '@/lib/graphql/queries';
import { TRANSITION_ORDER_TO_STATE, ADD_PAYMENT_TO_ORDER } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

type CreateBody = { reusePaymentIntentId?: string };
type CompleteBody = { paymentIntentId: string };

export async function POST(req: NextRequest) {
  try {
    const orderRes = await fetchGraphQL(
      { query: GET_ACTIVE_ORDER_FOR_PAYMENT },
      { req }
    );

    if (orderRes.errors) {
      return createErrorResponse(
        'Failed to fetch order',
        orderRes.errors[0]?.message || 'Failed to fetch active order',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        orderRes.errors
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
          return createErrorResponse(
            'Failed to transition order',
            'Cannot transition order to payment state',
            HTTP_STATUS.CONFLICT,
            'ORDER_TRANSITION_FAILED',
            transition
          );
        }
        order.state = 'ArrangingPayment';
      }
    }

    const currency = (order.currencyCode || 'USD').toLowerCase();
    const amount = order.totalWithTax as number;
    const body = (await req.json().catch(() => ({}))) as CreateBody;
    let pi: Stripe.PaymentIntent;

    if (body?.reusePaymentIntentId) {
      pi = await stripe.paymentIntents.retrieve(body.reusePaymentIntentId);
      if (pi.amount !== amount || pi.currency !== currency) {
        pi = await stripe.paymentIntents.update(pi.id, { amount, currency });
      }
    } else {
      pi = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        receipt_email: order.customer?.emailAddress ?? undefined,
        metadata: {
          vendureOrderId: order.id,
          vendureOrderCode: order.code,
        },
      });
    }

    const res = NextResponse.json({
      paymentIntentId: pi.id,
      clientSecret: pi.client_secret,
      amount: pi.amount,
      currency: pi.currency,
      orderCode: order.code,
    });

    forwardCookies(res, orderRes);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to create payment intent',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as CompleteBody;

    if (!body.paymentIntentId) {
      return createErrorResponse(
        'Missing paymentIntentId',
        'paymentIntentId is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);

    const addRes = await fetchGraphQL(
      {
        query: ADD_PAYMENT_TO_ORDER,
        variables: {
          input: {
            method: 'stripe-payment',
            metadata: { paymentIntentId: body.paymentIntentId },
          },
        },
      },
      { req }
    );

    if (addRes.errors) {
      return createErrorResponse(
        'Failed to add payment',
        addRes.errors[0]?.message || 'Failed to add payment to order',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.VALIDATION_ERROR,
        addRes.errors
      );
    }

    const payload = addRes.data?.addPaymentToOrder;

    if (payload?.__typename === 'Order') {
      try {
        const clearCartUrl = new URL('/api/cart/clear', req.nextUrl.origin);
        const clearCartRes = await fetch(clearCartUrl.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: req.headers.get('cookie') || '',
          },
        });

        if (clearCartRes.ok) {
          const clearCartCookies = clearCartRes.headers.getSetCookie();
          const res = NextResponse.json({ result: payload, stripeStatus: pi.status });
          forwardCookies(res, addRes);
          clearCartCookies.forEach((cookie) => res.headers.append('Set-Cookie', cookie));
          return res;
        }
      } catch (error) {
        // Payment succeeded, don't fail the request
      }
    }

    const res = NextResponse.json({ result: payload, stripeStatus: pi.status });
    forwardCookies(res, addRes);
    return res;
  } catch (error) {
    return createErrorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Failed to complete payment',
      HTTP_STATUS.INTERNAL_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    );
  }
}