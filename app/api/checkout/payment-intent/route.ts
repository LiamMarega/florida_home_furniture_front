// app/api/checkout/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { CREATE_PAYMENT_INTENT } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderCode = body.orderCode || body.code;
    const forceNew = body.forceNew;
    const timestamp = body.timestamp;

    console.log('📝 Creating payment intent for order:', orderCode);
    console.log('🔄 Request details:', { forceNew, timestamp, orderCode });

    if (!orderCode) {
      return NextResponse.json({ 
        error: 'Order code is required',
        details: 'Please provide an order code'
      }, { status: 400 });
    }

    // First, verify the order is ready for payment
    const orderCheck = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { req });

    console.log('🔍 Order check:', JSON.stringify(orderCheck, null, 2));

    const order = orderCheck.data?.activeOrder;

    if (!order) {
      return NextResponse.json({ 
        error: 'No active order found',
        details: 'Please add items to cart first'
      }, { status: 400 });
    }

    // Validate order code matches
    if (order.code !== orderCode) {
      console.warn('⚠️ Order code mismatch:', { provided: orderCode, actual: order.code });
    }

    // Validate order has required data
    const missingFields = [];
    if (!order.customer?.emailAddress) missingFields.push('customer email');
    if (!order.shippingAddress?.streetLine1) missingFields.push('shipping address');
    if (!order.shippingLines || order.shippingLines.length === 0) missingFields.push('shipping method');

    if (missingFields.length > 0) {
      console.error('❌ Order incomplete:', missingFields);
      return NextResponse.json({ 
        error: 'Order incomplete',
        details: `Missing required fields: ${missingFields.join(', ')}`,
        order: {
          hasCustomer: !!order.customer,
          hasShippingAddress: !!order.shippingAddress,
          hasShippingMethod: order.shippingLines?.length > 0,
        }
      }, { status: 400 });
    }

    // Check if order already has payments
    if (order.payments && order.payments.length > 0) {
      const lastPayment = order.payments[order.payments.length - 1];
      const paymentState = lastPayment.state?.toLowerCase();
      
      console.log('🔍 Existing payment found:', {
        state: paymentState,
        amount: lastPayment.amount,
        method: lastPayment.method
      });

      // If payment is already successful, don't create a new intent
      if (paymentState === 'settled' || paymentState === 'succeeded') {
        return NextResponse.json({ 
          error: 'Payment already completed',
          details: 'This order has already been paid for',
          paymentState: paymentState
        }, { status: 400 });
      }

      // If payment failed or was cancelled, we can create a new intent
      if (paymentState === 'failed' || paymentState === 'declined' || paymentState === 'cancelled') {
        console.log('🔄 Previous payment failed, creating new payment intent...');
      }
    }

    console.log('✅ Order validation passed, creating payment intent...');
    console.log('📋 Order details:', {
      code: order.code,
      customer: order.customer?.emailAddress,
      total: order.totalWithTax,
      currency: order.currencyCode,
      existingPayments: order.payments?.length || 0
    });

    // The mutation uses the active order from the session, no orderCode needed
    const response = await fetchGraphQL({
      query: CREATE_PAYMENT_INTENT,
    }, {
      req // Pass the request to include cookies
    });

    console.log('📦 Vendure response:', JSON.stringify(response, null, 2));

    // Handle GraphQL-level errors
    if (response.errors && response.errors.length > 0) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json({ 
        error: 'GraphQL error', 
        details: response.errors 
      }, { status: 500 });
    }

    const result = response.data?.createStripePaymentIntent;

    // Handle Vendure error results
    if (result && typeof result === 'object' && 'errorCode' in result) {
      console.error('❌ ErrorResult by errorCode:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to create payment intent',
          errorCode: result.errorCode,
          details: result
        },
        { status: 400 }
      );
    }

    // Check if we have a valid client secret (should be a string)
    if (!result || typeof result !== 'string') {
      console.error('❌ No valid client secret returned. Full response:', response);
      return NextResponse.json({ 
        error: 'Failed to create payment intent',
        details: 'No client secret returned from Vendure. Check if StripePlugin is configured and order is in correct state.',
        response: response
      }, { status: 500 });
    }

    console.log('✅ Payment intent created successfully');
    console.log('🔑 Client secret length:', result.length);
    console.log('🔑 Client secret preview:', result.substring(0, 20) + '...');
    
    // Extract PaymentIntent ID from client secret for debugging
    const paymentIntentId = result.split('_secret_')[0];
    console.log('🆔 PaymentIntent ID:', paymentIntentId);
    
    return NextResponse.json({ clientSecret: result });
  } catch (error) {
    console.error('💥 Error creating payment intent:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
