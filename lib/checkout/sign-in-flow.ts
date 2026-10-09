/**
 * Pure rules for the checkout sign-in dialog. No imports, so it can be
 * checked directly with `node --experimental-strip-types`
 * (see sign-in-flow.check.mjs).
 */

export type SignInStep = 'signin' | 'unverified' | 'verification-sent' | 'forgot' | 'reset-sent';

export type LoginOutcome =
  | { kind: 'done' }
  | { kind: 'step'; step: 'unverified' }
  | { kind: 'error'; error: 'invalid' | 'generic' };

export const RESEND_COOLDOWN_SECONDS = 30;

// The login route maps Vendure results to its own codes; accept both spellings.
const UNVERIFIED_CODES = new Set(['EMAIL_NOT_VERIFIED', 'NOT_VERIFIED_ERROR']);
const INVALID_CREDENTIALS_CODES = new Set(['INVALID_CREDENTIALS', 'INVALID_CREDENTIALS_ERROR']);

export function resolveLoginResult({ success, code }: { success: boolean; code?: string }): LoginOutcome {
  if (success) return { kind: 'done' };
  if (code && UNVERIFIED_CODES.has(code)) return { kind: 'step', step: 'unverified' };
  if (code && INVALID_CREDENTIALS_CODES.has(code)) return { kind: 'error', error: 'invalid' };
  return { kind: 'error', error: 'generic' };
}

// How far each step sits from the sign-in form; drives the slide direction.
const STEP_DEPTH: Record<SignInStep, number> = {
  signin: 0,
  unverified: 1,
  forgot: 1,
  'verification-sent': 2,
  'reset-sent': 2,
};

/** +1 when moving deeper into a recovery path, -1 when heading back. */
export function stepDirection(from: SignInStep, to: SignInStep): 1 | -1 {
  return STEP_DEPTH[to] < STEP_DEPTH[from] ? -1 : 1;
}
