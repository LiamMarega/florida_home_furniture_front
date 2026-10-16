/**
 * Pure rules for signing in from checkout (dialog steps, cart review). No imports, so it can be
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

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
  total: number;
}

/**
 * What the cart should look like after signing in mid-checkout:
 * - resume: exactly the guest cart, safe to continue to payment;
 * - merged: every guest item is there plus items saved in the account;
 * - partial: some guest items are missing (could not be kept or re-added);
 * - changed: same items, different total (account pricing or tax).
 */
export type CartReview = 'resume' | 'merged' | 'partial' | 'changed';

function quantitiesByVariant(lines: CartLine[]): Map<string, number> {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
  }
  return quantities;
}

/**
 * Guest items missing from the current cart, with the quantity still needed.
 * Vendure's merge strategy can drop guest lines when the account's saved order
 * is locked for payment; these are the lines to add back.
 */
export function missingGuestLines(guest: CartLine[], current: CartLine[]): CartLine[] {
  const have = quantitiesByVariant(current);
  const missing: CartLine[] = [];
  for (const [variantId, quantity] of quantitiesByVariant(guest)) {
    const shortfall = quantity - (have.get(variantId) ?? 0);
    if (shortfall > 0) missing.push({ variantId, quantity: shortfall });
  }
  return missing;
}

export function reviewCartAfterSignIn(guest: CartState, current: CartState): CartReview {
  if (missingGuestLines(guest.lines, current.lines).length > 0) return 'partial';
  // Nothing missing, so any extra quantity came from the account's saved cart.
  if (missingGuestLines(current.lines, guest.lines).length > 0) return 'merged';
  return guest.total === current.total ? 'resume' : 'changed';
}
