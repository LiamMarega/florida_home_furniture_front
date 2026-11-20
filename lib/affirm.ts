/**
 * Affirm (US pay-over-time) storefront helpers: the channel's Affirm configuration and the affirm.js loader.
 *
 * Zero-config: everything comes from the backend's Shop API `affirmConfig` (served by GET /api/affirm/config and
 * read with `useAffirmConfig()`), so the storefront has no Affirm environment variables and cannot drift from the
 * PaymentMethod's key pair, sandbox flag or code. Client-safe and server-safe: nothing runs on import, and browser
 * APIs are only touched inside `loadAffirm()`. Only the public API key ever reaches the storefront; the private key
 * stays in the Vendure PaymentMethod handler args.
 */
import type { EligiblePaymentMethod } from '@/lib/checkout/types';

const AFFIRM_SCRIPT_URLS = {
  sandbox: 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js',
  production: 'https://cdn1.affirm.com/js/v2/affirm.js',
} as const;

const AFFIRM_LOAD_TIMEOUT_MS = 15000;

// Sanity limits for what the backend sends; anything else means Affirm is not offered.
const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{1,256}$/;
const METHOD_CODE_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export type AffirmEnvironment = keyof typeof AFFIRM_SCRIPT_URLS;

/** The Shop API `affirmConfig`: what the storefront needs to offer Affirm in its channel. */
export interface AffirmConfig {
  enabled: boolean;
  /** The PaymentMethod code to pay with: `addPaymentToOrder({ method: methodCode, ... })`. */
  methodCode: string | null;
  /** The public API key for affirm.js. */
  publicApiKey: string | null;
  /** Which affirm.js to load. */
  environment: AffirmEnvironment | null;
  /** Order totals (tax included, minor units) Affirm is offered for; null without the Affirm eligibility checker. */
  minimumAmount: number | null;
  maximumAmount: number | null;
}

/** An `affirmConfig` that offers Affirm: every field affirm.js and `addPaymentToOrder` need is set. */
export interface EnabledAffirmConfig extends AffirmConfig {
  enabled: true;
  methodCode: string;
  publicApiKey: string;
  environment: AffirmEnvironment;
}

export const AFFIRM_DISABLED: AffirmConfig = {
  enabled: false,
  methodCode: null,
  publicApiKey: null,
  environment: null,
  minimumAmount: null,
  maximumAmount: null,
};

/**
 * Validates an `affirmConfig` answer. Anything incomplete or unexpected (an unknown environment, a missing key or
 * code) means Affirm is not offered: the storefront never guesses which affirm.js or method to use.
 */
export function parseAffirmConfig(value: unknown): AffirmConfig {
  if (!value || typeof value !== 'object') {
    return AFFIRM_DISABLED;
  }
  const config = value as Record<string, unknown>;
  const methodCode = typeof config.methodCode === 'string' ? config.methodCode.trim() : '';
  const publicApiKey = typeof config.publicApiKey === 'string' ? config.publicApiKey.trim() : '';
  const environment =
    config.environment === 'sandbox' || config.environment === 'production' ? config.environment : null;
  if (
    config.enabled !== true ||
    !METHOD_CODE_PATTERN.test(methodCode) ||
    !PUBLIC_KEY_PATTERN.test(publicApiKey) ||
    !environment
  ) {
    return AFFIRM_DISABLED;
  }
  return {
    enabled: true,
    methodCode,
    publicApiKey,
    environment,
    minimumAmount: amountOrNull(config.minimumAmount),
    maximumAmount: amountOrNull(config.maximumAmount),
  };
}

function amountOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/** Whether `config` offers Affirm, with everything set to pay with it. */
export function isAffirmEnabled(config: AffirmConfig | null | undefined): config is EnabledAffirmConfig {
  return !!config && config.enabled && !!config.methodCode && !!config.publicApiKey && !!config.environment;
}

/**
 * The Affirm entry of `eligiblePaymentMethods` (eligible or not): the method whose code is the config's
 * `methodCode`. Undefined when Affirm is not offered or the order lists no such method.
 */
export function findAffirmPaymentMethod(
  paymentMethods: readonly EligiblePaymentMethod[] | undefined,
  config: AffirmConfig | null | undefined
): EligiblePaymentMethod | undefined {
  if (!isAffirmEnabled(config)) {
    return undefined;
  }
  return paymentMethods?.find((method) => method.code === config.methodCode);
}

// Minimal typings for the part of affirm.js the storefront uses.

/** Docs disagree on the key name, so both are typed; read `checkout_token ?? checkout_id`. */
export interface AffirmCheckoutSuccess {
  checkout_token?: string;
  checkout_id?: string;
}

export interface AffirmCheckoutCallbacks {
  onSuccess?: (result: AffirmCheckoutSuccess) => void;
  onFail?: (error?: unknown) => void;
  onOpen?: (checkoutToken?: string) => void;
  onValidationError?: (error?: unknown) => void;
}

export interface AffirmCheckout {
  (checkoutObject: Record<string, unknown>): void;
  open: (callbacks: AffirmCheckoutCallbacks) => void;
}

