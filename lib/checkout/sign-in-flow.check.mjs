// Self-check for the checkout sign-in flow rules (no test runner in this repo).
// Run: node --experimental-strip-types lib/checkout/sign-in-flow.check.mjs
import assert from 'node:assert/strict';
import {
  RESEND_COOLDOWN_SECONDS,
  missingGuestLines,
  resolveLoginResult,
  reviewCartAfterSignIn,
  stepDirection,
} from './sign-in-flow.ts';

// resolveLoginResult: success wins regardless of code
assert.deepEqual(resolveLoginResult({ success: true }), { kind: 'done' });
assert.deepEqual(resolveLoginResult({ success: true, code: 'INVALID_CREDENTIALS' }), { kind: 'done' });

// Unverified account, from the route (EMAIL_NOT_VERIFIED) or raw Vendure (NOT_VERIFIED_ERROR)
assert.deepEqual(resolveLoginResult({ success: false, code: 'EMAIL_NOT_VERIFIED' }), { kind: 'step', step: 'unverified' });
assert.deepEqual(resolveLoginResult({ success: false, code: 'NOT_VERIFIED_ERROR' }), { kind: 'step', step: 'unverified' });

// Wrong password
assert.deepEqual(resolveLoginResult({ success: false, code: 'INVALID_CREDENTIALS' }), { kind: 'error', error: 'invalid' });
assert.deepEqual(resolveLoginResult({ success: false, code: 'INVALID_CREDENTIALS_ERROR' }), { kind: 'error', error: 'invalid' });

// Anything else is a generic failure (network, LOGIN_FAILED, unknown, missing code)
assert.deepEqual(resolveLoginResult({ success: false, code: 'LOGIN_FAILED' }), { kind: 'error', error: 'generic' });
assert.deepEqual(resolveLoginResult({ success: false, code: 'SOMETHING_NEW' }), { kind: 'error', error: 'generic' });
assert.deepEqual(resolveLoginResult({ success: false }), { kind: 'error', error: 'generic' });

// stepDirection: deeper steps move forward, going back moves backward
assert.equal(stepDirection('signin', 'forgot'), 1);
assert.equal(stepDirection('signin', 'unverified'), 1);
assert.equal(stepDirection('unverified', 'verification-sent'), 1);
assert.equal(stepDirection('forgot', 'reset-sent'), 1);
assert.equal(stepDirection('forgot', 'signin'), -1);
assert.equal(stepDirection('verification-sent', 'signin'), -1);
assert.equal(stepDirection('reset-sent', 'signin'), -1);
assert.equal(stepDirection('signin', 'signin'), 1);

assert.equal(RESEND_COOLDOWN_SECONDS, 30);

// missingGuestLines: what Vendure's merge dropped from the guest cart, as quantities to re-add
const guest = [
  { variantId: '1', quantity: 2 },
  { variantId: '2', quantity: 1 },
];
assert.deepEqual(missingGuestLines(guest, guest), []);
assert.deepEqual(missingGuestLines(guest, []), guest);
assert.deepEqual(
  missingGuestLines(guest, [{ variantId: '1', quantity: 1 }, { variantId: '9', quantity: 4 }]),
  [{ variantId: '1', quantity: 1 }, { variantId: '2', quantity: 1 }]
);
// Higher quantity in the account cart is not "missing"
assert.deepEqual(missingGuestLines(guest, [{ variantId: '1', quantity: 5 }, { variantId: '2', quantity: 1 }]), []);
// Several lines for the same variant are summed on both sides
assert.deepEqual(
  missingGuestLines([{ variantId: '1', quantity: 1 }, { variantId: '1', quantity: 2 }], [{ variantId: '1', quantity: 2 }]),
  [{ variantId: '1', quantity: 1 }]
);

// reviewCartAfterSignIn: resume only when the cart is exactly the guest cart
const guestCart = { lines: guest, total: 1500 };
assert.equal(reviewCartAfterSignIn(guestCart, { lines: [...guest].reverse(), total: 1500 }), 'resume');
assert.equal(reviewCartAfterSignIn(guestCart, { lines: guest, total: 1620 }), 'changed');
assert.equal(
  reviewCartAfterSignIn(guestCart, { lines: [...guest, { variantId: '9', quantity: 1 }], total: 2100 }),
  'merged'
);
assert.equal(
  reviewCartAfterSignIn(guestCart, { lines: [{ variantId: '1', quantity: 3 }, { variantId: '2', quantity: 1 }], total: 2000 }),
  'merged'
);
assert.equal(reviewCartAfterSignIn(guestCart, { lines: [{ variantId: '1', quantity: 2 }], total: 1000 }), 'partial');
assert.equal(
  reviewCartAfterSignIn(guestCart, { lines: [{ variantId: '1', quantity: 2 }, { variantId: '9', quantity: 1 }], total: 1600 }),
  'partial'
);
assert.equal(reviewCartAfterSignIn(guestCart, { lines: [], total: 0 }), 'partial');

console.log('sign-in-flow: all checks passed');
