/**
 * Server-only: the channel's Affirm settings from the Shop API `affirmConfig`, cached in memory.
 *
 * The query is public and session-free, so it is sent without cookies and one answer serves every request of this
 * server process: for 60 s after a good answer, 10 s after a failure (a backend outage is retried soon, without
 * hammering it). API routes use it for the Affirm payment method code; browsers read it through
 * GET /api/affirm/config. A failure is reported as unknown (`ok: false`), never as "Affirm disabled", so callers
 * can tell "Affirm is off" from "we could not ask".
 */
import { parseAffirmConfig, type AffirmConfig } from '@/lib/affirm';
import { GET_AFFIRM_CONFIG } from '@/lib/graphql/queries';

// Same endpoint as lib/vendure-server (the default channel).
const VENDURE_SHOP_API = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

const SUCCESS_TTL_MS = 60_000;
const FAILURE_TTL_MS = 10_000;
const REQUEST_TIMEOUT_MS = 5_000;

export type AffirmConfigLookup = { ok: true; config: AffirmConfig } | { ok: false };

let cached: { lookup: AffirmConfigLookup; expiresAt: number } | null = null;
let pending: Promise<AffirmConfigLookup> | null = null;

/** The channel's Affirm settings; concurrent callers share one backend request. */
export function getAffirmConfig(): Promise<AffirmConfigLookup> {
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.lookup);
  }
  if (!pending) {
    pending = requestAffirmConfig()
      .then((lookup) => {
        cached = { lookup, expiresAt: Date.now() + (lookup.ok ? SUCCESS_TTL_MS : FAILURE_TTL_MS) };
        return lookup;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

async function requestAffirmConfig(): Promise<AffirmConfigLookup> {
  try {
    const response = await fetch(VENDURE_SHOP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: GET_AFFIRM_CONFIG }),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body: unknown = await response.json().catch(() => null);
    const result = body && typeof body === 'object' ? (body as { data?: unknown; errors?: unknown[] }) : null;
    const affirmConfig =
      result?.data && typeof result.data === 'object'
        ? (result.data as { affirmConfig?: unknown }).affirmConfig
        : undefined;
    if (!response.ok || result?.errors?.length || !affirmConfig) {
      console.error(`affirmConfig unavailable (HTTP ${response.status})`);
      return { ok: false };
    }
    return { ok: true, config: parseAffirmConfig(affirmConfig) };
  } catch (error) {
    console.error('affirmConfig request failed:', error instanceof Error ? error.message : error);
    return { ok: false };
  }
}