export interface Affirm {
  checkout: AffirmCheckout;
  ui: {
    ready: (callback: () => void) => void;
    /** Re-renders every `.affirm-as-low-as` element (promotional messaging). Absent on the pre-load stub. */
    refresh?: () => void;
  };
}

interface AffirmScriptConfig {
  public_api_key: string;
  script: string;
  locale: string;
  country_code: string;
}

declare global {
  interface Window {
    affirm?: Affirm;
    _affirm_config?: AffirmScriptConfig;
  }
}

/**
 * Affirm's official async embed snippet, verbatim from
 * https://docs.affirm.com/developers/recipes/embed-affirmjs (page updated 2025-11-13, fetched
 * 2026-11-18), without its `var _affirm_config = {...}` literal: loadAffirm sets
 * `window._affirm_config` right before running it. It installs a queueing `window.affirm` stub and
 * appends the affirm.js <script>; affirm.js replays the queue once loaded. It must run once per page.
 */
const AFFIRM_EMBED_SNIPPET = `(function(m,g,n,d,a,e,h,c){var b=m[n]||{},k=document.createElement(e),p=document.getElementsByTagName(e)[0],l=function(a,b,c){return function(){a[b]._.push([c,arguments])}};b[d]=l(b,d,"set");var f=b[d];b[a]={};b[a]._=[];f._=[];b._=[];b[a][h]=l(b,a,h);b[c]=function(){b._.push([h,arguments])};a=0;for(c="set add save post open empty reset on off trigger ready setProduct".split(" ");a<c.length;a++)f[c[a]]=l(b,d,c[a]);a=0;for(c=["get","token","url","items"];a<c.length;a++)f[c[a]]=function(){};k.async=
  !0;k.src=g[e];p.parentNode.insertBefore(k,p);delete g[e];f(g);m[n]=b})(window,_affirm_config,"affirm","checkout","ui","script","ready","jsReady");`;

let affirmPromise: Promise<Affirm> | null = null;
// The affirm.js <script> element appended for this page, and whether it fired `error`.
let affirmScript: HTMLScriptElement | null = null;
let affirmScriptFailed = false;

/**
 * Loads affirm.js (once per page) with the channel's public key and environment, and resolves with
 * `window.affirm` once `affirm.ui.ready` fires. Rejects when the script fails to load or after 15 s; the
 * promise is then reset so a later call can retry. The first config used wins for the page: affirm.js cannot
 * switch keys or environments without a reload. SSR-safe: rejects outside the browser.
 */
export function loadAffirm(config: EnabledAffirmConfig): Promise<Affirm> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('affirm.js can only be loaded in the browser'));
  }
  if (!isAffirmEnabled(config)) {
    return Promise.reject(new Error('Affirm is not configured'));
  }
  if (!affirmPromise) {
    affirmPromise = waitForAffirm(config).catch((error: unknown) => {
      affirmPromise = null;
      throw error;
    });
  }
  return affirmPromise;
}

function waitForAffirm(config: EnabledAffirmConfig): Promise<Affirm> {
  return new Promise<Affirm>((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script?.removeEventListener('error', onScriptError);
      const affirm = window.affirm;
      if (error || !affirm) {
        reject(error ?? new Error('affirm.js did not initialize'));
      } else {
        resolve(affirm);
      }
    };
    const onScriptError = () => {
      affirmScriptFailed = true;
      finish(new Error('Failed to load affirm.js'));
    };
    const timer = window.setTimeout(
      () => finish(new Error('Timed out loading affirm.js')),
      AFFIRM_LOAD_TIMEOUT_MS
    );

    try {
      script = injectAffirmScript(config.publicApiKey, AFFIRM_SCRIPT_URLS[config.environment]);
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Failed to start affirm.js'));
      return;
    }
    script?.addEventListener('error', onScriptError);
    window.affirm?.ui.ready(() => finish());
  });
}

/**
 * Runs the embed snippet on first use. Later calls never re-run it (that would replace a loaded
 * library with fresh stubs): they only re-append affirm.js when the previous load failed, and
 * otherwise keep waiting for the script already on the page.
 */
function injectAffirmScript(publicApiKey: string, scriptUrl: string): HTMLScriptElement | null {
  if (!affirmScript) {
    if (window.affirm) {
      // Already on the page (loaded elsewhere, or kept across a dev hot reload).
      return null;
    }
    window._affirm_config = {
      public_api_key: publicApiKey,
      script: scriptUrl,
      locale: 'en_US',
      country_code: 'USA',
    };
    const snippet = document.createElement('script');
    snippet.text = AFFIRM_EMBED_SNIPPET;
    document.head.appendChild(snippet); // inline scripts run synchronously on insertion
    snippet.remove();
    affirmScript = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
  } else if (affirmScriptFailed) {
    const retry = document.createElement('script');
    retry.async = true;
    retry.src = affirmScript.src;
    affirmScript.remove();
    document.head.appendChild(retry);
    affirmScript = retry;
  }
  affirmScriptFailed = false;
  return affirmScript;
}
