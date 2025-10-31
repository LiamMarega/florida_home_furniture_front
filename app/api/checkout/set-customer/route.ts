// app/api/checkout/set-customer/route.ts
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
  console.log('[set-customer] POST request received');
  const raw = await req.json().catch(() => ({}));
  console.log('[set-customer] Raw body parsed:', raw);

  const input = {
    firstName: raw.firstName?.trim(),
    lastName: raw.lastName?.trim(),
    emailAddress: raw.emailAddress?.trim(),
    phoneNumber: raw.phoneNumber?.trim() || undefined,
  };
  console.log('[set-customer] Constructed input:', input);

  // 1) Chequear si hay sesión autenticada (y tolerar FORBIDDEN en `me`)
  console.log('[set-customer] Checking authentication state');
  const auth = await fetchGraphQL({ query: AUTH_STATE }, { req });
  console.log('[set-customer] Auth response:', JSON.stringify(auth, null, 2));

  const meForbiddenOnly =
    auth.errors?.length &&
    auth.errors.every(e => e.extensions?.code === 'FORBIDDEN' && e.path?.[0] === 'me');

  const isLoggedIn = !!auth.data?.me || !!auth.data?.activeCustomer;
  console.log('[set-customer] isLoggedIn:', isLoggedIn);
  if (isLoggedIn) {
    console.log('[set-customer] User already logged in, returning current auth info');
    const res = NextResponse.json({ auth: auth.data });
    for (const c of auth.setCookies ?? []) res.headers.append('Set-Cookie', c);
    return res; // ya logueado → NO setCustomerForOrder
  }

  // 2) Guest: si faltan campos mínimos, error
  if (!input.firstName || !input.lastName || !input.emailAddress) {
    console.warn('[set-customer] Missing required customer fields:', input);
    return NextResponse.json({ error: 'Missing customer fields' }, { status: 400 });
  }

  // 3) Ejecutar setCustomerForOrder (guest)
  console.log('[set-customer] Executing setCustomerForOrder mutation with:', input);
  const result = await fetchGraphQL(
    { query: SET_CUSTOMER_FOR_ORDER, variables: { input } },
    { req }
  );
  console.log('[set-customer] setCustomerForOrder response:', JSON.stringify(result, null, 2));

  // Si hubo errores reales (no relacionados con `me`), devolvelos
  if (result.errors && !meForbiddenOnly) {
    console.error('[set-customer] GraphQL errors:', result.errors);
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const res = NextResponse.json(result.data);
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  console.log('[set-customer] Success response sent:', JSON.stringify(result.data, null, 2));
  return res;
}
