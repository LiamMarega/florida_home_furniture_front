// app/api/checkout/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fetchGraphQL } from '@/lib/vendure-server';
import {
  GET_ACTIVE_ORDER_FOR_PAYMENT,
  TRANSITION_TO_ARRANGING,
  ADD_PAYMENT_TO_ORDER,
} from '@/lib/graphql/queries';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: '2024-06-20',
});

type CreateBody = { reusePaymentIntentId?: string };
type CompleteBody = { paymentIntentId: string };

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * POST -> Crea (o reutiliza) un PaymentIntent de Stripe para la Active Order y
 *         transiciona la orden a ArrangingPayment.
 * Body (opcional):
 *   { reusePaymentIntentId?: string }  // para reintentos
 */
export async function POST(req: NextRequest) {
  // 1) Obtener Active Order
  const orderRes = await fetchGraphQL({ query: GET_ACTIVE_ORDER_FOR_PAYMENT }, { req });
  if (orderRes.errors) return NextResponse.json({ errors: orderRes.errors }, { status: 400 });
  const order = orderRes.data?.activeOrder;
  if (!order) return bad('NoActiveOrder: agrega items al carrito antes de pagar.', 409);

  // 2) Transicionar a ArrangingPayment (si corresponde)
  if (order.state === 'AddingItems') {
    const t = await fetchGraphQL({ query: TRANSITION_TO_ARRANGING }, { req });
    const tr = t.data?.transitionOrderToState;
    if (tr?.__typename !== 'Order') {
      return NextResponse.json({ result: tr, info: 'No se pudo transicionar a ArrangingPayment' }, { status: 409 });
    }
  }

  // 3) Crear o reutilizar PaymentIntent en Stripe
  const currency = (order.currencyCode || 'USD').toLowerCase(); // Stripe usa lowercase
  const amount = order.totalWithTax as number; // Vendure: minor units (centavos) ✔️ :contentReference[oaicite:5]{index=5}

  const body = (await req.json().catch(() => ({}))) as CreateBody;
  let pi: Stripe.PaymentIntent;

  if (body?.reusePaymentIntentId) {
    // Reutilizar PI (p.ej. requiere 3DS o reintento)
    pi = await stripe.paymentIntents.retrieve(body.reusePaymentIntentId);
    // Si el monto cambió, actualizá:
    if (pi.amount !== amount || pi.currency !== currency) {
      pi = await stripe.paymentIntents.update(pi.id, { amount, currency });
    }
  } else {
    // Crear PI
    pi = await stripe.paymentIntents.create({
      amount,
      currency,
      // Elements/confirmación en front:
      automatic_payment_methods: { enabled: true },
      receipt_email: order.customer?.emailAddress ?? undefined,
      metadata: {
        vendureOrderId: order.id,
        vendureOrderCode: order.code,
      },
    });
  }

  // 4) Responder con clientSecret
  const res = NextResponse.json({
    paymentIntentId: pi.id,
    clientSecret: pi.client_secret,
    amount: pi.amount,
    currency: pi.currency,
    orderCode: order.code,
  });
  for (const c of orderRes.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}

/**
 * PUT -> Completa el checkout en Vendure registrando el pago
 *        (después de confirmar el PaymentIntent en el front con Stripe.js).
 * Body: { paymentIntentId: string }
 */
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as CompleteBody;
  if (!body.paymentIntentId) return bad('Missing paymentIntentId');

  // (Opcional) validar que el PI está en estado "succeeded" o "requires_capture" según tu flow
  const pi = await stripe.paymentIntents.retrieve(body.paymentIntentId);

  // 1) Registrar el pago en Vendure: addPaymentToOrder
  //    method = code de tu PaymentMethodHandler, en tu caso 'stripe-payment'
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

  if (addRes.errors) return NextResponse.json({ errors: addRes.errors }, { status: 400 });

  const payload = addRes.data?.addPaymentToOrder;
  const res = NextResponse.json({ result: payload, stripeStatus: pi.status });
  for (const c of addRes.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}
