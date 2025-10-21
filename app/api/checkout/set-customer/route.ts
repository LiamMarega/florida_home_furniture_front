import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER, LOGOUT } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';

// 🧁 Helper: extrae solo "name=value" de un Set-Cookie
function onlyNameValue(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0];
}

// 🧁 Helper: merge cookies en un solo header "Cookie"
function mergeCookieHeaders(...parts: (string | undefined)[]): string {
  const map = new Map<string, string>();
  
  for (const part of parts) {
    if (!part) continue;
    
    for (const segment of part.split(';')) {
      const trimmed = segment.trim();
      if (!trimmed) continue;
      
      const [name, ...rest] = trimmed.split('=');
      if (name && rest.length) {
        map.set(name, `${name}=${rest.join('=')}`);
      }
    }
  }
  
  return Array.from(map.values()).join('; ');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, emailAddress, phoneNumber, forceGuest } = body;

    if (!emailAddress) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    console.log('👤 Setting customer:', { firstName, lastName, emailAddress, phoneNumber, forceGuest });

    let cookieJar: string | undefined = req.headers.get('cookie') || undefined;
    console.log('🍪 Initial cookies:', cookieJar?.substring(0, 50) + '...');

    // 1) Estado inicial
    const [activeCustomerRes, activeOrderRes] = await Promise.all([
      fetchGraphQL({ query: GET_ACTIVE_CUSTOMER }, { req, cookie: cookieJar }),
      fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req, cookie: cookieJar }),
    ]);

    const activeCustomer = activeCustomerRes.data?.activeCustomer ?? null;
    const activeOrder = activeOrderRes.data?.activeOrder ?? null;

    console.log('📊 Initial state:', { 
      hasActiveCustomer: !!activeCustomer?.id, 
      hasActiveOrder: !!activeOrder?.id,
      activeOrderCode: activeOrder?.code,
      customerEmail: activeCustomer?.emailAddress
    });

    // 2) ⚠️ CRITICAL: Verificar orden activa ANTES de cualquier logout
    if (!activeOrder?.id) {
      console.error('❌ No active order found - cannot proceed');
      return NextResponse.json({ 
        error: 'No active order found', 
        details: 'An active order is required to set customer information. Please add items to cart first.',
        requiresCart: true
      }, { status: 400 });
    }

    // 3) 🔐 Manejo inteligente de sesiones autenticadas
    if (activeCustomer?.id) {
      console.log('👤 Active customer found:', {
        customerId: activeCustomer.id,
        email: activeCustomer.emailAddress,
        orderId: activeOrder?.id,
        orderCode: activeOrder?.code,
      });

      // Si NO forzamos guest, simplemente usar el customer existente
      if (!forceGuest) {
        console.log('✅ Customer already authenticated, using existing session');
        return NextResponse.json({
          order: activeOrder,
          customer: activeCustomer,
          alreadyLoggedIn: true,
          message: 'Using authenticated customer session',
        });
      }

      // ⚠️ Si forzamos guest pero hay orden, advertir al usuario
      // NO hacer logout porque se pierde la orden
      console.log('⚠️ Cannot force guest - would lose active order');
      
      return NextResponse.json({
        error: 'Cannot proceed with guest checkout',
        details: 'You have an active order in your account. Please complete the checkout as a logged-in user, or clear your cart to start a guest checkout.',
        activeOrder: {
          code: activeOrder?.code,
          total: activeOrder?.totalWithTax,
        },
        customer: {
          email: activeCustomer.emailAddress,
          name: `${activeCustomer.firstName} ${activeCustomer.lastName}`.trim(),
        },
        suggestion: 'complete-as-user',
      }, { status: 409 }); // 409 Conflict
    }

    // 4) ✅ Sesión anónima con orden activa → usar setCustomerForOrder
    console.log('👤 Setting customer for guest order:', activeOrder.code);
    
    const input: any = {
      firstName: firstName || '',
      lastName: lastName || '',
      emailAddress,
    };
    
    if (phoneNumber) {
      input.phoneNumber = phoneNumber;
    }
    
    const response = await fetchGraphQL({
      query: SET_CUSTOMER_FOR_ORDER,
      variables: { input },
    }, { req, cookie: cookieJar });

    // 🧁 Capturar cookies
    if (response.setCookies?.length) {
      const newCookies = response.setCookies.map(onlyNameValue).join('; ');
      cookieJar = mergeCookieHeaders(cookieJar, newCookies);
      console.log('🍪 Cookies after setCustomerForOrder:', cookieJar?.substring(0, 50) + '...');
    }

    if (response.errors?.length) {
      console.error('❌ GraphQL errors:', response.errors);
      return NextResponse.json({ 
        error: 'Failed to set customer', 
        details: response.errors 
      }, { status: 400 });
    }

    const result = response.data?.setCustomerForOrder;
    
    console.log('🔍 setCustomerForOrder response:', JSON.stringify(result, null, 2));
    
    // Verificar si la respuesta es un error de Vendure
    if (result?.__typename && result.__typename !== 'Order') {
      console.error('❌ Vendure error:', result);
      return NextResponse.json({ 
        error: result.message || 'Failed to set customer', 
        details: result,
        errorCode: result.errorCode 
      }, { status: 400 });
    }

    console.log('✅ Customer info set for order:', result?.code);

    // 5) 🔄 RE-FETCH la orden para obtener datos frescos
    await new Promise(r => setTimeout(r, 100));
    
    const finalOrderRes = await fetchGraphQL({ 
      query: GET_ACTIVE_ORDER 
    }, { req, cookie: cookieJar });
    
    const finalOrder = finalOrderRes.data?.activeOrder;
    
    console.log('📊 Final order state:', { 
      orderCode: finalOrder?.code,
      hasCustomer: !!finalOrder?.customer,
      customerEmail: finalOrder?.customer?.emailAddress,
      shippingAddressName: finalOrder?.shippingAddress?.fullName,
    });

    const orderToReturn = finalOrder || result;
    const customerData = orderToReturn?.customer || null;

    // 6) 🎯 Para guest checkout, el customer puede ser null
    // Lo importante es que la orden tenga el email en shippingAddress
    const hasCustomerInfo = !!(
      customerData?.emailAddress || 
      orderToReturn?.shippingAddress?.fullName
    );

    if (!hasCustomerInfo) {
      console.error('⚠️ WARNING: No customer info found in order');
      console.error('Result customer:', result?.customer);
      console.error('Final order customer:', finalOrder?.customer);
      console.error('Shipping address:', finalOrder?.shippingAddress);
    }

    const nextResponse = NextResponse.json({
      order: orderToReturn,
      customer: customerData,
      customerEmail: customerData?.emailAddress || emailAddress,
      alreadyLoggedIn: false,
      isGuestCheckout: !customerData?.id,
      message: customerData?.id 
        ? 'Customer set successfully' 
        : 'Guest checkout - customer info saved to order',
    });

    // 🧁 Forward Set-Cookie headers
    if (response.setCookies?.length && response.setCookies.length > 0) {
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