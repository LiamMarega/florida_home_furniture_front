/**
 * Remembers that an email flow (confirm account, reset password) started at
 * checkout, so the page that finishes it can send the shopper back there.
 * Every storage access is guarded: private mode and blocked storage throw.
 */

const CHECKOUT_RETURN_KEY = 'fhf:checkout-return';
const CHECKOUT_RETURN_TTL_MS = 2 * 60 * 60 * 1000;

export function markCheckoutReturn(): void {
  try {
    window.localStorage.setItem(CHECKOUT_RETURN_KEY, String(Date.now()));
  } catch {
    // Storage unavailable: the flow still works, it just ends on the default page.
  }
}

export function clearCheckoutReturn(): void {
  try {
    window.localStorage.removeItem(CHECKOUT_RETURN_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

/** True when the flag was set within the last 2 hours. Always clears it. */
export function consumeCheckoutReturn(): boolean {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_RETURN_KEY);
    window.localStorage.removeItem(CHECKOUT_RETURN_KEY);
    if (!raw) return false;

    const markedAt = Number(raw);
    const age = Date.now() - markedAt;
    return Number.isFinite(markedAt) && age >= 0 && age <= CHECKOUT_RETURN_TTL_MS;
  } catch {
    return false;
  }
}
