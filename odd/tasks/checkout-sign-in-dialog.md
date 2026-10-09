# Checkout sign-in dialog for existing-account emails

## Objective
When a guest enters an email that already has an account, checkout opens a sign-in dialog (email prefilled, password) instead of a dead-end error. Every recovery path (unverified email, forgotten password, wrong email) finishes without leaving checkout, and checkout resumes automatically after sign-in.

## Problem
- `/api/checkout/set-customer` returns 400 with `code: 'EMAIL_ADDRESS_CONFLICT_ERROR'`, but `hooks/use-checkout.ts` `setCustomer()` throws only `data.error` ("Failed to set customer"), so the conflict branch (`processCheckout`, ~L171) never runs and `onSubmit` leaks an unhandled rejection.
- `auth-context` `login()` drops the error code, so `EMAIL_NOT_VERIFIED` (403) can't be detected.
- `/api/auth/resend-verification` is a placeholder; it never calls Vendure `refreshCustomerVerification`.
- No password reset exists. The backend EmailPlugin already sends reset links to `${SHOP_URL}/profile/password-reset?token=…` (florida-home-back `src/vendure-config.ts:174`), which 404s today.
- After sign-in, the saved-address auto-select effect (`app/checkout/page.tsx` ~L101) would overwrite an address the guest already typed.

## Why
The user wants a polished, in-checkout recovery: "terminar el sign in sin salir del checkout", covering every angle (unverified, reset, wrong email).

## Scope
- Auth API: real resend-verification, new request-password-reset and reset-password routes, code-aware login.
- `/profile/password-reset` page; verify and reset pages return to checkout when the flow started there.
- Checkout: conflict detection, sign-in dialog (steps: sign in, unverified, verification sent, forgot, reset sent), auto-resume after sign-in, address-overwrite guard, inline "account exists" notice when the dialog is dismissed.

## Constraints
- Session is cookie-only; Vendure merges the guest order on login, verify and reset (same browser), so cross-tab completion signs the checkout tab in too.
- Vendure `resetPassword` also marks an unverified user as verified.
- Reuse shadcn Dialog (Radix), framer-motion, lucide, brand tokens. No new dependencies.
- UI copy in English, no em dashes.
- No test runner in the repo: TDD exception. Checks are a pure-flow assert script run with `node --experimental-strip-types`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## Tasks
- [x] T1 Auth API: `refreshCustomerVerification` in resend-verification; `request-password-reset` + `reset-password` routes and mutations; `login()` in auth-context also returns `code`. Route: delegated (writer, 2+ non-trivial files).
- [x] T2 Reset page + return-to-checkout: `/profile/password-reset` page; `lib/checkout/return-to.ts`; verify page redirects to `/checkout` when flagged. Route: delegated (same writer).
- [x] T3 Checkout dialog: conflict-aware `setCustomer`/`processCheckout`; `CheckoutSignInDialog`; page integration (auto-resume, dismissed notice, "Not you?" focuses email, address-overwrite guard); flow assert check. Route: delegated (same writer).
- [ ] T4 Verify: lint, tsc, build, flow check; visual pass on dialog states.

## Acceptance criteria
- Existing-account email at checkout opens the dialog with the email prefilled and password focused.
- Correct password: dialog closes, cart kept, checkout continues to payment without a second click.
- Wrong password: inline error; forgot-password link always visible.
- Unverified account: dialog explains it and sends a real confirmation email; after confirming (same browser, any tab), the checkout tab signs in on focus and resumes.
- Forgot password: real reset email; `/profile/password-reset` sets the password, signs in, and returns to checkout.
- "Not you?" closes the dialog and focuses the checkout email field. Dismissing the dialog leaves an inline notice with a sign-in action.
- Typed shipping address survives sign-in.

## Delivery
- Strategy: ask-on-risk (default). Forecast ~900 authored lines, over the ~400 budget, so the chain-strategy question is asked before any PR. Work-unit commits per task on `LiamMarega/fix-admin-login-recovery`.
- RDD: off (global), no native review.

## Out of scope (follow-ups)
- Backend `guestCheckoutStrategy.allowGuestCheckoutForRegisteredCustomers` (guest checkout for registered emails).
- Mobile bottom-sheet variant of the dialog.

## Progress
- 2026-10-09: flow mapped by an explorer (checkout, session, auth routes, UI kit, tokens); backend email URLs verified in florida-home-back.
- 2026-10-09: T1 done (commit `8f9ff1f` `feat(auth): real verification resend and password reset API`). resend-verification calls `refreshCustomerVerification`; new `request-password-reset` and `reset-password` routes (reset forwards the session cookie, surfaces `validationErrorMessage` for `PASSWORD_VALIDATION_ERROR`); `login()` returns `code`. `/api/auth/verify` already forwarded cookies, unchanged. Checks: `npx tsc --noEmit` exit 0; `npm run lint` exit 1 with only the 2 pre-existing `react-hooks/set-state-in-effect` errors in `components/conditional-back.tsx` and `components/header.tsx` (not touched).
- 2026-10-09: T2 done (commit `d5bc78e` `feat(auth): password reset page and return to checkout`). `lib/checkout/return-to.ts` (mark/consume/clear, 2h TTL, guarded storage); auth context `syncSession()` awaits the auth-status refetch (plus cart/order invalidation) and returns signed-in state; verify page returns to `/checkout` when flagged and only opens the login modal when not signed in; new `/profile/password-reset` page (form, expired/invalid with new-link request, validation error inline, generic error). Checks: `npx tsc --noEmit` exit 0; `npx eslint` on touched dirs exit 0.
- 2026-10-09: T3 done (commit `feat(checkout): sign in from checkout when the email has an account`). `setCustomer` throws `CheckoutApiError` with `code`; `processCheckout` returns `{ ok } | { ok: false, reason }` (no rethrow), sets `emailConflict` on `EMAIL_ADDRESS_CONFLICT_ERROR` and no longer opens the global auth modal. Pure `lib/checkout/sign-in-flow.ts` (`resolveLoginResult`, `stepDirection`, cooldown) with assert check (RED: ERR_MODULE_NOT_FOUND before the module existed; GREEN after). `CheckoutSignInDialog` (5 steps, height + step motion, shake, reduced motion, focus on step change, resend cooldown, live region); it also watches `isAuthenticated` and refetches auth on focus/visibility while open, so cross-tab confirm/reset resumes checkout. Page: dialog per conflict, dismissed notice, "Not you?" focuses the email field, auto-resume via `useEffectEvent`, typed-address guard. Checks: flow check exit 0; `npx tsc --noEmit` exit 0; `npm run lint` exit 1 with only the 2 pre-existing errors (`components/conditional-back.tsx`, `components/header.tsx`); `npm run build` exit 0.

## Next step
T4: visual pass on the dialog states (signin, wrong password x2, unverified, verification sent with cooldown, forgot, reset sent, dismissed notice, reduced motion) against a running Vendure backend.
