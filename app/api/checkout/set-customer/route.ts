import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';
import { LOGOUT } from '@/lib/graphql/mutations'; // agrega esta mutación Shop API

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { firstName, lastName, emailAddress, forceGuest } = body;

    if (!emailAddress) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 });
    }

    const [activeCustomerRes, activeOrderRes] = await Promise.all([
      fetchGraphQL({ query: GET_ACTIVE_CUSTOMER }, { req }),
      fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req }),
    ]);

    const activeCustomer = activeCustomerRes.data?.activeCustomer ?? null;
    const activeOrder = activeOrderRes.data?.activeOrder ?? null;

    // 🔐 Si hay sesión y queremos forzar guest, hacemos logout primero
    if (forceGuest && (activeCustomer?.id)) {
      await fetchGraphQL({ query: LOGOUT }, { req });
      // pequeña espera opcional
      await new Promise(r => setTimeout(r, 150));
    }

    // Relee después de posible logout
    const [postAuthCustomerRes, postAuthOrderRes] = await Promise.all([
      fetchGraphQL({ query: GET_ACTIVE_CUSTOMER }, { req }),
      fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req }),
    ]);
    const postCustomer = postAuthCustomerRes.data?.activeCustomer ?? null;
    const postOrder = postAuthOrderRes.data?.activeOrder ?? null;

    // Si aún hay cliente activo → no podemos usar setCustomerForOrder
    if (postCustomer?.id) {
      return NextResponse.json({
        order: postOrder ?? null,
        customer: postCustomer,
        alreadyLoggedIn: true,
        message: 'Authenticated request - setCustomerForOrder skipped',
      });
    }

    // ✅ Sesión anónima → usar setCustomerForOrder
    const response = await fetchGraphQL({
      query: SET_CUSTOMER_FOR_ORDER,
      variables: {
        input: {
          firstName: firstName || '',
          lastName : lastName  || '',
          emailAddress,
        },
      },
    }, { req });

    if (response.errors?.length) {
      return NextResponse.json({ error: 'Failed to set customer', details: response.errors }, { status: 400 });
    }

    const result = response.data?.setCustomerForOrder;
    if (result?.__typename && result.__typename !== 'Order') {
      return NextResponse.json({ error: result.message || 'Failed to set customer', details: result }, { status: 400 });
    }

    // Relee orden con customer ya asociado
    const finalOrderRes = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });
    return NextResponse.json({
      order: finalOrderRes.data?.activeOrder ?? result,
      customer: finalOrderRes.data?.activeOrder?.customer ?? null,
      alreadyLoggedIn: false,
      message: 'Customer set successfully',
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to set customer', details: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}
