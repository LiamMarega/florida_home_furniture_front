/**
 * Affirm (US pay-over-time) storefront helpers: public configuration and the affirm.js loader.
 *
 * Client-safe and server-safe: nothing runs on import, and browser APIs are only touched inside
 * `loadAffirm()`. Only the public API key is used here; the private key lives in the Vendure
 * PaymentMethod handler args.
 */
import type { EligiblePaymentMethod } from '@/lib/checkout/types';

/** Code of the Vendure PaymentMethod that uses the Affirm handler (naming convention). */
export const AFFIRM_PAYMENT_METHOD_CODE = 'affirm';

const AFFIRM_SCRIPT_URLS = {
  sandbox: 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js',
  production: 'https://cdn1.affirm.com/js/v2/affirm.js',
} as const;

const AFFIRM_LOAD_TIMEOUT_MS = 15000;

export type AffirmEnvironment = keyof typeof AFFIRM_SCRIPT_URLS;

export interface AffirmPublicConfig {
  publicApiKey: string;
  environment: AffirmEnvironment;
  scriptUrl: string;
}

/**
 * Affirm settings from NEXT_PUBLIC_AFFIRM_PUBLIC_KEY and NEXT_PUBLIC_AFFIRM_ENV (`sandbox`, anything
 * else means production). Returns null when no public key is set, which hides every Affirm UI.
 * The variables are referenced statically so Next.js inlines them into the client bundle.
 */
export function getAffirmPublicConfig(): AffirmPublicConfig | null {
  const publicApiKey = process.env.NEXT_PUBLIC_AFFIRM_PUBLIC_KEY?.trim();
  if (!publicApiKey) {
    return null;
  }
  const environment: AffirmEnvironment =
    process.env.NEXT_PUBLIC_AFFIRM_ENV?.trim().toLowerCase() === 'sandbox' ? 'sandbox' : 'production';
  return { publicApiKey, environment, scriptUrl: AFFIRM_SCRIPT_URLS[environment] };
}

/**
 * The Affirm entry of `eligiblePaymentMethods` (eligible or not), or undefined when the storefront has
 * no Affirm key or the backend lists no `affirm` method.
 */
export function findAffirmPaymentMethod(
  paymentMethods: readonly EligiblePaymentMethod[] | undefined
): EligiblePaymentMethod | undefined {
  if (!getAffirmPublicConfig()) {
    return undefined;
  }
  return paymentMethods?.find((method) => method.code === AFFIRM_PAYMENT_METHOD_CODE);
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
 * Loads affirm.js (once per page) and resolves with `window.affirm` once `affirm.ui.ready` fires.
 * Rejects when the script fails to load or after 15 s; the promise is then reset so a later call can
 * retry. SSR-safe: rejects outside the browser.
 */
export function loadAffirm(): Promise<Affirm> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('affirm.js can only be loaded in the browser'));
  }
  const config = getAffirmPublicConfig();
  if (!config) {
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

function waitForAffirm(config: AffirmPublicConfig): Promise<Affirm> {
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
      script = injectAffirmScript(config);
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
function injectAffirmScript(config: AffirmPublicConfig): HTMLScriptElement | null {
  if (!affirmScript) {
    if (window.affirm) {
      // Already on the page (loaded elsewhere, or kept across a dev hot reload).
      return null;
    }
    window._affirm_config = {
      public_api_key: config.publicApiKey,
      script: config.scriptUrl,
      locale: 'en_US',
      country_code: 'USA',
    };
    const snippet = document.createElement('script');
    snippet.text = AFFIRM_EMBED_SNIPPET;
    document.head.appendChild(snippet); // inline scripts run synchronously on insertion
    snippet.remove();
    affirmScript = document.querySelector<HTMLScriptElement>(`script[src="${config.scriptUrl}"]`);
  } else if (affirmScriptFailed) {
    const retry = document.createElement('script');
    retry.async = true;
    retry.src = config.scriptUrl;
    affirmScript.remove();
    document.head.appendChild(retry);
    affirmScript = retry;
  }
  affirmScriptFailed = false;
  return affirmScript;
}
