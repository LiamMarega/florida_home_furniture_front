// app/api/checkout/payment-intent/route.ts
import { fetchGraphQL } from "@/lib/vendure-server";
import { gql } from "graphql-request";
import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emailAddress: bodyEmail } = body;
    
    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Payment intent cookies:', cookieHeader?.substring(0, 80) + '...');
    console.log('📧 Email from body:', bodyEmail);
    
    // 🔑 Extraer el sessionToken de las cookies
    // En Vendure, el token se guarda como "session" en las cookies
    const sessionToken = cookieHeader?.split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session='))
      ?.split('=')[1];

    console.log('🔍 Session token extraction:', {
      hasCookieHeader: !!cookieHeader,
      hasSessionToken: !!sessionToken,
      sessionTokenPreview: sessionToken?.substring(0, 20) + '...',
    });

    if (!sessionToken) {
      console.error('❌ CRITICAL: No session token found in cookies');
      console.error('Available cookies:', cookieHeader);
      return NextResponse.json({ 
        error: 'Session token not found',
        details: 'Please refresh the page and try again',
      }, { status: 400 });
    }
    
    const GET_ORDER_FOR_PAYMENT = gql`
      query GetActiveOrderForPayment {
        activeOrder {
          id
          code
          total
          totalWithTax
          state
          customer {
            id
            emailAddress
            firstName
            lastName
          }
          shippingAddress {
            fullName
            streetLine1
            city
            postalCode
            phoneNumber
          }
          shippingLines {
            shippingMethod {
              id
              name
            }
          }
        }
      }
    `;
    
    const orderRes = await fetchGraphQL({ 
      query: GET_ORDER_FOR_PAYMENT 
    }, { 
      req,
      cookie: cookieHeader || undefined
    });
    
    const order = orderRes.data?.activeOrder;
    
    if (!order) {
      console.error('❌ No active order found');
      return NextResponse.json({ 
        error: 'No active order found',
      }, { status: 400 });
    }

    // Validaciones
    const customerEmail = bodyEmail || order.customer?.emailAddress;
    const hasShippingAddress = !!(
      order.shippingAddress?.streetLine1 &&
      order.shippingAddress?.city &&
      order.shippingAddress?.postalCode
    );
    const hasShippingMethod = order.shippingLines?.length > 0;
    const missingFields: string[] = [];
    
    if (!customerEmail) missingFields.push('customer email');
    if (!hasShippingAddress) missingFields.push('shipping address');
    if (!hasShippingMethod) missingFields.push('shipping method');

    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: 'Order incomplete',
        details: `Missing required fields: ${missingFields.join(', ')}`,
      }, { status: 400 });
    }

    console.log('✅ Order validation passed:', {
      orderCode: order.code,
      customerEmail,
      state: order.state,
    });

    // ℹ️ NO intentamos transicionar manualmente
    // addPaymentToOrder manejará la transición automáticamente

    // 💳 CREAR PAYMENT INTENT
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    });
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'Payment system not configured',
      }, { status: 500 });
    }

    try {
      // 🔑 NUEVA ESTRATEGIA: Guardar el sessionToken en la metadata de Stripe
      // Esto es más confiable que un Map en memoria
      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.totalWithTax,
        currency: order.currencyCode?.toLowerCase() || 'usd',
        metadata: {
          orderCode: order.code,
          orderId: order.id,
          customerEmail,
          sessionToken, // 🔑 Guardar el token aquí
        },
        description: `Order ${order.code}`,
        receipt_email: customerEmail,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log('✅ Stripe PaymentIntent created:', paymentIntent.id);
      console.log('🔑 Session token stored in Stripe metadata');

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderCode: order.code,
        total: order.totalWithTax,
      });
    } catch (stripeError: any) {
      console.error('❌ Stripe error:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to create payment intent',
        details: stripeError.message
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('💥 Error creating payment intent:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment intent',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}