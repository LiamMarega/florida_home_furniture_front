/**
 * Browser-only: sends an Affirm checkout token to POST /api/checkout/affirm and turns the answer into an outcome.
 *
 * Only two answers are final, and both clear the stored token: `paid` (200) and `rejected` (400 not eligible or
 * invalid, 402 declined: that Affirm checkout is over, a new attempt opens a new one). Everything else is
 * `unknown`: the payment may or may not have gone through, so the token stays for a resume and the confirmation
 * page decides from the real order state. Sent with plain fetch, never a React Query mutation, whose global
 * retry would replay it on its own.
 *
 * An unknown answer from a server or network failure schedules an automatic re-send of the same token (see
 * AFFIRM_AUTO_RETRY_DELAYS_MS): Affirm may answer the backend after its timeout, which then recorded an Error, and
 * the backend adopts that late authorization when the same token comes again (authorizing is idempotent per order
 * and token). The page whose order still awaits payment sends it when due (useAffirmResume).
 */
import { clearPendingAffirmToken, type PendingAffirmToken } from '@/lib/checkout/affirm-session';
import { friendlyCheckoutMessage } from '@/lib/checkout/utils';

export const AFFIRM_PAYMENT_FAILED_MESSAGE =
  'Affirm could not complete the payment. You can try again or choose another payment method.';

/**
 * The automatic re-sends after an unknown answer from a server or network failure, each counted from the previous
 * answer. One page load sends a token at most five times on its own: the first send, its immediate retry and these.
 */
export const AFFIRM_AUTO_RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 45_000];

export type AffirmPaymentOutcome =
  | { outcome: 'paid'; orderCode: string }
  | { outcome: 'rejected'; error: string }
  | { outcome: 'unknown' };

/** One POST's answer; `retry` marks a server error, a body that is not the route's JSON, or a network failure. */
type PaymentAttempt =
  | { outcome: 'paid'; orderCode?: string }
  | { outcome: 'rejected'; error?: string }
  | { outcome: 'unknown'; retry: boolean };

/** The response body when it is a JSON object (what the route always sends), otherwise null. */
async function readJsonObject(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function submitCheckoutToken(checkoutToken: string): Promise<PaymentAttempt> {
  let response: Response;
  try {
    response = await fetch('/api/checkout/affirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkoutToken }),
    });
  } catch {
    // Network failure: the request may still have reached the server.
    return { outcome: 'unknown', retry: true };
  }

  const data = await readJsonObject(response);
  if (!data) {
    // A platform or proxy error page (a 504, for example) or a cut-off body, not the route's answer.
    return { outcome: 'unknown', retry: true };
  }
  if (response.status === 200) {
    return { outcome: 'paid', orderCode: typeof data.orderCode === 'string' ? data.orderCode : undefined };
  }
  if (response.status === 400 || response.status === 402) {
    return { outcome: 'rejected', error: typeof data.error === 'string' ? data.error : undefined };
  }
  // 409 (the order is no longer awaiting this payment) and any other status: retry server errors only.
  return { outcome: 'unknown', retry: response.status >= 500 };
}

// Tokens sent from this page load, by any flow. An automatic resume never sends one again: a reload does.
const sentTokens = new Set<string>();

/** Per token: the automatic re-sends started from this page load, and when the next one is due (null: none). */
interface AutoRetry {
  count: number;
  dueAt: number | null;
}
const autoRetries = new Map<string, AutoRetry>();

function setAutoRetry(token: string, retry: AutoRetry | null): void {
  if (retry) {
    autoRetries.set(token, retry);
  } else {
    autoRetries.delete(token);
  }
  resumeListeners.forEach((listener) => listener());
}

/**
 * When the next automatic re-send of `token` is due (epoch ms), or null: none scheduled, one running, or all used.
 * Observable with subscribeAffirmResumes.
 */
export function affirmAutoRetryDueAt(token: string | null | undefined): number | null {
  return token ? (autoRetries.get(token)?.dueAt ?? null) : null;
}

