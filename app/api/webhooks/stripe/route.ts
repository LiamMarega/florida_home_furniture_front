// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { gql } from 'graphql-request';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY! /* , { apiVersion: '2024-06-20' } */);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

async function vendureShopFetch<T>(
  query: string,
  variables: Record<string, any>,
  sessionCookie?: string
): Promise<T> {
  const res = await fetch(VENDURE_SHOP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { cookie: `session=${sessionCookie}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join('; '));
  return json.data;
}

const ORDER_BY_CODE = gql`
  query OrderByCode($code: String!) {
    orderByCode(code: $code) { id code state totalWithTax }
  }
`;

const NEXT_STATES = gql`query { nextOrderStates }`;

const TRANSITION_ORDER = gql`
  mutation TransitionOrder($state: String!) {
    transitionOrderToState(state: $state) {
      __typename
      ... on Order { id state }
      ... on ErrorResult { errorCode message }
    }
  }
`;

const ADD_PAYMENT = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      __typename
      ... on Order { id code state payments { id state method amount transactionId } }
      ... on PaymentFailedError { errorCode message paymentErrorMessage }
      ... on PaymentDeclinedError { errorCode message paymentErrorMessage }
      ... on IneligiblePaymentMethodError { errorCode message eligibilityCheckerMessage }
      ... on ErrorResult { errorCode message }
    }
  }
`;

export async function POST(req: NextRequest) {
  // 1) raw body + firma
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig || !webhookSecret) return NextResponse.json({ error: 'Missing signature/secret' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') return NextResponse.json({ received: true });

  const pi = event.data.object as Stripe.PaymentIntent;
  const orderCode = pi.metadata?.orderCode;
  const userSession = pi.metadata?.sessionToken;
  if (!orderCode || !userSession) {
    return NextResponse.json({ error: 'Missing orderCode/sessionToken in metadata' }, { status: 200 });
  }

  try {
    // 2) Traer orden como el cliente
    const data1 = await vendureShopFetch<{ orderByCode: { code: string; state: string; totalWithTax: number } }>(
      ORDER_BY_CODE, { code: orderCode }, userSession
    );
    const order = data1.orderByCode;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 200 });

    // 3) Validar importe
    if (pi.amount !== order.totalWithTax) {
      return NextResponse.json({ error: 'Amount mismatch', expected: order.totalWithTax, received: pi.amount }, { status: 200 });
    }

    // 4) Asegurar ArrangingPayment
    if (order.state === 'AddingItems') {
      const trans = await vendureShopFetch<any>(TRANSITION_ORDER, { state: 'ArrangingPayment' }, userSession);
      if (trans.transitionOrderToState.__typename !== 'Order') {
        return NextResponse.json({ error: 'Cannot transition to ArrangingPayment', reason: trans.transitionOrderToState?.message }, { status: 200 });
      }
    }

    // (Opcional) comprobar que el método es elegible
    // Podríamos consultar eligiblePaymentMethods aquí si quieres mostrar mensajes más claros. :contentReference[oaicite:5]{index=5}

    // 5) Añadir pago -> tu handler devuelve 'Settled' => Order -> PaymentSettled
    const added = await vendureShopFetch<any>(ADD_PAYMENT, {
      input: {
        method: 'stripe-payment',
        metadata: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          public: { paymentIntentId: pi.id },
        },
      },
    }, userSession);

    const result = added.addPaymentToOrder;
    if (result.__typename !== 'Order') {
      return NextResponse.json({ error: 'addPaymentToOrder failed', result }, { status: 200 });
    }

    return NextResponse.json({ success: true, orderCode: result.code, state: result.state, payments: result.payments?.length ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Webhook processing failed', details: err?.message ?? String(err) }, { status: 200 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
