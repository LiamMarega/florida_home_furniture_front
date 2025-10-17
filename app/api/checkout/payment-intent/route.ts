// app/api/checkout/payment-intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

const CREATE_PAYMENT_INTENT = `
  mutation CreateStripePaymentIntent($orderCode: String!) {
    createStripePaymentIntent(orderCode: $orderCode)
  }
`;

export async function POST(req: NextRequest) {
  const { orderCode } = await req.json();

  const response = await fetchGraphQL({
    query: CREATE_PAYMENT_INTENT,
    variables: { orderCode },
  });

  const clientSecret = response.data?.createStripePaymentIntent;

  if (!clientSecret) {
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 400 });
  }

  return NextResponse.json({ clientSecret });
}
