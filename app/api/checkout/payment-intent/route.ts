// app/api/checkout/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { CREATE_PAYMENT_INTENT } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function POST(req: NextRequest) {
  try {
    const { orderCode } = await req.json();

    console.log('📝 Creating payment intent for order:', orderCode);

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

    // Validate order has required data
    const missingFields = [];
    if (!order.customer?.emailAddress) missingFields.push('customer email');
    if (!order.shippingAddress?.streetLine1) missingFields.push('shipping address');
    if (!order.shippingLines || order.shippingLines.length === 0) missingFields.push('shipping method');

    if (missingFields.length > 0) {
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

    console.log('✅ Order validation passed, creating payment intent...');

    const response = await fetchGraphQL({
      query: CREATE_PAYMENT_INTENT,
      variables: { orderCode },
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
    return NextResponse.json({ clientSecret: result });
  } catch (error) {
    console.error('💥 Error creating payment intent:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
