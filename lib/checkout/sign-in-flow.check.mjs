// Self-check for the checkout sign-in flow rules (no test runner in this repo).
// Run: node --experimental-strip-types lib/checkout/sign-in-flow.check.mjs
import assert from 'node:assert/strict';
import {
  RESEND_COOLDOWN_SECONDS,
  resolveLoginResult,
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

console.log('sign-in-flow: all checks passed');