/**
 * Sends a pending token, then clears the stored token on a final answer. The first send (and a manual resend) is
 * retried once right away after a server or network failure; an automatic re-send (`auto`) is not, its schedule
 * is the retry. A server or network failure schedules the next automatic re-send while any is left; a 409 (the
 * order no longer awaits this payment) does not: the page checks the order instead. Never throws: anything
 * unexpected is an unknown outcome, and the token stays for a later resume.
 */
export async function finishAffirmPayment(
  pending: PendingAffirmToken,
  options: { auto?: boolean } = {}
): Promise<AffirmPaymentOutcome> {
  sentTokens.add(pending.token);
  const count = (autoRetries.get(pending.token)?.count ?? 0) + (options.auto ? 1 : 0);
  // Nothing else is due while this send runs.
  setAutoRetry(pending.token, { count, dueAt: null });
  try {
    let attempt = await submitCheckoutToken(pending.token);
    if (!options.auto && attempt.outcome === 'unknown' && attempt.retry) {
      attempt = await submitCheckoutToken(pending.token);
    }
    if (attempt.outcome === 'unknown') {
      const delay = attempt.retry ? AFFIRM_AUTO_RETRY_DELAYS_MS[count] : undefined;
      setAutoRetry(pending.token, { count, dueAt: delay === undefined ? null : Date.now() + delay });
      return { outcome: 'unknown' };
    }
    setAutoRetry(pending.token, null);
    clearPendingAffirmToken({ token: pending.token });
    return attempt.outcome === 'paid'
      ? { outcome: 'paid', orderCode: attempt.orderCode || pending.orderCode }
      : { outcome: 'rejected', error: friendlyCheckoutMessage(attempt.error, AFFIRM_PAYMENT_FAILED_MESSAGE) };
  } catch (error) {
    console.error('Affirm payment confirmation failed:', error);
    return { outcome: 'unknown' };
  }
}

/**
 * A pending token sent again by a page (checkout, confirmation, Affirm's return page), observable by every
 * component of the page. `id` grows with each resume of the page load.
 */
export type AffirmResume =
  | { id: number; orderCode: string; status: 'sending' }
  | { id: number; orderCode: string; status: 'done'; outcome: AffirmPaymentOutcome };

let lastResumeId = 0;
// The latest resume of each order code.
const resumes = new Map<string, AffirmResume>();
const resumeListeners = new Set<() => void>();

function setResume(resume: AffirmResume): void {
  resumes.set(resume.orderCode, resume);
  resumeListeners.forEach((listener) => listener());
}

/** Whether `token` may be resumed automatically: not sent from this page load yet. */
export function canResumeAffirmToken(token: string): boolean {
  return !sentTokens.has(token);
}

/**
 * Sends a pending token again (see finishAffirmPayment; `auto` for a scheduled automatic re-send) and calls
 * `onSettled` once with the outcome, even if the page that started it is gone. Returns false, sending nothing,
 * when a token of the order is already being sent or (unless `force`) this one was sent from this page load.
 */
export function resumeAffirmPayment(
  pending: PendingAffirmToken,
  onSettled: (outcome: AffirmPaymentOutcome) => void,
  options: { force?: boolean; auto?: boolean } = {}
): boolean {
  const current = resumes.get(pending.orderCode);
  if (current?.status === 'sending' || (!options.force && sentTokens.has(pending.token))) {
    return false;
  }
  const id = ++lastResumeId;
  setResume({ id, orderCode: pending.orderCode, status: 'sending' });
  void finishAffirmPayment(pending, { auto: options.auto }).then((outcome) => {
    setResume({ id, orderCode: pending.orderCode, status: 'done', outcome });
    onSettled(outcome);
  });
  return true;
}

/** The latest resume of `orderCode` from this page load. */
export function getAffirmResume(orderCode: string | null | undefined): AffirmResume | undefined {
  return orderCode ? resumes.get(orderCode) : undefined;
}

/** The id of the latest resume so far, so a page can ignore the ones started before it. */
export function latestAffirmResumeId(): number {
  return lastResumeId;
}

export function subscribeAffirmResumes(onChange: () => void): () => void {
  resumeListeners.add(onChange);
  return () => {
    resumeListeners.delete(onChange);
  };
}
