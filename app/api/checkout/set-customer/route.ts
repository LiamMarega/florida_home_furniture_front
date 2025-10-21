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
    
    // Per Vendure docs: "If the customer is already logged in, then this step is skipped"
    // The order is automatically associated with the logged-in customer
    if (activeCustomer?.id) {
      console.log('✅ Customer already logged in - skipping setCustomerForOrder (per Vendure documentation)');
      console.log('👤 Logged-in customer:', { 
        id: activeCustomer.id, 
        email: activeCustomer.emailAddress,
        firstName: activeCustomer.firstName,
        lastName: activeCustomer.lastName
      });
      
      // Get the active order (should already have customer associated)
      const orderCheck = await fetchGraphQL({
        query: GET_ACTIVE_ORDER,
      }, { req });
      
      const order = orderCheck.data?.activeOrder;
      
      console.log('📦 Active order for logged-in user:', {
        id: order?.id,
        code: order?.code,
        customerId: order?.customer?.id,
        customerEmail: order?.customer?.emailAddress
      });
      
      // Verify order has customer associated (should be automatic for logged-in users)
      if (!order?.customer?.emailAddress) {
        console.warn('⚠️ Order does not have customer associated yet, waiting...');
        
        // Wait a bit for Vendure to associate customer with order
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const retryOrderCheck = await fetchGraphQL({
          query: GET_ACTIVE_ORDER,
        }, { req });
        
        const retryOrder = retryOrderCheck.data?.activeOrder;
        
        console.log('🔄 Retry order check:', {
          customerId: retryOrder?.customer?.id,
          customerEmail: retryOrder?.customer?.emailAddress
        });
        
        return NextResponse.json({ 
          order: retryOrder || order,
          customer: retryOrder?.customer || activeCustomer,
          alreadyLoggedIn: true,
          message: 'Customer already logged in - setCustomerForOrder skipped'
        });
      }
      
      // Order already has customer, return it
      return NextResponse.json({ 
        order,
        customer: order.customer,
        alreadyLoggedIn: true,
        message: 'Customer already logged in - setCustomerForOrder skipped'
      });
    }

    // User is NOT logged in, proceed with guest checkout using setCustomerForOrder
    console.log('👤 No active session - proceeding with guest checkout (setCustomerForOrder)...');
    
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

    // Handle Vendure error results
    if (result?.errorCode || (result?.__typename && result.__typename !== 'Order')) {
      console.error('❌ ErrorResult:', result);
      return NextResponse.json(
        { 
          error: result.message || 'Failed to set customer',
          errorCode: result.errorCode,
          details: result
        },
        { status: 400 }
      );
    }

    // Verify we have a valid order with customer
    if (!result || !result.id) {
      console.error('❌ Invalid response: No order returned');
      return NextResponse.json(
        { error: 'Invalid response from server' },
        { status: 500 }
      );
    }

    console.log('✅ Customer set successfully');
    console.log('👤 Order customer:', {
      id: result.customer?.id,
      email: result.customer?.emailAddress,
      firstName: result.customer?.firstName,
      lastName: result.customer?.lastName
    });
    
    // Create response with data
    const nextResponse = NextResponse.json({ 
      order: result,
      customer: result.customer
    });

    // Forward Set-Cookie headers from Vendure if present
    if (response.setCookies && response.setCookies.length > 0) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (error) {
    console.error('💥 Error setting customer:', error);
    return NextResponse.json(
      { error: 'Failed to set customer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

