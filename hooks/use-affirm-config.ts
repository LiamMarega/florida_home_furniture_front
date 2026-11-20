import { useQuery } from '@tanstack/react-query';
import { isAffirmEnabled, parseAffirmConfig, type AffirmConfig, type EnabledAffirmConfig } from '@/lib/affirm';

export const affirmConfigKeys = {
  all: ['affirm-config'] as const,
};

// While Affirm is offered the settings rarely change; while it is not (off, or the backend was unreachable),
// re-check sooner so it comes back without a reload.
const ENABLED_STALE_TIME_MS = 5 * 60 * 1000;
const DISABLED_STALE_TIME_MS = 30 * 1000;

async function fetchAffirmConfig(): Promise<AffirmConfig> {
  const response = await fetch('/api/affirm/config', { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Affirm settings request failed (HTTP ${response.status})`);
  }
  return parseAffirmConfig(await response.json());
}

export interface AffirmConfigState {
  /** The channel's Affirm settings when Affirm is offered; null while loading, when it is off or unavailable. */
  affirm: EnabledAffirmConfig | null;
  /** True until the first answer (or the last failed retry). */
  isLoading: boolean;
}

/**
 * The channel's Affirm settings (GET /api/affirm/config), shared by every component through React Query.
 * Affirm UI (promotional messaging, the checkout option) renders only when `affirm` is set.
 */
export function useAffirmConfig(): AffirmConfigState {
  const { data, isPending } = useQuery({
    queryKey: affirmConfigKeys.all,
    queryFn: fetchAffirmConfig,
    staleTime: (query) => (query.state.data?.enabled ? ENABLED_STALE_TIME_MS : DISABLED_STALE_TIME_MS),
    retry: 2,
  });
  return { affirm: isAffirmEnabled(data) ? data : null, isLoading: isPending };
}
