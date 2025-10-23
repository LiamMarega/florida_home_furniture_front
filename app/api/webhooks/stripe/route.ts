// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fetchGraphQL } from '@/lib/vendure-server';
import { gql } from 'graphql-request';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Mutation para agregar el pago a la orden en Vendure
const ADD_PAYMENT_TO_ORDER = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        payments {
          id
          state
          method
          amount
          transactionId
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  console.log('🎯 Webhook endpoint hit!');
  console.log('🔐 Webhook secret configured:', !!webhookSecret);
  console.log('🔑 Webhook secret length:', webhookSecret?.length || 0);
  
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No Stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log('📨 Stripe webhook event received:', {
    type: event.type,
    id: event.id,
  });

  // ℹ️ Ignorar eventos que no son payment_intent.succeeded
  if (event.type !== 'payment_intent.succeeded') {
    console.log(`ℹ️ Ignoring event type: ${event.type} - waiting for payment_intent.succeeded`);
    return NextResponse.json({ 
      received: true,
      message: `Event ${event.type} received but not processed (waiting for payment success)`
    });
  }

  // ✅ Procesar pago exitoso
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  console.log('✅ Payment succeeded:', {
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata,
    status: paymentIntent.status,
  });

  const { orderCode } = paymentIntent.metadata;

  if (!orderCode) {
    console.error('❌ No orderCode in payment metadata');
    console.error('Available metadata:', paymentIntent.metadata);
    return NextResponse.json({ 
      error: 'No order code',
      received: true 
    }, { status: 200 });
  }

  console.log('🔍 Processing order:', orderCode);

  try {
    // 🔑 NUEVA ESTRATEGIA: Recuperar el sessionToken de la metadata de Stripe
    const sessionToken = paymentIntent.metadata.sessionToken;

    if (!sessionToken) {
      console.error('❌ No session token found in Stripe metadata for order:', orderCode);
      console.error('⚠️ Cannot complete order without session token');
      console.error('Available metadata:', paymentIntent.metadata);
      return NextResponse.json({ 
        error: 'Session expired',
        received: true,
        suggestion: 'Session token not found in payment metadata'
      }, { status: 200 });
    }

    console.log('🔑 Found session token in Stripe metadata for order:', orderCode);

    // Buscar la orden por código (no usar activeOrder)
    console.log('🔍 Fetching order by code...');
    const GET_ORDER_BY_CODE = gql`
      query GetOrderByCode($code: String!) {
        orderByCode(code: $code) {
          id
          code
          state
          totalWithTax
          customer {
            id
            emailAddress
          }
        }
      }
    `;

    const orderRes = await fetchGraphQL({
      query: GET_ORDER_BY_CODE,
      variables: { code: orderCode },
    }, {
      cookie: `session=${sessionToken}`, // 🔑 Formato correcto de Vendure
    });

    const order = orderRes.data?.orderByCode;

    if (!order) {
      console.error('❌ Order not found:', orderCode);
      console.error('Tried with session token:', sessionToken.substring(0, 20) + '...');
      return NextResponse.json({ 
        error: 'Order not found',
        received: true,
      }, { status: 200 });
    }

    console.log('✅ Order found:', {
      orderCode: order.code,
      state: order.state,
      total: order.totalWithTax,
      customerId: order.customer?.id,
    });

    // Agregar el pago directamente - esto manejará la transición de estado
    console.log('💳 Adding payment to Vendure order...');
    
    const paymentRes = await fetchGraphQL({
      query: ADD_PAYMENT_TO_ORDER,
      variables: {
        input: {
          method: 'stripe-payment',
          metadata: {
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
          },
        },
      },
    }, {
      cookie: `session=${sessionToken}`, // 🔑 Formato correcto de Vendure
    });

    console.log('📊 Payment addition response:', JSON.stringify(paymentRes.data, null, 2));

    const result = paymentRes.data?.addPaymentToOrder;

    if (result?.errorCode) {
      console.error('❌ Error adding payment to order:', result);
      
      return NextResponse.json({ 
        error: result.message,
        errorCode: result.errorCode,
        received: true
      }, { status: 200 });
    }

    console.log('✅ Payment added successfully:', {
      orderCode: result.code,
      state: result.state,
      paymentsCount: result.payments?.length,
    });

    return NextResponse.json({ 
      success: true,
      orderCode: result.code,
      orderState: result.state,
    });

  } catch (error) {
    console.error('💥 Error processing payment:', error);
    return NextResponse.json({ 
      error: 'Failed to process payment',
      details: error instanceof Error ? error.message : 'Unknown error',
      received: true
    }, { status: 200 });
  }
}

// IMPORTANTE: Configuración para webhooks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';