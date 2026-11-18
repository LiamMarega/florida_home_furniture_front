import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL, type GraphQLResponse } from '@/lib/vendure-server';
import { GET_AFFIRM_CHECKOUT } from '@/lib/graphql/queries';
import { forwardCookies } from '@/lib/api-utils';
import { addAffirmPayment } from '@/lib/checkout/affirm-payment';

export const dynamic = 'force-dynamic';

const UNAVAILABLE_MESSAGE = 'Affirm is unavailable right now. Please choose another payment method.';

/**
 * GET -> `{ checkout }`: the affirm.js checkout object for the active order, built by the backend
 * (items, discounts, shipping, tax and total) so that all money math stays server-side.
 * Affirm sends the customer to `confirmationUrl` (GET) only when it falls back to a redirect; the
 * modal flow completes through `onSuccess` and the POST below.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const result = await fetchGraphQL<{ affirmCheckout?: Record<string, unknown> }>(
    {
      query: GET_AFFIRM_CHECKOUT,
      variables: {
        confirmationUrl: `${origin}/api/checkout/affirm/confirm`,
        cancelUrl: `${origin}/checkout?affirm=cancelled`,
      },
    },
    { req }
  );

  const checkout = result.data?.affirmCheckout;
  let res: NextResponse;
  if (result.errors?.length || !checkout) {
    const { status, error } = checkoutError(result.errors);
    res = NextResponse.json({ error }, { status });
  } else {
    res = NextResponse.json({ checkout });
  }
  forwardCookies(res, result);
  return res;
}

/**
 * POST { checkoutToken } -> adds the Affirm payment to the active order.
 * 200 `{ orderCode, state }`, otherwise `{ error, retryable }` with 400 (invalid token or not
 * eligible), 402 (declined), 409 (order no longer awaiting payment) or 502 (retry with the same token).
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const checkoutToken =
    body && typeof body === 'object' ? (body as { checkoutToken?: unknown }).checkoutToken : undefined;

  const { result, setCookies } = await addAffirmPayment(req, checkoutToken);
  const res = result.ok
    ? NextResponse.json({ orderCode: result.orderCode, state: result.state })
    : NextResponse.json({ error: result.error, retryable: result.retryable }, { status: result.status });
  forwardCookies(res, { setCookies });
  return res;
}

function checkoutError(errors: GraphQLResponse['errors']): { status: number; error: string } {
  const first = errors?.[0];
  switch (first?.extensions?.code) {
    case 'USER_INPUT_ERROR':
      // No active order, Affirm disabled or not eligible (the eligibility checker's message).
      return { status: 400, error: first?.message || 'Affirm is not available for this order.' };
    case 'ILLEGAL_OPERATION':
    case 'FORBIDDEN':
      return { status: 409, error: 'Your order is not ready for payment. Please refresh the page and try again.' };
    default:
      console.error('affirmCheckout failed:', errors?.map((e) => e.message) ?? 'empty response');
      return { status: 502, error: UNAVAILABLE_MESSAGE };
  }
}
