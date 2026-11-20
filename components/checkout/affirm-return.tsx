'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { startAffirmResume, useAffirmResume } from '@/components/checkout/affirm-resume';
import {
  checkAffirmReturn,
  readPendingAffirmToken,
  savePendingAffirmToken,
  type AffirmReturnCheck,
} from '@/lib/checkout/affirm-session';

// What Affirm's redirect brought back (see checkAffirmReturn), decided once per page load and kept: the check
// consumes the single-use "Affirm opened" marker, and React may read the result as often as it likes.
let returnCheck: AffirmReturnCheck | null = null;

function readReturnCheck(): AffirmReturnCheck {
  returnCheck ??= checkAffirmReturn(window.location.search);
  return returnCheck;
}

function subscribeNever(): () => void {
  return () => {};
}

function getServerCheck(): AffirmReturnCheck | null {
  return null;
}

function Screen({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-28 pb-12 flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 w-full">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">{icon}</div>
          <h1 className="text-3xl font-bold text-brand-dark-blue mb-4 font-tango-sans">{title}</h1>
          {children}
        </Card>
      </div>
    </div>
  );
}

/**
 * Affirm's confirmation URL. Affirm only lands here if it redirects instead of calling the modal's callbacks.
 * With a verified token it does what the modal's onSuccess does: stores the token, sends it, and moves on to
 * the order's confirmation page (or shows why Affirm was not completed).
 */
export function AffirmReturn() {
  const router = useRouter();
  const check = useSyncExternalStore(subscribeNever, readReturnCheck, getServerCheck);
  const accepted = check?.kind === 'accepted' ? check : null;

  const resume = useAffirmResume({
    orderCode: accepted?.orderCode,
    // Sent below from the URL's token, so this works even without storage.
    action: 'wait',
    onOutcome: (outcome, orderCode) => {
      if (outcome.outcome === 'paid') {
        router.replace(`/checkout/confirmation/${outcome.orderCode}`);
      } else if (outcome.outcome === 'unknown') {
        // The confirmation page decides from the real order state.
        router.replace(`/checkout/confirmation/${orderCode}`);
      }
    },
  });
  const { lockedElsewhere } = resume;

  useEffect(() => {
    if (!accepted || lockedElsewhere) return;
    // Stored before it is sent, like the modal's onSuccess: a reload or a lost answer can resume it.
    const stored = readPendingAffirmToken(accepted.orderCode);
    const pending =
      stored && stored.token === accepted.token ? stored : savePendingAffirmToken(accepted.orderCode, accepted.token);
    startAffirmResume(pending);
  }, [accepted, lockedElsewhere]);

  if (!check) {
    return (
      <Screen icon={<Loader2 className="w-12 h-12 text-gray-400 animate-spin" />} title="Returning from Affirm...">
        <p className="text-brand-dark-blue/70">Please wait a moment.</p>
      </Screen>
    );
  }

  if (!accepted) {
    return (
      <Screen
        icon={
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-gray-600" />
          </div>
        }
        title="Return to Checkout"
      >
        <p className="text-lg text-brand-dark-blue/70 mb-8">
          We couldn&apos;t match this Affirm checkout to a payment started in this browser, so nothing was
          charged from this page. Please return to checkout to continue.
        </p>
        <Button asChild size="lg">
          <Link href="/checkout">Return to checkout</Link>
        </Button>
      </Screen>
    );
  }

  if (resume.outcome?.outcome === 'rejected') {
    return (
      <Screen
        icon={
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
        }
        title="Affirm Payment Not Completed"
      >
        <p className="text-lg text-brand-dark-blue/70 mb-4">{resume.outcome.error}</p>
        <p className="text-sm text-brand-dark-blue/70 mb-8">
          You can return to checkout to try again or choose another payment method.
        </p>
        <Button asChild size="lg">
          <Link href="/checkout">Return to checkout</Link>
        </Button>
      </Screen>
    );
  }

  if (lockedElsewhere && !resume.finishing) {
    return (
      <Screen
        icon={
          <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-yellow-600" />
          </div>
        }
        title="Payment in Progress"
      >
        <p className="text-lg text-brand-dark-blue/70 mb-8">
          A payment for this order is in progress in another tab. We&apos;ll finish your Affirm payment here as
          soon as it ends.
        </p>
        <Button asChild variant="outline" size="lg">
          <Link href={`/checkout/confirmation/${accepted.orderCode}`}>Check your order status</Link>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      icon={
        <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
        </div>
      }
      title="Finishing your Affirm payment…"
    >
      <p className="text-lg text-brand-dark-blue/70">
        Please keep this page open while we confirm your payment with Affirm.
      </p>
    </Screen>
  );
}
