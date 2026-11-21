/**
 * Server-only: adds the Affirm payment to the session's active order, for POST /api/checkout/affirm
 * (the modal's onSuccess, the return page after Affirm's redirect, or a resume after a refresh).
 * A payment is never added from a GET.
 *
 * The backend handler authorizes the checkout token, checks amount and currency against the order
 * and returns the order in PaymentAuthorized; with auto-capture on it captures right after commit,
 * so the order reaches PaymentSettled a moment later. Authorizing is idempotent per order and token,
 * so a `retryable` failure may be retried with the same token. The payment method code comes from the
 * channel's `affirmConfig`, never from the browser.
 */
import { z } from 'zod';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_PAYMENT_TO_ORDER } from '@/lib/graphql/mutations';
import { isAffirmEnabled } from '@/lib/affirm';
import { getAffirmConfig } from '@/lib/affirm-config';
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

  const affirmConfig = await getAffirmConfig();
  if (!affirmConfig.ok) {
    // The backend could not be asked: nothing was sent, so the same token can be sent again.
    return { result: { ok: false, status: 502, error: RETRY_MESSAGE, retryable: true } };
  }
  if (!isAffirmEnabled(affirmConfig.config)) {
    // Affirm was turned off: final for this token (an unauthorized Affirm checkout charges nothing).
    return {
      result: {
        ok: false,
        status: 400,
        error: 'Affirm is not available right now. Please choose another payment method.',
        retryable: false,
      },
    };
  }

  const response = await fetchGraphQL<{ addPaymentToOrder?: AddPaymentToOrderResult }>(
    {
      query: ADD_PAYMENT_TO_ORDER,
      variables: {
        input: { method: affirmConfig.config.methodCode, metadata: { checkoutToken: token.data } },
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

  // The backend's reason (e.g. Affirm's own refusal message) is what diagnoses a failure from these logs; it carries
  // no shopper data.
  const reason =
    'paymentErrorMessage' in payload ? payload.paymentErrorMessage : 'message' in payload ? payload.message : undefined;
  console.warn('Affirm payment not completed:', payload.errorCode, reason ?? '');
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
      // Affirm unreachable or busy, the order changed while paying (cart edited elsewhere, already paid
      // by a concurrent request), or a card payment of the order is in progress. The order's real state
      // decides what happened.
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
      // waiting for a payment, usually because an earlier attempt already paid it or the cart changed.
      return {
        ok: false,
        status: 409,
        error: error.message || 'This order is no longer awaiting payment.',
        retryable: false,
      };
  }
}
