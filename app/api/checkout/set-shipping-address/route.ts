import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import {
  SET_ORDER_SHIPPING_ADDRESS,
  SET_ORDER_BILLING_ADDRESS,
} from '@/lib/graphql/mutations';

function normalizeAddressBody(raw: any) {
  if (raw?.shipping?.streetLine1) return raw;
  const shipping = {
    fullName: raw.shippingFullName ?? raw.fullName,
    streetLine1: raw.shippingStreetLine1,
    streetLine2: raw.shippingStreetLine2,
    city: raw.shippingCity,
    province: raw.shippingProvince,
    postalCode: raw.shippingPostalCode,
    countryCode: raw.shippingCountry,
    phoneNumber: raw.shippingPhoneNumber,
  };
  const billingSameAsShipping =
    typeof raw.billingSameAsShipping === 'boolean' ? raw.billingSameAsShipping : true;
  const billing = raw.billingStreetLine1
    ? {
        fullName: raw.billingFullName ?? raw.fullName,
        streetLine1: raw.billingStreetLine1,
        streetLine2: raw.billingStreetLine2,
        city: raw.billingCity,
        province: raw.billingProvince,
        postalCode: raw.billingPostalCode,
        countryCode: raw.billingCountry,
        phoneNumber: raw.billingPhoneNumber,
      }
    : undefined;
  return { shipping, billingSameAsShipping, billing };
}

export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({} as any));
  const body = normalizeAddressBody(raw);

  // Validación mínima
  if (!body?.shipping?.streetLine1) {
    return NextResponse.json({ error: 'Missing shipping.streetLine1' }, { status: 400 });
  }

  // 1) Shipping
  const shipResult = await fetchGraphQL(
    { query: SET_ORDER_SHIPPING_ADDRESS, variables: { input: body.shipping } },
    { req }
  );
  if (shipResult.errors) {
    return NextResponse.json({ errors: shipResult.errors }, { status: 400 });
  }
  const shippingPayload = shipResult.data?.setOrderShippingAddress;
  if (shippingPayload?.__typename !== 'Order') {
    const res = NextResponse.json({ result: shippingPayload });
    for (const c of shipResult.setCookies ?? []) res.headers.append('Set-Cookie', c);
    return res; // p.ej. NoActiveOrderError
  }

  // 2) Billing
  const billingSame = body.billingSameAsShipping ?? true;
  let finalPayload = shippingPayload;

  if (billingSame) {
    const billResult = await fetchGraphQL(
      { query: SET_ORDER_BILLING_ADDRESS, variables: { input: body.shipping } },
      { req }
    );
    if (billResult.errors) {
      return NextResponse.json({ errors: billResult.errors }, { status: 400 });
    }
    finalPayload = billResult.data?.setOrderBillingAddress ?? finalPayload;
    const res = NextResponse.json({ result: finalPayload });
    for (const c of shipResult.setCookies ?? []) res.headers.append('Set-Cookie', c);
    for (const c of billResult.setCookies ?? []) res.headers.append('Set-Cookie', c);
    return res;
  } else if (body.billing?.streetLine1) {
    const billResult = await fetchGraphQL(
      { query: SET_ORDER_BILLING_ADDRESS, variables: { input: body.billing } },
      { req }
    );
    if (billResult.errors) {
      return NextResponse.json({ errors: billResult.errors }, { status: 400 });
    }
    finalPayload = billResult.data?.setOrderBillingAddress ?? finalPayload;
    const res = NextResponse.json({ result: finalPayload });
    for (const c of shipResult.setCookies ?? []) res.headers.append('Set-Cookie', c);
    for (const c of billResult.setCookies ?? []) res.headers.append('Set-Cookie', c);
    return res;
  }

  const res = NextResponse.json({ result: finalPayload });
  for (const c of shipResult.setCookies ?? []) res.headers.append('Set-Cookie', c);
  return res;
}
