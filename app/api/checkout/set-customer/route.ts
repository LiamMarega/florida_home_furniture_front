// app/api/checkout/set-customer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER, LOGOUT } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { 
  SetCustomerForOrderResult, 
  ActiveOrderResult, 
  Customer, 
  Success,
  AlreadyLoggedInError,
  NoActiveOrderError,
  EmailAddressConflictError,
  GuestCheckoutError
} from '@/lib/types';

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
      fetchGraphQL<{ activeCustomer: Customer | null }>({ query: GET_ACTIVE_CUSTOMER }, { req, cookie: cookieHeader || undefined }),
      fetchGraphQL<{ activeOrder: ActiveOrderResult }>({ query: GET_ACTIVE_ORDER }, { req, cookie: cookieHeader || undefined }),
    ]);

    const activeCustomer = customerRes.data?.activeCustomer ?? null;
    const activeOrder = orderRes.data?.activeOrder ?? null;

    console.log('📊 Current state:', { 
      hasCustomer: !!activeCustomer?.id, 
      hasOrder: !!activeOrder && 'id' in activeOrder,
      orderCode: activeOrder && 'code' in activeOrder ? activeOrder.code : null,
      orderState: activeOrder && 'state' in activeOrder ? activeOrder.state : null,
      customerEmail: activeCustomer?.emailAddress,
      orderCustomerEmail: activeOrder && 'customer' in activeOrder ? activeOrder.customer?.emailAddress : null,
    });

    // 2) Verificar que hay orden activa
    if (!activeOrder || 'errorCode' in activeOrder || !('id' in activeOrder)) {
      console.error('❌ No active order found');
      return NextResponse.json({ 
        error: 'No active order found', 
        details: 'Please add items to cart first.',
      }, { status: 400 });
    }

    // 3) 🔑 CASO ESPECIAL: Usuario autenticado con orden SIN customer
    // Esto NO debería pasar en Vendure normal, pero puede ocurrir si:
    // - La sesión se quedó autenticada de una compra anterior
    // - El usuario agregó productos (nueva orden) pero Vendure no asoció automáticamente el customer
    if (activeCustomer?.id && !('customer' in activeOrder) || !activeOrder.customer?.id) {
      console.log('⚠️ Authenticated user with order missing customer - Vendure should auto-associate');
      console.log('💡 This order should already have customer associated. Checking again...');
      
      // Refetch la orden por si acaso
      const recheckOrder = await fetchGraphQL<{ activeOrder: ActiveOrderResult }>({
        query: GET_ACTIVE_ORDER,
      }, { req, cookie: cookieHeader || undefined });
      
      const freshOrder = recheckOrder.data?.activeOrder;
      
      if (freshOrder && 'customer' in freshOrder && freshOrder.customer?.id) {
        console.log('✅ Customer now associated with order');
        return NextResponse.json({
          order: freshOrder,
          customer: freshOrder.customer,
          customerEmail: freshOrder.customer.emailAddress,
          alreadyLoggedIn: true,
          message: 'Customer already associated with order',
        });
      }
      
      // Si todavía no tiene customer, algo está mal - intentar setCustomerForOrder de todos modos
      console.warn('⚠️ Order still has no customer after recheck - will attempt setCustomerForOrder');
    }

    // 4) Si la orden ya tiene customer info, verificar que es correcto
    if (activeOrder.customer?.emailAddress) {
      console.log('✅ Order already has customer:', activeOrder.customer.emailAddress);
      
      // Si es el mismo email, retornar success
      if (activeOrder.customer.emailAddress === emailAddress) {
        return NextResponse.json({
          order: activeOrder,
          customer: activeOrder.customer,
          customerEmail: activeOrder.customer.emailAddress,
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

      // CASO 1: Orden YA tiene customer → continuar con usuario autenticado
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

      // CASO 2: Usuario autenticado pero orden SIN customer → limpiar sesión autenticada
      console.warn('⚠️ User logged in but order has no customer - clearing authenticated session...');
      
      // Hacer logout para limpiar la sesión autenticada
      const logoutRes = await fetchGraphQL({
        query: LOGOUT,
      }, { req, cookie: cookieHeader || undefined });

      console.log('🚪 Logout result:', logoutRes.data?.logout);

      // Verificar que la orden sigue existiendo
      const orderAfterLogout = await fetchGraphQL({
        query: GET_ACTIVE_ORDER,
      }, { req, cookie: cookieHeader || undefined });

      if (!orderAfterLogout.data?.activeOrder?.id) {
        console.error('❌ Order was cleared after logout - session was tied to authenticated user');
        return NextResponse.json({ 
          error: 'Session conflict', 
          details: 'Please start a new order. Your previous session was tied to an authenticated account.',
          requiresNewOrder: true,
        }, { status: 400 });
      }

      console.log('✅ Order preserved after logout, retrying setCustomerForOrder...');

      // Reintentar setCustomerForOrder
      response = await fetchGraphQL({
        query: SET_CUSTOMER_FOR_ORDER,
        variables: { input },
      }, { req, cookie: cookieHeader || undefined });

      result = response.data?.setCustomerForOrder;
      
      console.log('📊 Retry result:', {
        typename: result?.__typename,
        errorCode: result?.errorCode,
      });
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