'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/**
 * Email links (verify account, reset password) carry a one-time `token` in the
 * URL. Strip it before any analytics event leaves the browser; everything else
 * in the URL is kept.
 */
function redactToken<T extends { url: string }>(event: T): T {
  try {
    const url = new URL(event.url, window.location.origin);
    if (!url.searchParams.has('token')) return event;
    url.searchParams.delete('token');
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

export function VercelAnalytics() {
  return (
    <>
      <Analytics beforeSend={redactToken} />
      <SpeedInsights beforeSend={redactToken} />
    </>
  );
}
