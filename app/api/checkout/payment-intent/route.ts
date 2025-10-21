import { fetchGraphQL } from "@/lib/vendure-server";
import { gql } from "graphql-request";
import { NextRequest, NextResponse } from "next/server";
import Stripe from 'stripe';


export async function POST(req: NextRequest) {



  try {

    const body = await req.json();
    const { emailAddress: bodyEmail } = body; // 🔑 Extraer email del body
    

  
  
    // 🍪 CRITICAL: Leer cookies del request
    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Payment intent cookies:', cookieHeader?.substring(0, 80) + '...');
    console.log('📧 Email from body:', bodyEmail);
    
    // Obtener la orden activa con TODOS los campos que puedan tener el email
    const GET_ORDER_FOR_PAYMENT = gql`
      query GetActiveOrderForPayment {
        activeOrder {
          id
          code
          total
          totalWithTax
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
    
    // 🍪 Pasar las cookies al fetchGraphQL
    const orderRes = await fetchGraphQL({ 
      query: GET_ORDER_FOR_PAYMENT 
    }, { 
      req,
      cookie: cookieHeader || undefined  // Asegurar que las cookies se pasen
    });
    
    console.log('📦 Order response:', {
      hasOrder: !!orderRes.data?.activeOrder,
      orderId: orderRes.data?.activeOrder?.id,
      orderCode: orderRes.data?.activeOrder?.code,
      hasCustomer: !!orderRes.data?.activeOrder?.customer,
      hasCustomFields: !!orderRes.data?.activeOrder?.customFields,
    });
    
    const order = orderRes.data?.activeOrder;
    
    if (!order) {
      console.error('❌ No active order found');
      console.error('Cookies received:', cookieHeader);
      console.error('GraphQL response:', JSON.stringify(orderRes, null, 2));
      
      return NextResponse.json({ 
        error: 'No active order found',
        debug: {
          hasCookies: !!cookieHeader,
          cookiePreview: cookieHeader?.substring(0, 50),
          graphqlErrors: orderRes.errors,
        }
      }, { status: 400 });
    }

    // 🎯 VALIDACIÓN: Buscar el email en múltiples lugares + body como PRIORIDAD
    // Nota: customFields es JSON, no un objeto con propiedades
    const customerEmail = bodyEmail ||  // 🔑 PRIMERO: email del body (más confiable)
                         order.customer?.emailAddress || 
                         body.email; // Fallback adicional

    console.log('📧 Email detection:', {
      fromBody: bodyEmail,
      fromCustomer: order.customer?.emailAddress,
      final: customerEmail,
    });

    const hasShippingAddress = !!(
      order.shippingAddress?.streetLine1 &&
      order.shippingAddress?.city &&
      order.shippingAddress?.postalCode
    );

    const hasShippingMethod = order.shippingLines?.length > 0;

    // Validar campos requeridos
    const missingFields: string[] = [];
    
    if (!customerEmail) {
      missingFields.push('customer email');
    }
    if (!hasShippingAddress) {
      missingFields.push('shipping address');
    }
    if (!hasShippingMethod) {
      missingFields.push('shipping method');
    }

    if (missingFields.length > 0) {
      console.error('❌ Order validation failed:', {
        hasCustomer: !!order.customer?.id,
        hasCustomerEmail: !!customerEmail,
        hasShippingAddress,
        hasShippingMethod,
        customerEmail,
        shippingAddress: order.shippingAddress,
        bodyData: body,
      });
      
      return NextResponse.json({ 
        error: 'Order incomplete',
        details: `Missing required fields: ${missingFields.join(', ')}`,
        order: {
          hasCustomer: !!order.customer?.id,
          hasCustomerEmail: !!customerEmail,
          hasShippingAddress,
          hasShippingMethod,
          customerEmail,
        },
        debug: {
          orderData: order,
          bodyData: body,
        }
      }, { status: 400 });
    }

    console.log('✅ Order validation passed:', {
      orderCode: order.code,
      customerEmail,
      hasCustomer: !!order.customer?.id,
      total: order.totalWithTax,
    });

    // 💳 CREAR PAYMENT INTENT CON STRIPE
    console.log('💳 Creating Stripe PaymentIntent...');
    
    // Importar Stripe (deberías tener esto instalado: npm install stripe)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover', // O la versión que tengas
    });
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return NextResponse.json({ 
        error: 'Payment system not configured',
        details: 'Stripe secret key is missing'
      }, { status: 500 });
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.totalWithTax, // Vendure usa centavos
        currency: order.currencyCode?.toLowerCase() || 'usd',
        metadata: {
          orderCode: order.code,
          orderId: order.id,
          customerEmail,
        },
        description: `Order ${order.code}`,
        receipt_email: customerEmail,
      });

      console.log('✅ Stripe PaymentIntent created:', paymentIntent.id);

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