import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER } from '@/lib/graphql/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, emailAddress } = body;

    console.log('👤 Setting customer:', { firstName, lastName, emailAddress });

    if (!emailAddress) {
      console.error('❌ Email address is required');
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log('🍪 Request cookies:', req.headers.get('cookie')?.substring(0, 50) + '...');

    // First, check if user is already logged in
    console.log('🔍 Checking if user is already authenticated...');
    const activeOrderCheck = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { req });

    console.log('🔍 Active order check response:', JSON.stringify(activeOrderCheck, null, 2));

    // Handle GraphQL errors in the check
    if (activeOrderCheck.errors) {
      console.error('❌ Error checking active order:', activeOrderCheck.errors);
      // Continue with customer setup if we can't check the order
    }

    const activeOrder = activeOrderCheck.data?.activeOrder;
    console.log('🔍 Active order found:', !!activeOrder);
    console.log('🔍 Active order customer:', activeOrder?.customer);
    console.log('🔍 Customer ID:', activeOrder?.customer?.id);
    console.log('🔍 Customer email:', activeOrder?.customer?.emailAddress);
    
    // If user is already logged in, return the current order
    if (activeOrder?.customer?.id) {
      console.log('✅ User already logged in, skipping customer setup');
      console.log('👤 Current customer:', { 
        id: activeOrder.customer.id, 
        email: activeOrder.customer.emailAddress 
      });
      return NextResponse.json({ 
        order: activeOrder,
        message: 'User already authenticated',
        customer: activeOrder.customer
      });
    }

    console.log('👤 No existing customer found, proceeding with customer setup...');

    const response = await fetchGraphQL({
      query: SET_CUSTOMER_FOR_ORDER,
      variables: {
        input: {
          firstName: firstName || '',
          lastName: lastName || '',
          emailAddress,
        },
      },
    }, {
      req // Pass the request to include cookies
    });

    console.log('📦 Vendure response:', JSON.stringify(response, null, 2));

    // Handle GraphQL-level errors
    if (response.errors) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json(
        { error: 'Failed to set customer', details: response.errors },
        { status: 500 }
      );
    }

    const result = response.data?.setCustomerForOrder;

    // Handle Vendure error results (check both __typename and errorCode)
    if (result?.__typename && result.__typename !== 'Order') {
      console.error('❌ ErrorResult by __typename:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to set customer',
          errorCode: result.errorCode,
          details: result
        },
        { status: 400 }
      );
    }

    if (result?.errorCode) {
      console.error('❌ ErrorResult by errorCode:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to set customer',
          errorCode: result.errorCode,
          details: result
        },
        { status: 400 }
      );
    }

    // Verify we have a valid order
    if (!result || !result.id) {
      console.error('❌ Invalid response: No order returned');
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    console.log('✅ Customer set successfully');
    return NextResponse.json({ order: result });
  } catch (error) {
    console.error('💥 Error setting customer:', error);
    return NextResponse.json(
      { error: 'Failed to set customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

