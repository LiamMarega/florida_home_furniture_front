import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER, TRANSITION_ORDER_TO_STATE } from '@/lib/graphql/mutations';
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
    
    if (activeCustomer?.id) {
      console.log('✅ User already logged in (activeCustomer found)');
      console.log('👤 Current customer:', { 
        id: activeCustomer.id, 
        email: activeCustomer.emailAddress 
      });
      
      // Get the active order to return
      const activeOrderCheck = await fetchGraphQL({
        query: GET_ACTIVE_ORDER,
      }, { req });
      
      return NextResponse.json({ 
        order: activeOrderCheck.data?.activeOrder,
        message: 'User already authenticated',
        customer: activeCustomer,
        alreadyLoggedIn: true
      });
    }

    // Also check if the order already has a customer
    const activeOrderCheck = await fetchGraphQL({
      query: GET_ACTIVE_ORDER,
    }, { req });

    const activeOrder = activeOrderCheck.data?.activeOrder;
    console.log('🔍 Active order customer:', activeOrder?.customer);
    
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
        alreadyLoggedIn: true
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

    // Handle ALREADY_LOGGED_IN_ERROR as success
    if (result?.errorCode === 'ALREADY_LOGGED_IN_ERROR') {
      console.log('✅ User already logged in (detected via error)');
      console.log('🔄 Transitioning order to ArrangingPayment to associate customer...');
      
      // Transition order to ArrangingPayment to force customer association
      const transitionResponse = await fetchGraphQL({
        query: TRANSITION_ORDER_TO_STATE,
        variables: { state: 'ArrangingPayment' },
      }, { req });
      
      console.log('🔄 Transition response:', JSON.stringify(transitionResponse, null, 2));
      
      // Get the updated order
      const currentOrderCheck = await fetchGraphQL({
        query: GET_ACTIVE_ORDER,
      }, { req });
      
      const currentOrder = currentOrderCheck.data?.activeOrder;
      
      if (currentOrder) {
        console.log('✅ Order updated with customer:', currentOrder.customer);
        
        // If customer is still null after transition, try logout and retry
        if (!currentOrder.customer) {
          console.error('❌ Customer still null after transition');
          console.log('🔄 Attempting logout and retry...');
          
          // Logout the conflicting session
          const LOGOUT_MUTATION = `
            mutation Logout {
              logout {
                success
              }
            }
          `;
          
          await fetchGraphQL({
            query: LOGOUT_MUTATION,
          }, { req });
          
          console.log('✅ Logged out, now retrying setCustomerForOrder...');
          
          // Retry setCustomerForOrder
          const retryResponse = await fetchGraphQL({
            query: SET_CUSTOMER_FOR_ORDER,
            variables: {
              input: {
                firstName: firstName || '',
                lastName: lastName || '',
                emailAddress,
              },
            },
          }, { req });
          
          console.log('📦 Retry response:', JSON.stringify(retryResponse, null, 2));
          
          const retryResult = retryResponse.data?.setCustomerForOrder;
          
          if (retryResult?.errorCode) {
            console.error('❌ Retry also failed:', retryResult);
            return NextResponse.json(
              { 
                error: 'Failed to set customer after logout',
                details: retryResult.message || 'Could not associate customer with order',
                errorCode: retryResult.errorCode
              },
              { status: 500 }
            );
          }
          
          if (retryResult?.id) {
            console.log('✅ Customer set successfully after logout');
            return NextResponse.json({ order: retryResult });
          }
          
          return NextResponse.json(
            { 
              error: 'Failed to associate customer with order',
              details: 'Tried logout but still could not set customer',
              order: currentOrder
            },
            { status: 500 }
          );
        }
        
        return NextResponse.json({ 
          order: currentOrder,
          message: 'User already authenticated and associated with order',
          customer: currentOrder.customer,
          alreadyLoggedIn: true
        });
      }
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

