import type { Metadata } from 'next';
import { AffirmReturn } from '@/components/checkout/affirm-return';

// The URL carries an Affirm checkout token: keep it out of search engines and Referer headers.
export const metadata: Metadata = {
  title: 'Returning from Affirm',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * Affirm's confirmation URL (`<origin>/checkout/affirm/return?checkout_token=...`), used only when Affirm
 * redirects instead of calling the modal's callbacks. The token is sent only if this browser opened Affirm
 * for the order (see components/checkout/affirm-return.tsx).
 */
export default function AffirmReturnPage() {
  return <AffirmReturn />;
}
