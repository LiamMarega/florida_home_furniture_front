import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';

const AUTH_STATE = /* GraphQL */ `
  query AuthState {
    me { id identifier }
    activeCustomer { id firstName lastName emailAddress }
    activeOrder { id code state customer { id emailAddress } }
  }
`;

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({}));

  const input = {
    firstName: raw.firstName?.trim(),
    lastName: raw.lastName?.trim(),
    emailAddress: raw.emailAddress?.trim(),
    phoneNumber: raw.phoneNumber?.trim() || undefined,
  };

  // Check if user is already authenticated
  const auth = await fetchGraphQL({ query: AUTH_STATE }, { req });
  const meForbiddenOnly =
    auth.errors?.length &&
    auth.errors.every((e) => e.extensions?.code === 'FORBIDDEN' && e.path?.[0] === 'me');

  const isLoggedIn = !!auth.data?.me || !!auth.data?.activeCustomer;
  if (isLoggedIn) {
    const res = NextResponse.json({ auth: auth.data });
    for (const c of auth.setCookies ?? []) res.headers.append('Set-Cookie', c);
    return res;
  }

  // Validate required fields for guest checkout
  if (!input.firstName || !input.lastName || !input.emailAddress) {
    return NextResponse.json({ error: 'Missing required customer fields' }, { status: 400 });
  }

  // Set customer for order (guest)
  const result = await fetchGraphQL(
    { query: SET_CUSTOMER_FOR_ORDER, variables: { input } },
    { req }
  );

  // Return GraphQL errors (excluding FORBIDDEN on me)
  if (result.errors && !meForbiddenOnly) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  // Check for setCustomerForOrder errors (e.g., EMAIL_ADDRESS_CONFLICT_ERROR)
  if (result.data?.setCustomerForOrder?.errorCode) {
    return NextResponse.json(
      {
        setCustomerForOrder: result.data.setCustomerForOrder,
        error: result.data.setCustomerForOrder.message,
      },
      { status: 400 }
    );
  }

  const res = NextResponse.json(result.data);
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}
