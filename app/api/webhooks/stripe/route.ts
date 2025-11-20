// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const VENDURE_ADMIN_API = process.env.VENDURE_SHOP_API_URL?.replace('shop-api', 'admin-api') || 'http://localhost:3000/admin-api';

// Admin GraphQL Queries
const LOGIN_ADMIN = `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      ... on CurrentUser { id }
    }
  }
`;

const GET_ORDER_ADMIN = `
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      code
      state
      totalWithTax
    }
  }
`;

const TRANSITION_ORDER_ADMIN = `
  mutation TransitionOrder($id: ID!, $state: String!) {
    transitionOrderToState(id: $id, state: $state) {
      ... on Order { state }
      ... on OrderStateTransitionError { message }
    }
  }
`;

const ADD_PAYMENT_ADMIN = `
  mutation AddPayment($orderId: ID!, $input: PaymentInput!) {
    addPaymentToOrder(orderId: $orderId, input: $input) {
      ... on Order { state code }
      ... on ErrorResult { errorCode message }
    }
  }
`;

async function adminFetch<T>(query: string, variables: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(VENDURE_ADMIN_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  
  const json = await res.json();
  if (json.errors) {
    console.error('Admin API Error:', JSON.stringify(json.errors));
    throw new Error(json.errors[0].message);
  }
  return { data: json.data as T, token: res.headers.get('vendure-auth-token') };
}

async function getAdminToken() {
  const username = process.env.SUPERADMIN_USERNAME;
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!username || !password) throw new Error('Missing superadmin credentials');

  const { token } = await adminFetch<any>(LOGIN_ADMIN, { username, password });
  return token;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature/secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ received: true });
  }

  const pi = event.data.object as Stripe.PaymentIntent;
  const vendureOrderId = pi.metadata?.vendureOrderId;
  
  // If vendureOrderId is missing, we can't reliably find the order by ID in Admin API
  // (unless we search by code, but ID is safer).
  // Fallback to orderCode if ID missing?
  const vendureOrderCode = pi.metadata?.vendureOrderCode || pi.metadata?.orderCode;

  if (!vendureOrderId && !vendureOrderCode) {
    console.error('Webhook: Missing vendureOrderId/Code in metadata');
    return NextResponse.json({ error: 'Missing metadata' }, { status: 200 });
  }

  try {
    // 1. Login to Admin API
    const adminToken = await getAdminToken();
    if (!adminToken) throw new Error('Failed to login as admin');

    let order: any;
    
    // 2. Fetch Order
    if (vendureOrderId) {
      const res = await adminFetch<any>(GET_ORDER_ADMIN, { id: vendureOrderId }, adminToken);
      order = res.data.order;
    } else {
      // Fallback: search by code not implemented here for brevity, but highly recommended to pass ID
      throw new Error('vendureOrderId missing in metadata');
    }

    if (!order) {
      console.error(`Webhook: Order ${vendureOrderId} not found`);
      return NextResponse.json({ error: 'Order not found' }, { status: 200 });
    }

    // 3. Validate Amount
    if (pi.amount !== order.totalWithTax) {
      console.warn(`Webhook: Amount mismatch. Order: ${order.totalWithTax}, PI: ${pi.amount}`);
      // Continue? Or fail? Standard Stripe plugin sometimes allows mismatch if configured.
      // For now, return error to log it.
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 200 });
    }

    // 4. Ensure State
    if (order.state === 'AddingItems') {
      const tRes = await adminFetch<any>(TRANSITION_ORDER_ADMIN, { id: order.id, state: 'ArrangingPayment' }, adminToken);
      if (tRes.data.transitionOrderToState?.message) {
        throw new Error(tRes.data.transitionOrderToState.message);
      }
    }

    // 5. Add Payment
    const addRes = await adminFetch<any>(ADD_PAYMENT_ADMIN, {
      orderId: order.id,
      input: {
        method: 'stripe', // Must match Vendure Payment Method Code
        metadata: {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          public: { paymentIntentId: pi.id },
        }
      }
    }, adminToken);

    const result = addRes.data.addPaymentToOrder;
    if (result.errorCode) {
      throw new Error(`AddPayment failed: ${result.message}`);
    }

    console.log(`✅ Webhook: Payment added to order ${order.code}`);
    return NextResponse.json({ success: true, state: result.state });

  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 200 }); // 200 to stop Stripe retries if logic error
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
