import { NextResponse } from 'next/server';
import { AFFIRM_DISABLED } from '@/lib/affirm';
import { getAffirmConfig } from '@/lib/affirm-config';

// Answered per request from lib/affirm-config's in-memory cache: never prerendered at build time.
export const dynamic = 'force-dynamic';

/**
 * GET -> the channel's Affirm settings (Shop API `affirmConfig`):
 * `{ enabled, methodCode, publicApiKey, environment, minimumAmount, maximumAmount }`.
 * Public and session-free (no cookies are read or forwarded); it holds the public key only, never a secret.
 * When the backend cannot be asked it degrades to `enabled: false` (never a 500), uncached, so Affirm comes
 * back as soon as the backend answers again.
 */
export async function GET() {
  const lookup = await getAffirmConfig();
  if (!lookup.ok) {
    return NextResponse.json(AFFIRM_DISABLED, { headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json(lookup.config, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=60' },
  });
}
