'use client';

import { useEffect } from 'react';
import { getAffirmPublicConfig, loadAffirm } from '@/lib/affirm';
import { cn } from '@/lib/utils';

export type AffirmPromoPageType =
  | 'homepage'
  | 'landing'
  | 'search'
  | 'category'
  | 'product'
  | 'cart'
  | 'payment'
  | 'banner';

interface AffirmPromoProps {
  /** Amount in USD cents (integer): the price or total this spot already displays. */
  amount: number | null | undefined;
  pageType: AffirmPromoPageType;
  /** Optional, for Affirm's analytics. */
  sku?: string;
  className?: string;
}

/**
 * Affirm "As low as $X/mo" promotional messaging. Renders an empty element that affirm.js fills in
 * after hydration (server and client render the same markup, and React never manages its children).
 * Hidden when NEXT_PUBLIC_AFFIRM_PUBLIC_KEY is unset or the amount is not a positive integer.
 * Messaging is never critical: loading errors are ignored.
 */
export function AffirmPromo({ amount, pageType, sku, className }: AffirmPromoProps) {
  const visible =
    getAffirmPublicConfig() !== null && typeof amount === 'number' && Number.isInteger(amount) && amount > 0;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // Re-render after mount and whenever the amount changes (affirm.js does not watch the DOM).
    loadAffirm()
      .then((affirm) => {
        if (!cancelled) affirm.ui.refresh?.();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, amount, pageType, sku]);

  if (!visible) return null;

  return (
    <p
      // /80 keeps text contrast above 4.5:1 on white and light-gray summaries; Affirm injects the
      // "Learn more" link, so it is underlined from here.
      className={cn(
        'affirm-as-low-as min-h-5 text-sm text-brand-dark-blue/80 [&_a]:underline [&_a]:underline-offset-2',
        className
      )}
      data-page-type={pageType}
      data-amount={amount}
      data-sku={sku || undefined}
    />
  );
}
