import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';

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

    // First, check if there's an active customer (user logged in)
    console.log('🔍 Checking if user is already authenticated...');
    const activeCustomerCheck = await fetchGraphQL({
      query: GET_ACTIVE_CUSTOMER,
    }, { req });

    console.log('🔍 Active customer check response:', JSON.stringify(activeCustomerCheck, null, 2));

    const activeCustomer = activeCustomerCheck.data?.activeCustomer;
    
    // Check the active order
    const activeOrderCheck = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { req });

    const activeOrder = activeOrderCheck.data?.activeOrder;
    console.log('🔍 Active order:', activeOrder?.id);
    console.log('🔍 Active order customer:', activeOrder?.customer);
    
    // If user is already logged in, skip setCustomerForOrder (it's only for guest checkout)
    if (activeCustomer?.id) {
      console.log('✅ User already logged in - skipping setCustomerForOrder');
      console.log('👤 Current customer:', { 
        id: activeCustomer.id, 
        email: activeCustomer.emailAddress 
      });
      
      // Return the active order with the logged-in customer
      return NextResponse.json({ 
        order: activeOrder,
        message: 'User already authenticated',
        customer: activeCustomer,
        alreadyLoggedIn: true
      });
    }
    
    // If order already has a customer (guest checkout was completed), return it
    if (activeOrder?.customer?.id) {
      console.log('✅ Order already has customer assigned');
      console.log('👤 Current customer:', { 
        id: activeOrder.customer.id, 
        email: activeOrder.customer.emailAddress 
      });
      return NextResponse.json({ 
        order: activeOrder,
        message: 'Customer already assigned to order',
        customer: activeOrder.customer,
        alreadyLoggedIn: false
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

    // Handle ALREADY_LOGGED_IN_ERROR (shouldn't happen now since we check earlier, but just in case)
    if (result?.errorCode === 'ALREADY_LOGGED_IN_ERROR') {
      console.log('⚠️ ALREADY_LOGGED_IN_ERROR received (this should have been caught earlier)');
      
      // Get the current active order and customer
      const currentOrderCheck = await fetchGraphQL({
        query: GET_ACTIVE_ORDER,
      }, { req });
      
      const currentCustomerCheck = await fetchGraphQL({
        query: GET_ACTIVE_CUSTOMER,
      }, { req });
      
      const currentOrder = currentOrderCheck.data?.activeOrder;
      const currentCustomer = currentCustomerCheck.data?.activeCustomer;
      
      console.log('📦 Current order:', currentOrder?.id);
      console.log('👤 Current customer:', currentCustomer?.emailAddress);
      
      // Return success with the current state
      return NextResponse.json({ 
        order: currentOrder,
        message: 'User already authenticated',
        customer: currentCustomer || currentOrder?.customer,
        alreadyLoggedIn: true
      });
    }

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

