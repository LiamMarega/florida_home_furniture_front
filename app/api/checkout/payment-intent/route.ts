// app/api/checkout/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { CREATE_PAYMENT_INTENT, SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';
import { GET_ACTIVE_ORDER, GET_ACTIVE_CUSTOMER } from '@/lib/graphql/queries';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderCode = body.orderCode || body.code;
    const emailFromBody = (body.emailAddress || body.email || '').trim();

    if (!orderCode) {
      return NextResponse.json({ error: 'Order code is required', details: 'Please provide an order code' }, { status: 400 });
    }

    // 1) Cargar estado actual
    const [orderCheck, activeCustomerCheck] = await Promise.all([
      fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req }),
      fetchGraphQL({ query: GET_ACTIVE_CUSTOMER }, { req }),
    ]);

    const order = orderCheck.data?.activeOrder ?? null;
    const activeCustomer = activeCustomerCheck.data?.activeCustomer ?? null;

    if (!order) {
      return NextResponse.json({ error: 'No active order found', details: 'Please add items to cart first' }, { status: 400 });
    }

    if (order.code !== orderCode) {
      console.warn('⚠️ Order code mismatch', { provided: orderCode, actual: order.code });
    }

    const hasOrderCustomerEmail = !!order.customer?.emailAddress;
    const authHeader = !!req.headers.get('authorization');

    // 2) Si falta email, resolverlo
    if (!hasOrderCustomerEmail) {
      // a) Si hay cliente activo (sesión autenticada), intentar que se asocie
      if (activeCustomer?.emailAddress || authHeader) {
        // Pequeño delay + re-check por si es tema de timing
        await new Promise(r => setTimeout(r, 250));
        const retry = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });
        const retryOrder = retry.data?.activeOrder;

        if (!retryOrder?.customer?.emailAddress) {
          // En este punto no podemos llamar setCustomerForOrder (está logueado).
          return NextResponse.json({
            error: 'Order incomplete',
            details: 'Active session detected but order is not linked to the customer yet. Ensure Shop API requests include cookies and not an incompatible Authorization header.',
            order: {
              hasCustomer: false,
              hasShippingAddress: !!order.shippingAddress,
              hasShippingMethod: order.shippingLines?.length > 0,
              customerEmail: null,
            },
          }, { status: 409 });
        }
      } else {
        // b) Guest checkout: necesitamos un email en el cuerpo para setCustomerForOrder
        const emailToUse = emailFromBody;
        if (!emailToUse) {
          return NextResponse.json({
            error: 'Order incomplete',
            details: 'Missing required fields: customer email (provide `emailAddress` in the payload for guest checkout).',
            order: {
              hasCustomer: false,
              hasShippingAddress: !!order.shippingAddress,
              hasShippingMethod: order.shippingLines?.length > 0,
              customerEmail: null,
            },
          }, { status: 400 });
        }

        // Intentar asociar el email a la orden anónima
        const setCustomerRes = await fetchGraphQL(
          {
            query: SET_CUSTOMER_FOR_ORDER,
            variables: {
              input: {
                // nombres opcionales si los tenés en el body
                firstName: (body.firstName || '').trim(),
                lastName : (body.lastName  || '').trim(),
                emailAddress: emailToUse,
              },
            },
          },
          { req }
        );

        if (setCustomerRes.errors?.length) {
          // Si falló por ALREADY_LOGGED_IN_ERROR es que se logueó entre medio: reintentar leyendo el estado.
          const msg = setCustomerRes.errors[0]?.message || 'Failed to set customer';
          if (/ALREADY_LOGGED_IN_ERROR/i.test(msg)) {
            const retry = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });
            const retryOrder = retry.data?.activeOrder;
            if (!retryOrder?.customer?.emailAddress) {
              return NextResponse.json({ error: 'Order incomplete', details: 'Customer is logged in but order is not linked yet.' }, { status: 409 });
            }
          } else {
            return NextResponse.json({ error: 'Failed to set customer', details: setCustomerRes.errors }, { status: 400 });
          }
        } else {
          const setResult = setCustomerRes.data?.setCustomerForOrder;
          if (setResult?.__typename && setResult.__typename !== 'Order') {
            // Otro ErrorResult
            return NextResponse.json({ error: setResult.message || 'Failed to set customer', details: setResult }, { status: 400 });
          }
        }
      }
    }

    // 3) Releer la orden ya con email (o fallamos antes)
    const finalOrderRes = await fetchGraphQL({ query: GET_ACTIVE_ORDER }, { req });
    const finalOrder = finalOrderRes.data?.activeOrder;

    // Validaciones mínimas antes del intent
    const missing: string[] = [];
    if (!finalOrder?.customer?.emailAddress) missing.push('customer email');
    if (!finalOrder?.shippingAddress?.streetLine1) missing.push('shipping address');
    if (!finalOrder?.shippingLines?.length) missing.push('shipping method');
    if (missing.length) {
      return NextResponse.json({
        error: 'Order incomplete',
        details: `Missing required fields: ${missing.join(', ')}`,
        order: {
          hasCustomer: !!finalOrder?.customer?.emailAddress,
          hasShippingAddress: !!finalOrder?.shippingAddress,
          hasShippingMethod: !!finalOrder?.shippingLines?.length,
          customerEmail: finalOrder?.customer?.emailAddress ?? null,
        }
      }, { status: 400 });
    }

    // 4) Crear el Payment Intent
    const response = await fetchGraphQL({ query: CREATE_PAYMENT_INTENT }, { req });

    if (response.errors?.length) {
      return NextResponse.json({ error: 'GraphQL error', details: response.errors }, { status: 500 });
    }

    const clientSecret = response.data?.createStripePaymentIntent;
    if (!clientSecret || typeof clientSecret !== 'string') {
      return NextResponse.json({
        error: 'Failed to create payment intent',
        details: 'No client secret returned from Vendure. Check StripePlugin configuration and order state.',
        response
      }, { status: 500 });
    }

    const nextResponse = NextResponse.json({ clientSecret });
    if (response.setCookies?.length) {
      response.setCookies.forEach((c: string) => nextResponse.headers.append('Set-Cookie', c));
    }
    return nextResponse;

  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
