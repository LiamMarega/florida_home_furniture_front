// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { fetchGraphQL } from '@/lib/vendure-server';
import { gql } from 'graphql-request';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// 🔑 Función para autenticarse como admin en Vendure
async function getAdminToken(): Promise<string | null> {
  const ADMIN_LOGIN = gql`
    mutation AdminLogin($username: String!, $password: String!) {
      login(username: $username, password: $password) {
        ... on CurrentUser {
          id
          identifier
          channels {
            id
            token
          }
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ADMIN_LOGIN,
        variables: {
          username: process.env.VENDURE_ADMIN_USERNAME || 'superadmin',
          password: process.env.VENDURE_ADMIN_PASSWORD || 'superadmin',
        },
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ Admin login errors:', result.errors);
      return null;
    }

    // Extraer el token de autenticación de las cookies
    const setCookies = response.headers.getSetCookie?.() || [];
    const sessionCookie = setCookies.find(c => c.startsWith('session='));
    
    if (sessionCookie) {
      const token = sessionCookie.split(';')[0].split('=')[1];
      console.log('✅ Admin authenticated');
      return token;
    }

    console.error('❌ No session cookie in admin login response');
    return null;
  } catch (error) {
    console.error('💥 Admin login error:', error);
    return null;
  }
}

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
    // 🔑 Autenticarse como administrador para poder acceder a cualquier orden
    console.log('🔐 Authenticating as admin...');
    const adminToken = await getAdminToken();

    if (!adminToken) {
      console.error('❌ Failed to authenticate as admin');
      return NextResponse.json({ 
        error: 'Authentication failed',
        received: true,
      }, { status: 200 });
    }

    // Buscar la orden por código usando credenciales de admin
    console.log('🔍 Fetching order by code with admin credentials...');
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
      cookie: `session=${adminToken}`, // 🔑 Usar token de administrador
    });

    const order = orderRes.data?.orderByCode;

    if (!order) {
      console.error('❌ Order not found:', orderCode);
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

    // 🔑 IMPORTANTE: Ahora necesitamos usar el session token del USUARIO para addPaymentToOrder
    // porque addPaymentToOrder debe ejecutarse en el contexto de la sesión del usuario
    const userSessionToken = paymentIntent.metadata.sessionToken;

    if (!userSessionToken) {
      console.error('❌ No user session token found in Stripe metadata');
      return NextResponse.json({ 
        error: 'User session expired',
        received: true,
      }, { status: 200 });
    }

    // Agregar el pago usando la sesión del usuario
    console.log('💳 Adding payment to Vendure order with user session...');
    
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
      cookie: `session=${userSessionToken}`, // 🔑 Usar sesión del usuario
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