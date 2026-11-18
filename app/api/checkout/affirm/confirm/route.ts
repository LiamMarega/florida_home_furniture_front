import { NextRequest, NextResponse } from 'next/server';
import { forwardCookies } from '@/lib/api-utils';
import { addAffirmPayment } from '@/lib/checkout/affirm-payment';

export const dynamic = 'force-dynamic';

/**
 * GET ?checkout_token=... -> redirect fallback for the checkout object's `user_confirmation_url`
 * (`user_confirmation_url_action: 'GET'`), used only if affirm.js submits there instead of calling
 * `onSuccess`. Adds the payment, then sends the customer to the confirmation page, or back to the
 * checkout with a notice (`check` when the order is no longer awaiting payment, e.g. already paid).
 */
export async function GET(req: NextRequest) {
  const { result, setCookies } = await addAffirmPayment(req, req.nextUrl.searchParams.get('checkout_token'));

  let target: string;
  if (result.ok) {
    target = `/checkout/confirmation/${encodeURIComponent(result.orderCode)}`;
  } else {
    target = result.status === 409 ? '/checkout?affirm=check' : '/checkout?affirm=failed';
  }

  const res = NextResponse.redirect(new URL(target, req.nextUrl.origin), 303);
  forwardCookies(res, { setCookies });
  return res;
}
