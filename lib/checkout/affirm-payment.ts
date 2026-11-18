/**
 * Server-only: adds the Affirm payment to the session's active order. Shared by the modal flow
 * (POST /api/checkout/affirm) and the redirect fallback (GET /api/checkout/affirm/confirm).
 *
 * The backend handler authorizes the checkout token, checks amount and currency against the order
 * and captures it when auto-capture is on. Authorizing is idempotent per order and token, so a
 * `retryable` failure may be retried with the same token.
 */
import { z } from 'zod';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_PAYMENT_TO_ORDER } from '@/lib/graphql/mutations';
import { AFFIRM_PAYMENT_METHOD_CODE } from '@/lib/affirm';
import type { AddPaymentToOrderResult, Order } from '@/lib/types';

// Same format the backend handler accepts.
const checkoutTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

const RETRY_MESSAGE = 'We could not confirm your Affirm payment. Please try again in a moment.';

export type AffirmPaymentResult =
  | { ok: true; orderCode: string; state: string }
  | { ok: false; status: 400 | 402 | 409 | 502; error: string; retryable: boolean };

export interface AffirmPaymentOutcome {
  result: AffirmPaymentResult;
  /** Set-Cookie headers from Vendure, to forward on the route response. */
  setCookies?: string[];
}

export async function addAffirmPayment(req: Request, checkoutToken: unknown): Promise<AffirmPaymentOutcome> {
  const token = checkoutTokenSchema.safeParse(checkoutToken);
  if (!token.success) {
    return {
      result: { ok: false, status: 400, error: 'A valid Affirm checkout token is required.', retryable: false },
    };
  }

  const response = await fetchGraphQL<{ addPaymentToOrder?: AddPaymentToOrderResult }>(
    {
      query: ADD_PAYMENT_TO_ORDER,
      variables: {
        input: { method: AFFIRM_PAYMENT_METHOD_CODE, metadata: { checkoutToken: token.data } },
      },
    },
    { req }
  );
  const setCookies = response.setCookies;
  const payload = response.data?.addPaymentToOrder;

  if (response.errors?.length || !payload) {
    // Transport or GraphQL error: the outcome is unknown, retrying with the same token is safe.
    console.error('Affirm addPaymentToOrder failed:', response.errors?.map((e) => e.message) ?? 'empty response');
    return { result: { ok: false, status: 502, error: RETRY_MESSAGE, retryable: true }, setCookies };
  }

  if (!('errorCode' in payload)) {
    return { result: { ok: true, orderCode: payload.code, state: payload.state }, setCookies };
  }

  console.warn('Affirm payment not completed:', payload.errorCode);
  return { result: toFailure(payload), setCookies };
}

function toFailure(error: Exclude<AddPaymentToOrderResult, Order>): AffirmPaymentResult {
  switch (error.errorCode) {
    case 'PAYMENT_DECLINED_ERROR':
      // Affirm refused, or the authorized amount did not match the order total. Needs a new checkout.
      return {
        ok: false,
        status: 402,
        error: error.paymentErrorMessage || 'Affirm declined the payment.',
        retryable: false,
      };
    case 'PAYMENT_FAILED_ERROR':
      // Affirm unreachable or failing.
      return { ok: false, status: 502, error: error.paymentErrorMessage || RETRY_MESSAGE, retryable: true };
    case 'INELIGIBLE_PAYMENT_METHOD_ERROR':
      return {
        ok: false,
        status: 400,
        error: error.eligibilityCheckerMessage || 'Affirm is not available for this order.',
        retryable: false,
      };
    default:
      // OrderPaymentStateError, OrderStateTransitionError, NoActiveOrderError: the order is no longer
      // waiting for a payment, usually because an earlier attempt already paid it.
      return {
        ok: false,
        status: 409,
        error: error.message || 'This order is no longer awaiting payment.',
        retryable: false,
      };
  }
}
