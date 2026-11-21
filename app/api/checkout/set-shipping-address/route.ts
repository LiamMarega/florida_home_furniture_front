import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import {
  SET_ORDER_SHIPPING_ADDRESS,
  SET_ORDER_BILLING_ADDRESS,
} from '@/lib/graphql/mutations';
import { addressErrorMessage } from '@/lib/checkout/utils';

/** The state code from the form's state select, without stray spaces from older clients. */
function trimmed(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeAddressBody(raw: any) {
  if (raw?.shipping?.streetLine1) return raw;
  const shipping = {
    fullName: raw.shippingFullName ?? raw.fullName,
    streetLine1: raw.shippingStreetLine1,
    streetLine2: raw.shippingStreetLine2,
    city: raw.shippingCity,
    province: trimmed(raw.shippingProvince),
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
        province: trimmed(raw.billingProvince),
        postalCode: raw.billingPostalCode,
        // The billing form has no country input; the store ships within the US only.
        countryCode: raw.billingCountry || raw.shippingCountry || 'US',
        phoneNumber: raw.billingPhoneNumber,
      }
    : undefined;
  return { shipping, billingSameAsShipping, billing };
}

/**
 * POST the checkout form (or `{ shipping, billingSameAsShipping, billing }`) -> sets the active order's shipping and
 * billing addresses. A refused address answers 400 `{ error }` with a readable message that names the address
 * (Vendure's errors stay in the server logs).
 */
export async function POST(req: NextRequest) {
  const raw = await req.json().catch(() => ({} as any));
  const body = normalizeAddressBody(raw);

  // Validación mínima
  if (!body?.shipping?.streetLine1) {
    return NextResponse.json({ error: 'Please enter your street address.' }, { status: 400 });
  }

  // 1) Shipping
  const shipResult = await fetchGraphQL(
    { query: SET_ORDER_SHIPPING_ADDRESS, variables: { input: body.shipping } },
    { req }
  );
  if (shipResult.errors) {
    console.error('Failed to set the order shipping address:', shipResult.errors[0]?.message);
    return NextResponse.json({ error: addressErrorMessage(shipResult.errors, 'shipping') }, { status: 400 });
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
      console.error('Failed to set the order billing address:', billResult.errors[0]?.message);
      return NextResponse.json({ error: addressErrorMessage(billResult.errors, 'billing') }, { status: 400 });
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
      console.error('Failed to set the order billing address:', billResult.errors[0]?.message);
      return NextResponse.json({ error: addressErrorMessage(billResult.errors, 'billing') }, { status: 400 });
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
