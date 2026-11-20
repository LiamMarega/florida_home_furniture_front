import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL, type GraphQLResponse } from '@/lib/vendure-server';
import { forwardCookies } from '@/lib/api-utils';
import { SET_ORDER_SHIPPING_METHOD, TRANSITION_TO_ADDING } from '@/lib/graphql/mutations';
import { ELIGIBLE_SHIPPING_METHODS, GET_ACTIVE_ORDER_SHIPPING } from '@/lib/graphql/queries';

const SAVE_FAILED_MESSAGE = 'We could not save the shipping method. Please try again.';

/**
 * GET -> Lista eligibleShippingMethods para la Active Order.
 */
export async function GET(req: NextRequest) {
  const result = await fetchGraphQL({ query: ELIGIBLE_SHIPPING_METHODS }, { req });
  if (result.errors) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const res = NextResponse.json(result.data);
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}

interface ActiveOrderShipping {
  id: string;
  code: string;
  state: string;
  shippingLines?: Array<{ shippingMethod?: { id?: string } | null }>;
}

/**
 * POST { shippingMethodIds: string[] } (or { shippingMethodId }) -> sets the active order's shipping method.
 * 200 `{ result }` only when the order really has it; otherwise `{ error }` with a readable message
 * (400 rejected, 409 the order can no longer change, 502 backend failure), so the storefront never shows a
 * shipping price the order will not charge.
 *
 * Vendure only changes shipping in AddingItems. An order already in ArrangingPayment (the shopper went back
 * from the payment step) is moved back to AddingItems first, as the cart does when items change, and only
 * when the method actually changes; the payment step moves it to ArrangingPayment again with the new total.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  // Normalize a single id or an array
  let ids: unknown = body?.shippingMethodIds;
  if ((!Array.isArray(ids) || ids.length === 0) && typeof body?.shippingMethodId === 'string' && body.shippingMethodId) {
    ids = [body.shippingMethodId];
  }
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string' && id.length > 0)) {
    return NextResponse.json({ error: 'Please choose a shipping method.' }, { status: 400 });
  }
  const shippingMethodIds = ids as string[];

  const responses: GraphQLResponse[] = [];
  const reply = (payload: Record<string, unknown>, status = 200) => {
    const res = NextResponse.json(payload, { status });
    responses.forEach((response) => forwardCookies(res, response));
    return res;
  };

  const orderRes = await fetchGraphQL<{ activeOrder?: ActiveOrderShipping | null }>(
    { query: GET_ACTIVE_ORDER_SHIPPING },
    { req }
  );
  responses.push(orderRes);
  if (orderRes.errors) {
    console.error('Failed to read the active order before setting shipping:', orderRes.errors[0]?.message);
    return reply({ error: SAVE_FAILED_MESSAGE }, 502);
  }
  const order = orderRes.data?.activeOrder;
  if (!order) {
    return reply({ error: 'Your cart is empty or has expired. Please refresh the page.' }, 409);
  }

  const currentIds = (order.shippingLines ?? [])
    .map((line) => line.shippingMethod?.id)
    .filter((id): id is string => typeof id === 'string');
  if (sameIds(currentIds, shippingMethodIds)) {
    // Already saved: nothing to change, and the order keeps its state.
    return reply({ result: { id: order.id, code: order.code, state: order.state } });
  }

  if (order.state === 'ArrangingPayment') {
    const transitionRes = await fetchGraphQL({ query: TRANSITION_TO_ADDING }, { req });
    responses.push(transitionRes);
    if (transitionRes.data?.transitionOrderToState?.__typename !== 'Order') {
      console.error(
        'Could not move the order back to AddingItems to change shipping:',
        transitionRes.errors?.[0]?.message ?? transitionRes.data?.transitionOrderToState?.transitionError
      );
      return reply(
        {
          error:
            "Your shipping method can't be changed right now. If you already paid, check your order status before trying again.",
        },
        409
      );
    }
  } else if (order.state !== 'AddingItems') {
    return reply({ error: 'This order can no longer be changed.' }, 409);
  }

  const result = await fetchGraphQL(
    { query: SET_ORDER_SHIPPING_METHOD, variables: { ids: shippingMethodIds } },
    { req }
  );
  responses.push(result);
  if (result.errors) {
    console.error('setOrderShippingMethod failed:', result.errors[0]?.message);
    return reply({ error: SAVE_FAILED_MESSAGE }, 502);
  }

  const payload = result.data?.setOrderShippingMethod;
  if (payload?.__typename !== 'Order') {
    console.warn('Shipping method not saved:', payload?.errorCode ?? 'empty response');
    const message =
      payload?.errorCode === 'INELIGIBLE_SHIPPING_METHOD_ERROR'
        ? 'This shipping method is not available for your order. Please choose another one.'
        : SAVE_FAILED_MESSAGE;
    return reply({ error: message, errorCode: payload?.errorCode }, payload?.errorCode ? 400 : 502);
  }

  return reply({ result: payload });
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');
}
