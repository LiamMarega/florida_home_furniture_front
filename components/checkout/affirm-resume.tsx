'use client';

import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { cartKeys } from '@/hooks/use-cart';
import {
  acquirePaymentLock,
  letPaymentLockExpire,
  releasePaymentLock,
  usePaymentLock,
} from '@/hooks/use-payment-lock';
import {
  clearPendingAffirmToken,
  pendingAffirmOrderSnapshot,
  pendingAffirmTokenSnapshot,
  readPendingAffirmToken,
  subscribePendingAffirmToken,
  type PendingAffirmToken,
} from '@/lib/checkout/affirm-session';
import {
  canResumeAffirmToken,
  getAffirmResume,
  latestAffirmResumeId,
  resumeAffirmPayment,
  subscribeAffirmResumes,
  type AffirmPaymentOutcome,
  type AffirmResume,
} from '@/lib/checkout/affirm-token';

/**
 * What a page does with a pending Affirm token of its order:
 * - resume: the order still awaits payment, so the token is sent now (once per page load)
 * - discard: the order was placed, cancelled or changed, so the token is obsolete
 * - wait: nothing yet (the order is not known, or a card payment decides)
 */
export type AffirmResumeAction = 'resume' | 'discard' | 'wait';

interface UseAffirmResumeOptions {
  orderCode: string | null | undefined;
  action: AffirmResumeAction;
  /** Called once per resume started on this page, with its outcome; a final one already cleared the token. */
  onOutcome?: (outcome: AffirmPaymentOutcome, orderCode: string) => void;
}

export interface AffirmResumeState {
  /** This browser holds a fresh Affirm token of the order that was not settled yet. */
  hasPendingToken: boolean;
  /** The page is sending it now ("Finishing your Affirm payment…"). */
  finishing: boolean;
  /** The outcome of the latest resume started on this page; null before. */
  outcome: AffirmPaymentOutcome | null;
  /** Another tab is paying this order, so nothing is sent from here. */
  lockedElsewhere: boolean;
  /** Sends the pending token again now (a manual status check); false when there is none or it is being sent. */
  resend: () => boolean;
}

/**
 * Sends a pending token again under this tab's payment lock, then releases the lock on a final outcome or lets
 * it expire on an unknown one. False when another tab is paying the order, or (unless `force`) the token was
 * already sent from this page load.
 */
export function startAffirmResume(pending: PendingAffirmToken, force = false): boolean {
  if (!force && !canResumeAffirmToken(pending.token)) return false;
  if (!acquirePaymentLock(pending.orderCode, 'affirm')) return false;
  return resumeAffirmPayment(
    pending,
    (outcome) => {
      if (outcome.outcome === 'unknown') {
        letPaymentLockExpire(pending.orderCode);
      } else {
        releasePaymentLock(pending.orderCode);
      }
    },
    { force }
  );
}

function getNoToken(): string | null {
  return null;
}

function getNoResume(): AffirmResume | undefined {
  return undefined;
}

/**
 * Finishes an Affirm payment this browser started but never settled (a refresh, a closed tab, a lost answer):
 * when the page's order still awaits payment and no other tab is paying it, the stored token is sent again,
 * once per page load. Authorizing is idempotent per order and token on the backend, so this can never pay twice.
 */
export function useAffirmResume({ orderCode, action, onOutcome }: UseAffirmResumeOptions): AffirmResumeState {
  const queryClient = useQueryClient();
  const lockedElsewhere = usePaymentLock(orderCode) === 'elsewhere';

  const getPendingSnapshot = useCallback(() => pendingAffirmTokenSnapshot(orderCode), [orderCode]);
  const pendingToken = useSyncExternalStore(subscribePendingAffirmToken, getPendingSnapshot, getNoToken);

  const getResumeSnapshot = useCallback(() => getAffirmResume(orderCode), [orderCode]);
  const resume = useSyncExternalStore(subscribeAffirmResumes, getResumeSnapshot, getNoResume);
  // Resumes started before this page mounted belong to an earlier page of the visit.
  const [firstResumeId] = useState(latestAffirmResumeId);
  const ownResume = resume && resume.id > firstResumeId ? resume : undefined;

  const start = useCallback(
    (force: boolean): boolean => {
      const pending = orderCode ? readPendingAffirmToken(orderCode) : null;
      return pending ? startAffirmResume(pending, force) : false;
    },
    [orderCode]
  );

  useEffect(() => {
    if (!orderCode || !pendingToken || lockedElsewhere) return;
    if (action === 'discard') {
      clearPendingAffirmToken({ orderCode });
    } else if (action === 'resume') {
      start(false);
    }
  }, [orderCode, pendingToken, action, lockedElsewhere, start]);

  const handleOutcome = useEffectEvent((outcome: AffirmPaymentOutcome, code: string) => {
    if (outcome.outcome !== 'rejected') {
      // The order may have left the cart.
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
    }
    onOutcome?.(outcome, code);
  });

  const handledResumeId = useRef(0);
  useEffect(() => {
    if (ownResume?.status !== 'done' || handledResumeId.current >= ownResume.id) return;
    handledResumeId.current = ownResume.id;
    handleOutcome(ownResume.outcome, ownResume.orderCode);
  }, [ownResume]);

  return {
    hasPendingToken: pendingToken !== null,
    finishing: ownResume?.status === 'sending',
    outcome: ownResume?.status === 'done' ? ownResume.outcome : null,
    lockedElsewhere,
    resend: () => start(true),
  };
}

/**
 * The order of this browser's fresh pending Affirm token, whatever order the page is about: after a refresh
 * mid-payment the order may already be placed, so it is no longer the active order.
 */
export function usePendingAffirmOrder(): string | null {
  return useSyncExternalStore(subscribePendingAffirmToken, pendingAffirmOrderSnapshot, getNoToken);
}

/** "Finishing your Affirm payment…" while a stored token is being sent. */
export function AffirmFinishingNotice({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 p-4 border rounded-lg bg-amber-50 border-amber-200 ${className ?? ''}`}
    >
      <Loader2 className="w-5 h-5 shrink-0 text-amber-700 animate-spin" aria-hidden="true" />
      <p className="text-sm text-amber-800">Finishing your Affirm payment…</p>
    </div>
  );
}
