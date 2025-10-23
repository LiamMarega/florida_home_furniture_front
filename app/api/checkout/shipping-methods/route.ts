// app/api/checkout/shipping-methonds/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import {
  SET_ORDER_SHIPPING_METHOD,
} from '@/lib/graphql/mutations';
import {
  ELIGIBLE_SHIPPING_METHODS,
} from '@/lib/graphql/queries';
import {
  SHIPPING_METHOD_QUOTE,
  ORDER_PRICING_SUMMARY,
} from '@/lib/graphql/fragments';

/**
 * GET -> Lista eligibleShippingMethods para la Active Order.
 */
export async function GET(req: NextRequest) {
  const query = `${SHIPPING_METHOD_QUOTE}\n${ELIGIBLE_SHIPPING_METHODS}`;

  const result = await fetchGraphQL({ query }, { req });
  if (result.errors) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const res = NextResponse.json(result.data);
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}

/**
 * POST -> Setea la(s) shipping method(s) en la Active Order.
 * Body esperado:
 *  - { shippingMethodIds: string[] }  // recomendado
 *  - { shippingMethodId: string }     // soportado por compatibilidad
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));

  // Normalizamos: permitir single id o array
  let ids: string[] | undefined = body?.shippingMethodIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    if (typeof body?.shippingMethodId === 'string' && body.shippingMethodId.length > 0) {
      ids = [body.shippingMethodId];
    }
  }

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: 'Missing shippingMethodIds' }, { status: 400 });
  }

  // Componemos la mutation con fragment para devolver pricing actualizado
  const mutation = `${ORDER_PRICING_SUMMARY}\n${SET_ORDER_SHIPPING_METHOD}`;

  const result = await fetchGraphQL(
    { query: mutation, variables: { ids } },
    { req }
  );

  if (result.errors) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const payload = result.data?.setOrderShippingMethod;
  const res = NextResponse.json({ result: payload });
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}
