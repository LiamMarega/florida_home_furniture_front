/**
 * Browser-only Affirm checkout state, kept in this browser's localStorage so an Affirm payment survives a refresh,
 * a closed tab or Affirm's redirect back to the store:
 *
 * - The pending checkout token: saved the moment Affirm approves (before it is sent to the store), bound to its
 *   order code, kept 30 minutes and cleared on any final answer. It is not a payment secret: only the store's
 *   backend, holding Affirm's private key, can turn it into a charge, and only for that order.
 * - The "Affirm opened" marker: the order this browser opened Affirm for, set right before Affirm opens and kept
 *   one hour. Affirm's redirect back (/checkout/affirm/return) is honored only with it, so a crafted link cannot
 *   submit a token on someone's order. It is single use.
 *
 * Every access is guarded: without storage (private mode, blocked site data) payments still work; only the
 * resume after a refresh is lost. Nothing here runs on import.
 */

const PENDING_KEY = 'fh:affirm-pending-token';
const OPENED_KEY = 'fh:affirm-opened';
const PENDING_TOKEN_TTL_MS = 30 * 60 * 1000;
const OPENED_MARKER_TTL_MS = 60 * 60 * 1000;

/** Same format the storefront route and the backend handler accept. */
export const AFFIRM_TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ORDER_CODE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export interface PendingAffirmToken {
  orderCode: string;
  token: string;
  createdAt: number;
}

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function getItem(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // No storage: the payment still goes on, it just cannot be resumed after a refresh.
  }
}

function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing stored.
  }
}

/** Fresh: created within `ttl` (a clock moved back by a minute or less still counts). */
function isFresh(createdAt: number, ttl: number): boolean {
  const age = Date.now() - createdAt;
  return age > -60_000 && age < ttl;
}

function parsePending(raw: string | null): PendingAffirmToken | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingAffirmToken>;
    if (
      typeof value.orderCode === 'string' &&
      ORDER_CODE_PATTERN.test(value.orderCode) &&
      typeof value.token === 'string' &&
      AFFIRM_TOKEN_PATTERN.test(value.token) &&
      typeof value.createdAt === 'number' &&
      Number.isFinite(value.createdAt)
    ) {
      return { orderCode: value.orderCode, token: value.token, createdAt: value.createdAt };
    }
  } catch {
    // Not ours or corrupted.
  }
  return null;
}

/** Saves the token Affirm just approved for `orderCode`, replacing any earlier one. */
export function savePendingAffirmToken(orderCode: string, token: string): PendingAffirmToken {
  const pending: PendingAffirmToken = { orderCode, token, createdAt: Date.now() };
  if (ORDER_CODE_PATTERN.test(orderCode) && AFFIRM_TOKEN_PATTERN.test(token)) {
    setItem(PENDING_KEY, JSON.stringify(pending));
    notify();
  }
  return pending;
}

/**
 * The fresh pending token (of `orderCode` when given). An expired or unreadable entry is removed on the way.
 */
export function readPendingAffirmToken(orderCode?: string | null): PendingAffirmToken | null {
  const raw = getItem(PENDING_KEY);
  const pending = parsePending(raw);
  if (!pending || !isFresh(pending.createdAt, PENDING_TOKEN_TTL_MS)) {
    if (raw !== null) {
      removeItem(PENDING_KEY);
      notify();
    }
    return null;
  }
  return !orderCode || pending.orderCode === orderCode ? pending : null;
}

/** Removes the pending token when it matches (by token, or every token of an order). */
export function clearPendingAffirmToken(match: { token?: string; orderCode?: string }): void {
  const pending = parsePending(getItem(PENDING_KEY));
  if (!pending) return;
  if ((match.token && pending.token !== match.token) || (match.orderCode && pending.orderCode !== match.orderCode)) {
    return;
  }
  removeItem(PENDING_KEY);
  notify();
}

/** For useSyncExternalStore: the token of `orderCode`'s fresh pending token, or null. Never writes. */
export function pendingAffirmTokenSnapshot(orderCode: string | null | undefined): string | null {
  if (!orderCode) return null;
  const pending = parsePending(getItem(PENDING_KEY));
  return pending && pending.orderCode === orderCode && isFresh(pending.createdAt, PENDING_TOKEN_TTL_MS)
    ? pending.token
    : null;
}

/** For useSyncExternalStore: the order code of the fresh pending token, whatever its order, or null. */
export function pendingAffirmOrderSnapshot(): string | null {
  const pending = parsePending(getItem(PENDING_KEY));
  return pending && isFresh(pending.createdAt, PENDING_TOKEN_TTL_MS) ? pending.orderCode : null;
}

/** Calls `onChange` when the pending token changes, in this tab or another. */
export function subscribePendingAffirmToken(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PENDING_KEY) onChange();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** Right before Affirm opens: this browser started Affirm for `orderCode`. */
export function markAffirmOpened(orderCode: string): void {
  if (ORDER_CODE_PATTERN.test(orderCode)) {
    setItem(OPENED_KEY, JSON.stringify({ orderCode, openedAt: Date.now() }));
  }
}

/** Affirm answered through its callbacks (or was cancelled): no redirect back is expected anymore. */
export function clearAffirmOpenedMarker(): void {
  if (typeof window !== 'undefined') removeItem(OPENED_KEY);
}

export type AffirmReturnCheck = { kind: 'accepted'; orderCode: string; token: string } | { kind: 'unverified' };

/**
 * Whether Affirm's redirect back (`?checkout_token=...` on /checkout/affirm/return) may be sent: only a
 * well-formed token, and only with this browser's fresh "Affirm opened" marker (consumed here) or the very same
 * token already stored by this browser (a reload of the return page). Anything else is unverified, so a crafted
 * link sends nothing. The backend still checks that the Affirm checkout belongs to the order and its total.
 */
export function checkAffirmReturn(search: string): AffirmReturnCheck {
  const token = new URLSearchParams(search).get('checkout_token');
  if (!token || !AFFIRM_TOKEN_PATTERN.test(token)) {
    return { kind: 'unverified' };
  }
  const pending = readPendingAffirmToken();
  if (pending && pending.token === token) {
    return { kind: 'accepted', orderCode: pending.orderCode, token };
  }
  const orderCode = takeAffirmOpenedMarker();
  return orderCode ? { kind: 'accepted', orderCode, token } : { kind: 'unverified' };
}

/** The order this browser opened Affirm for within the last hour, consuming the marker (single use). */
export function takeAffirmOpenedMarker(): string | null {
  const raw = getItem(OPENED_KEY);
  if (raw === null) return null;
  removeItem(OPENED_KEY);
  try {
    const marker = JSON.parse(raw) as { orderCode?: unknown; openedAt?: unknown };
    if (
      typeof marker.orderCode === 'string' &&
      ORDER_CODE_PATTERN.test(marker.orderCode) &&
      typeof marker.openedAt === 'number' &&
      isFresh(marker.openedAt, OPENED_MARKER_TTL_MS)
    ) {
      return marker.orderCode;
    }
  } catch {
    // Corrupted marker: treated as absent.
  }
  return null;
}
