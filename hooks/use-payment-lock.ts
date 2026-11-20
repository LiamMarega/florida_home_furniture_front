import { useCallback, useSyncExternalStore } from 'react';

/**
 * Cross-tab payment lock, per order: while a card or Affirm payment is in flight in one tab, the other tabs of
 * this browser see it and disable their pay actions, so one shopper cannot start two payments for the same order.
 *
 * The lock lives in localStorage (`{ tabId, kind, expiresAt }`), so a tab opened later sees it too; changes are
 * announced on a BroadcastChannel (and seen through `storage` events where it is missing). The holder refreshes
 * it every 15 s; it expires 90 s after the last refresh, so a closed or crashed tab never blocks the order for
 * long. It is released on a final outcome, and left to expire when the outcome is unknown.
 *
 * Best effort by design: localStorage is not a mutex, and without storage nothing is locked. The real protection
 * against paying twice is server-side (the order lock, card/Affirm exclusivity, idempotent Affirm tokens).
 */

export type PaymentKind = 'card' | 'affirm';
/** 'free': nobody is paying; 'mine': this tab is paying; 'elsewhere': another tab is paying this order. */
export type PaymentLockState = 'free' | 'mine' | 'elsewhere';

const KEY_PREFIX = 'fh:payment-lock:';
// Per tab and kept across reloads, so a tab that reloads mid-payment still owns its lock.
const TAB_ID_KEY = 'fh:payment-tab-id';
const CHANNEL_NAME = 'fh:payment-lock';
const LOCK_TTL_MS = 90_000;
const HEARTBEAT_MS = 15_000;
// How often subscribers re-check, so an expired lock frees the other tabs without any event.
const RECHECK_MS = 5_000;
// Never refreshed past this, even if nothing ends the attempt (an Affirm window left open).
const MAX_HOLD_MS = 30 * 60_000;

interface StoredLock {
  tabId: string;
  kind: PaymentKind;
  expiresAt: number;
}

const localListeners = new Set<() => void>();
const heartbeats = new Map<string, number>();
let channel: BroadcastChannel | null | undefined;
let tabId: string | null = null;

function lockKey(orderCode: string): string {
  return `${KEY_PREFIX}${orderCode}`;
}

function currentTabId(): string {
  if (tabId) return tabId;
  let id: string | null = null;
  try {
    id = window.sessionStorage.getItem(TAB_ID_KEY);
  } catch {
    // Storage blocked: an id for this page only.
  }
  if (!id) {
    id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    try {
      window.sessionStorage.setItem(TAB_ID_KEY, id);
    } catch {
      // Same as above.
    }
  }
  tabId = id;
  return id;
}

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);
    channel?.addEventListener('message', notifyLocal);
  }
  return channel;
}

function notifyLocal(): void {
  localListeners.forEach((listener) => listener());
}

/** Tells this tab's subscribers and the other tabs that the lock of `orderCode` changed. */
function announce(orderCode: string): void {
  notifyLocal();
  try {
    getChannel()?.postMessage(orderCode);
  } catch {
    // Channel closed or unavailable: other tabs still see the `storage` event.
  }
}

function readLock(orderCode: string): StoredLock | null {
  try {
    const raw = window.localStorage.getItem(lockKey(orderCode));
    if (!raw) return null;
    const lock = JSON.parse(raw) as Partial<StoredLock>;
    if (
      typeof lock.tabId === 'string' &&
      (lock.kind === 'card' || lock.kind === 'affirm') &&
      typeof lock.expiresAt === 'number' &&
      Number.isFinite(lock.expiresAt)
    ) {
      return { tabId: lock.tabId, kind: lock.kind, expiresAt: lock.expiresAt };
    }
  } catch {
    // Unreadable: treated as free.
  }
  return null;
}

function writeLock(orderCode: string, lock: StoredLock): boolean {
  try {
    window.localStorage.setItem(lockKey(orderCode), JSON.stringify(lock));
    return true;
  } catch {
    return false;
  }
}

function stopHeartbeat(orderCode: string): void {
  const timer = heartbeats.get(orderCode);
  if (timer !== undefined) {
    window.clearInterval(timer);
    heartbeats.delete(orderCode);
  }
}

function startHeartbeat(orderCode: string, startedAt: number): void {
  stopHeartbeat(orderCode);
  const timer = window.setInterval(() => {
    const lock = readLock(orderCode);
    if (!lock || lock.tabId !== currentTabId() || Date.now() - startedAt > MAX_HOLD_MS) {
      stopHeartbeat(orderCode);
      return;
    }
    writeLock(orderCode, { ...lock, expiresAt: Date.now() + LOCK_TTL_MS });
  }, HEARTBEAT_MS);
  heartbeats.set(orderCode, timer);
}

/**
 * Claims the order's payment lock for this tab before a payment starts. False when another tab is paying this
 * order: the payment must not start. Without storage it returns true (the lock is best effort).
 */
export function acquirePaymentLock(orderCode: string, kind: PaymentKind): boolean {
  if (typeof window === 'undefined') return true;
  const self = currentTabId();
  const now = Date.now();
  const current = readLock(orderCode);
  if (current && current.expiresAt > now && current.tabId !== self) {
    return false;
  }
  if (!writeLock(orderCode, { tabId: self, kind, expiresAt: now + LOCK_TTL_MS })) {
    return true;
  }
  // Another tab may have written in between; the last write wins.
  if (readLock(orderCode)?.tabId !== self) {
    return false;
  }
  startHeartbeat(orderCode, now);
  announce(orderCode);
  return true;
}

/** Final outcome (paid, declined, closed): frees the order for every tab. */
export function releasePaymentLock(orderCode: string): void {
  if (typeof window === 'undefined') return;
  stopHeartbeat(orderCode);
  if (readLock(orderCode)?.tabId === currentTabId()) {
    try {
      window.localStorage.removeItem(lockKey(orderCode));
    } catch {
      // Nothing stored.
    }
  }
  announce(orderCode);
}

/** Unknown outcome: stops refreshing the lock, which other tabs keep seeing until it expires. */
export function letPaymentLockExpire(orderCode: string): void {
  if (typeof window === 'undefined') return;
  stopHeartbeat(orderCode);
}

function lockStateOf(orderCode: string | null | undefined): PaymentLockState {
  if (!orderCode || typeof window === 'undefined') return 'free';
  const lock = readLock(orderCode);
  if (!lock || lock.expiresAt <= Date.now()) return 'free';
  return lock.tabId === currentTabId() ? 'mine' : 'elsewhere';
}

function subscribeToLock(orderCode: string | null | undefined, onChange: () => void): () => void {
  if (!orderCode || typeof window === 'undefined') return () => {};
  getChannel();
  localListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === lockKey(orderCode)) onChange();
  };
  window.addEventListener('storage', onStorage);
  const timer = window.setInterval(onChange, RECHECK_MS);
  return () => {
    localListeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
    window.clearInterval(timer);
  };
}

/** The payment lock of `orderCode` as this tab sees it, updated live. 'free' on the server. */
export function usePaymentLock(orderCode: string | null | undefined): PaymentLockState {
  const subscribe = useCallback((onChange: () => void) => subscribeToLock(orderCode, onChange), [orderCode]);
  const getSnapshot = useCallback(() => lockStateOf(orderCode), [orderCode]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerLockState);
}

function getServerLockState(): PaymentLockState {
  return 'free';
}
