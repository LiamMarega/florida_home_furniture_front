// app/api/checkout/set-customer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { SET_CUSTOMER_FOR_ORDER } from '@/lib/graphql/mutations';

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => null);

  // Espera: { firstName, lastName, emailAddress, phoneNumber? }
  // (address se setea luego con setOrderShippingAddress / setOrderBillingAddress)
  if (!input?.firstName || !input?.lastName || !input?.emailAddress) {
    return NextResponse.json({ error: 'Missing customer fields' }, { status: 400 });
  }

  const result = await fetchGraphQL(
    { query: SET_CUSTOMER_FOR_ORDER, variables: { input } },
    { req }
  );

  if (result.errors) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const setCookies = result.setCookies ?? [];
  const res = NextResponse.json(result.data);
  for (const c of setCookies) res.headers.append('Set-Cookie', c);

  return res;
}
