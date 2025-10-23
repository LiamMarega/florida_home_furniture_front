// app/api/checkout/set-customer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { gql } from 'graphql-request';

const SET_CUSTOMER_FOR_ORDER = gql`
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
        code
        state
        customer {
          id
          emailAddress
          firstName
          lastName
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const GET_ACTIVE_ORDER = gql`
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      customer {
        id
        emailAddress
        firstName
        lastName
      }
    }
  }
`;

const GET_ACTIVE_CUSTOMER = gql`
  query GetActiveCustomer {
    activeCustomer {
      id
      emailAddress
      firstName
      lastName
    }
  }
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, emailAddress, phoneNumber } = body;

    if (!emailAddress) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    console.log('👤 Setting customer:', { firstName, lastName, emailAddress });

    const cookieHeader = req.headers.get('cookie');
    console.log('🍪 Request cookies:', cookieHeader?.substring(0, 80) + '...');

    // 1) Verificar estado actual
    const [customerRes, orderRes] = await Promise.all([
      fetchGraphQL({ query: GET_ACTIVE_CUSTOMER }, { req, cookie: cookieHeader || undefined }),
      fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req, cookie: cookieHeader || undefined }),
    ]);

    const activeCustomer = customerRes.data?.activeCustomer ?? null;
    const activeOrder = orderRes.data?.activeOrder ?? null;

    console.log('📊 Current state:', { 
      hasCustomer: !!activeCustomer?.id, 
      hasOrder: !!activeOrder?.id,
      orderCode: activeOrder?.code,
      orderState: activeOrder?.state,
      customerEmail: activeCustomer?.emailAddress,
      orderCustomerEmail: activeOrder?.customer?.emailAddress,
    });

    // 2) Verificar que hay orden activa
    if (!activeOrder?.id) {
      console.error('❌ No active order found');
      return NextResponse.json({ 
        error: 'No active order found', 
        details: 'Please add items to cart first.',
      }, { status: 400 });
    }

    // 3) Si la orden ya tiene customer info, no hacer nada
    if (activeOrder.customer?.emailAddress) {
      console.log('✅ Order already has customer:', activeOrder.customer.emailAddress);
      
      // Si es el mismo email, retornar success
      if (activeOrder.customer.emailAddress === emailAddress) {
        return NextResponse.json({
          order: activeOrder,
          customer: activeOrder.customer,
          message: 'Customer already set for this order',
        });
      }
      
      // Si es diferente, advertir
      console.warn('⚠️ Order has different customer email');
    }

    // 4) Intentar setCustomerForOrder
    console.log('👤 Setting customer for order:', activeOrder.code);
    
    const input: any = {
      firstName: firstName || '',
      lastName: lastName || '',
      emailAddress,
    };
    
    if (phoneNumber) {
      input.phoneNumber = phoneNumber;
    }
    
    let response = await fetchGraphQL({
      query: SET_CUSTOMER_FOR_ORDER,
      variables: { input },
    }, { req, cookie: cookieHeader || undefined });

    if (response.errors?.length) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json({ 
        error: 'Failed to set customer', 
        details: response.errors 
      }, { status: 400 });
    }

    let result = response.data?.setCustomerForOrder;
    
    console.log('📊 setCustomerForOrder result:', {
      typename: result?.__typename,
      errorCode: result?.errorCode,
      orderCode: result?.code,
      hasCustomer: !!result?.customer,
    });
    
    // 5) 🔑 MANEJAR ALREADY_LOGGED_IN_ERROR: Usuario ya autenticado
    // NO hacemos logout porque borra la orden activa
    // En su lugar, continuamos con el checkout - la orden ya está asociada con el usuario
    if (result?.errorCode === 'ALREADY_LOGGED_IN_ERROR') {
      console.log('ℹ️ ALREADY_LOGGED_IN_ERROR: User is logged in, checking order association...');
      
      // Verificar que la orden tenga customer asociado
      const checkOrderRes = await fetchGraphQL({
        query: GET_ACTIVE_ORDER,
      }, { req, cookie: cookieHeader || undefined });
      
      const currentOrder = checkOrderRes.data?.activeOrder;
      
      if (!currentOrder?.id) {
        console.error('❌ Order was lost after ALREADY_LOGGED_IN_ERROR');
        return NextResponse.json({ 
          error: 'Order not found', 
          details: 'Please refresh and try again',
        }, { status: 400 });
      }

      if (currentOrder.customer?.id) {
        console.log('✅ Order already associated with authenticated customer:', {
          customerEmail: currentOrder.customer.emailAddress,
          orderId: currentOrder.id,
        });
        
        // Retornar éxito - el usuario está autenticado y la orden está asociada
        return NextResponse.json({
          order: currentOrder,
          customer: currentOrder.customer,
          customerEmail: currentOrder.customer.emailAddress,
          alreadyLoggedIn: true,
          message: 'Continuing with authenticated user',
        });
      }

      console.warn('⚠️ User logged in but order has no customer - unexpected state');
    }
    
    // Manejar otros errores de Vendure
    if (result?.errorCode) {
      console.error('❌ Vendure error:', {
        errorCode: result.errorCode,
        message: result.message,
      });
      
      return NextResponse.json({ 
        error: result.message || 'Failed to set customer', 
        details: result,
        errorCode: result.errorCode 
      }, { status: 400 });
    }

    // Verificar que la operación fue exitosa
    if (!result || result.__typename !== 'Order') {
      console.error('❌ Unexpected response type:', result?.__typename);
      return NextResponse.json({ 
        error: 'Unexpected response from server',
        details: result,
      }, { status: 500 });
    }

    console.log('✅ Customer set successfully for order:', result.code);

    const nextResponse = NextResponse.json({
      order: result,
      customer: result.customer,
      customerEmail: result.customer?.emailAddress || emailAddress,
      isGuestCheckout: true,
      message: 'Customer information saved',
    });

    // Forward Set-Cookie headers if any
    if (response.setCookies?.length) {
      response.setCookies.forEach(cookie => {
        nextResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return nextResponse;
  } catch (e) {
    console.error('💥 Unexpected error:', e);
    return NextResponse.json({ 
      error: 'Failed to set customer', 
      details: e instanceof Error ? e.message : 'Unknown error' 
    }, { status: 500 });
  }
}