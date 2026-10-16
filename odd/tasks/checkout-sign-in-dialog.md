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
- [x] T4 Verify: lint, tsc, build, flow check; visual pass on dialog states (mocked auth responses). Route: parent inline + independent verifier (native risk: high, RDD off).
- [x] T7 Delivery: stacked-to-main chain #29 → #30 → #31 (+ independent docs PR #28); PR #27 closed as superseded. Route: parent inline (git/gh state).
- [x] T6 Live-backend E2E on a fully local stack (real Vendure 3.6 on SQLite + storefront on localhost, isolated browser context; browser safety rules forbid creating accounts or typing passwords on the `*.vercel.app` preview, whose backend is production). Route: delegated verification worker. Found D1-D5 (fixed in T8); retest 8/8 pass.
  - 2026-10-11 local full-stack run (real Vendure on localhost): G passed; F and E found D1 and D3 (see T8); B-J expected to pass after the T8 fixes, pending retest; K skipped (no reduced-motion emulation available). Stays unchecked until the retest.
- [x] T5 Correction round (visual pass + independent verify). Route: delegated (same writer). Commit: `6d58f02` `fix(checkout): harden sign-in dialog after visual and review pass`.
  - [x] V1 Explicit `{' '}` after the email in multi-line JSX text (dialog unverified, forgot, reset-sent; reset page link-sent); SWC dropped the space ("…comhasn't").
  - [x] V2 `break-words` instead of `break-all` for emails (dialog, reset page, checkout notice).
  - [x] V3 Sign-in description no longer repeats the email or promises an unchanged cart; identity row wraps instead of truncating. Parent follow-up edit kept: row is `flex flex-wrap justify-between`, Mail icon + email grouped, "Not you?" `ml-auto shrink-0`, so on 375px "Not you?" wraps instead of splitting the email.
  - [x] V4 Reset page shell top-aligned on mobile, centered from `sm:` (all states).
  - [x] F1 Cart signature (sorted variantId x quantity + totalWithTax) captured at conflict and compared with the cart refetched after `syncSession()`; on a difference no auto-resume and a neutral, focused notice ("added items" only when lines were added, otherwise "cart changed").
  - [x] F2 Auto-resume only when the signed-in account email equals the conflict email and the post-sign-in sync is authenticated; resume skipped if the shopper already continued manually.
  - [x] F3 `['addresses']` invalidated on login success and in `syncSession`; resumed submit skips the address auto-save.
  - [x] F4 Focus moves to the "Payment" heading after a resumed submit.
  - [x] F5 "Resend link" uses `aria-disabled` + handler guard during cooldown (keeps focus).
  - [x] F6 Dialog: one always-mounted live region fed by `announce()`; reset page: one live region in the shared shell and heading focus on step change.
  - [x] F7 `components/vercel-analytics.tsx` (client wrapper) redacts the `token` query param in `beforeSend` for Analytics and Speed Insights; layout uses `<VercelAnalytics />`.
  - [x] F8 The three new auth routes return 415 unless `Content-Type` is `application/json` (all callers send JSON).
  - [x] F9 Non-object JSON bodies return 400 `VALIDATION_ERROR` instead of a 500.
- [x] T8 E2E fixes (local full stack). Route: delegated (same writer). Two commits in their slices, chain restacked (#30 onto #29, #31 onto #30).
  - [x] D1 (Critical, slice #29, `c0c20be` `fix(auth): keep the signed-in session after password login`): the login route ran a follow-up auth query with the guest cookie; Vendure drops that session on login, so the query opened a new anonymous session whose cookie overwrote the signed-in one (signed out, empty cart). The route now forwards only the login result's cookies; the unused `auth` field and follow-up query are gone (only `contexts/auth-context.tsx` calls the route and it never read `auth`).
  - [x] D2 (Medium): errors carry the HTTP `status` so the global retry policy skips 4xx. Part 1 in slice #29 (`c0c20be`, `login` errors); part 2 in slice #31 (`fix(checkout): restore guest items dropped on sign-in and clarify edge cases`, every `CheckoutApiError` thrown by the checkout hook).
  - [x] D3 (High, slice #31): the guest cart snapshot keeps lines (variantId + quantity) and total; after sign-in, guest quantities missing from the fresh cart are re-added through `/api/cart/add` (moves an `ArrangingPayment` order back to `AddingItems`), the cart is refetched and reviewed with the pure `reviewCartAfterSignIn`: exact guest cart resumes; extra account items show the "added items saved in your account" notice; anything still missing shows "Some items from your cart couldn't be kept when you signed in. Review your cart before continuing." and never resumes. Pure helpers `missingGuestLines` / `reviewCartAfterSignIn` added to `lib/checkout/sign-in-flow.ts` with asserts (RED: missing export; GREEN after).
  - [x] D4 (Low, slice #31): payment-intent failures show the server `message`, else "We couldn't start the payment. Try again." (no more "[object Object]" from the `details` array).
  - [x] D5 (Low, slice #31): when a different account signs in (another tab), the dialog closes, the conflict clears, the form email becomes that account's email, and a focused neutral notice reads "You're signed in as <email>. This order will be placed with that account."; no auto-resume and no "Signed in as" toast.
  - [x] Nit (slice #31): the dialog's live region is cleared on every step change, so a stale "password doesn't match" message is not left behind.

## Acceptance criteria
- Existing-account email at checkout opens the dialog with the email prefilled and password focused.
- Correct password: dialog closes, cart kept, checkout continues to payment without a second click.
- Wrong password: inline error; forgot-password link always visible.
- Unverified account: dialog explains it and sends a real confirmation email; after confirming (same browser, any tab), the checkout tab signs in on focus and resumes.
- Forgot password: real reset email; `/profile/password-reset` sets the password, signs in, and returns to checkout.
- "Not you?" closes the dialog and focuses the checkout email field. Dismissing the dialog leaves an inline notice with a sign-in action.
- Typed shipping address survives sign-in.

## Delivery
- Strategy: stacked PRs to `main` (chosen by the user as the recommended option on 2026-10-11): each slice lands on `main` in order and rolls back on its own. RDD off (global), no native review; independent verifier used instead.
- Actual size ~2,084 authored lines (vs ~900 forecast). One honest slicing pass; slices over 400 carry `size:exception` with rationale in the PR body.
- Slices (fixes from `6d58f02` folded into the slice they belong to; slice-3 tip is byte-identical to the verified feature files):
  - #29 `feat/auth-email-recovery-api` (base `main`): auth routes, mutations, login code, plan doc. 421 lines.
  - #30 `feat/password-reset-page` (base #29): reset page, return-to flag, verify redirect, `syncSession`, analytics token redaction. 546 lines, `size:exception`.
  - #31 `feat/checkout-sign-in-dialog` (base #30): checkout hook, dialog, page integration, flow check, this doc. 1,117 lines, `size:exception` (dialog alone 709).
  - #28 `docs/odd-plans-and-tooling` (base `main`, independent): other features' ODD plans, skill registry, `.codegraph/` ignore.
- Merge order: #29 → retarget #30 to `main` → merge → retarget #31 → merge. #28 any time.

## Out of scope (follow-ups)
- Backend `guestCheckoutStrategy.allowGuestCheckoutForRegisteredCustomers` (guest checkout for registered emails).
- Mobile bottom-sheet variant of the dialog.
- Server-side rate limiting for resend-verification, request-password-reset and reset-password (Vendure's shop API exposes the same mutations publicly, so it belongs at the edge or backend).
- Optional backend `UseGuestStrategy` as the order merge strategy, so signing in never changes the guest cart.
- Move the JSON content-type and body guards of the three auth routes into `lib/api-utils.ts`.

## Progress
- 2026-10-09: flow mapped by an explorer (checkout, session, auth routes, UI kit, tokens); backend email URLs verified in florida-home-back.
- 2026-10-09: T1 done (commit `8f9ff1f` `feat(auth): real verification resend and password reset API`). resend-verification calls `refreshCustomerVerification`; new `request-password-reset` and `reset-password` routes (reset forwards the session cookie, surfaces `validationErrorMessage` for `PASSWORD_VALIDATION_ERROR`); `login()` returns `code`. `/api/auth/verify` already forwarded cookies, unchanged. Checks: `npx tsc --noEmit` exit 0; `npm run lint` exit 1 with only the 2 pre-existing `react-hooks/set-state-in-effect` errors in `components/conditional-back.tsx` and `components/header.tsx` (not touched).
- 2026-10-09: T2 done (commit `d5bc78e` `feat(auth): password reset page and return to checkout`). `lib/checkout/return-to.ts` (mark/consume/clear, 2h TTL, guarded storage); auth context `syncSession()` awaits the auth-status refetch (plus cart/order invalidation) and returns signed-in state; verify page returns to `/checkout` when flagged and only opens the login modal when not signed in; new `/profile/password-reset` page (form, expired/invalid with new-link request, validation error inline, generic error). Checks: `npx tsc --noEmit` exit 0; `npx eslint` on touched dirs exit 0.
- 2026-10-09: T3 done (commit `3e372e9` `feat(checkout): sign in from checkout when the email has an account`). `setCustomer` throws `CheckoutApiError` with `code`; `processCheckout` returns `{ ok } | { ok: false, reason }` (no rethrow), sets `emailConflict` on `EMAIL_ADDRESS_CONFLICT_ERROR` and no longer opens the global auth modal. Pure `lib/checkout/sign-in-flow.ts` (`resolveLoginResult`, `stepDirection`, cooldown) with assert check (RED: ERR_MODULE_NOT_FOUND before the module existed; GREEN after). `CheckoutSignInDialog` (5 steps, height + step motion, shake, reduced motion, focus on step change, resend cooldown, live region); it also watches `isAuthenticated` and refetches auth on focus/visibility while open, so cross-tab confirm/reset resumes checkout. Page: dialog per conflict, dismissed notice, "Not you?" focuses the email field, auto-resume via `useEffectEvent`, typed-address guard. Checks: flow check exit 0; `npx tsc --noEmit` exit 0; `npm run lint` exit 1 with only the 2 pre-existing errors (`components/conditional-back.tsx`, `components/header.tsx`); `npm run build` exit 0.
- 2026-10-09: T4 done. `gentle-ai review assess` (14aa6a4..HEAD, committed-only): risk high (auth hot path), so an independent read-only verifier ran: no blockers, 1 major (cart merge on sign-in) + 8 minor, all fed into T5. Parent visual pass on a scratch page with mocked `/api/auth/*` (deleted after) at 1280px and 375px: sign-in, wrong password x2 (reset shortcut), forgot, reset sent, unverified, verification sent (cooldown ticks, not-confirmed note), success morph; `/profile/password-reset`. Found 4 visual defects (lost space after email, `break-all` splitting emails, duplicated email, reset card centered below the fold on mobile), fixed in T5; re-checked. Spot check: `npx tsc --noEmit` exit 0.
- 2026-10-11: T7 done. Rebuilt the chain from `origin/main` (drops `51a1b78`, already on `main` as #26 `efad1f9`). Per slice: `npx tsc --noEmit` 0, `npm run build` 0, `npx eslint .` only the 2 baseline errors; flow check 0 on #31. Invariant: #31 tip vs old tip differs only in #28's docs/tooling paths. PRs #28-#31 opened; #27 closed with the chain map. SHA map (Progress lines below cite the originals): `8f9ff1f`+route fixes → `82761dd` (#29); `d5bc78e`+reset/analytics fixes → `23731be` (#30); `3e372e9`+dialog/page fixes → `7c08fcf` (#31); `6d58f02` folded into those three; doc commits `9632749`/`f9f1370` → `91ee3ee`.
- 2026-10-09: T5 done (commit `6d58f02` `fix(checkout): harden sign-in dialog after visual and review pass`). Checks: `npm run lint` exit 1 with only the 2 baseline errors (`components/conditional-back.tsx:16`, `components/header.tsx:37`); `npx tsc --noEmit` exit 0; flow check exit 0; `npm run build` exit 0 (prerender logs "HTTP 404 error from Vendure" because no `.env` points at the shop API; environmental, non-fatal). Dev smoke: form-encoded POST to reset-password 415, `null` JSON body 400; token redaction verified on sample URLs.
- 2026-10-11: T6 retest on `73f945c` (retested as `892b81c`, identical tree) (fresh local SQLite, same seed): 8/8 PASS. Dialog opens in 93-181 ms (was ~3 s from 4xx retries); one `/api/auth/login` per wrong password; login sets a single authenticated `session` cookie and the guest cart stays on the order; D3 restore re-adds the guest line to an ArrangingPayment account order (both products on the order, "We added items" notice, no resume); payment-intent error readable and fired once; verify and reset in another tab still return to checkout signed in; different-account notice; header login with a guest cart keeps session and cart. Locally checkout stops at payment intent ("No enabled Stripe payment method found", environment). Not covered: reduced motion (no emulation), real email delivery (local email sender wrote to a file; tokens read from SQLite), cross-tab focus dispatched by script. No production data was created.
- 2026-10-11: T6 first run (local stack): A-J ran; found D1 critical (password login left the browser signed out: follow-up query with the old guest cookie created a new anonymous session whose cookie was forwarded last), D2 (4xx mutations retried twice), D3 (Vendure merge drops guest lines when the account order is in ArrangingPayment), D4 ("[object Object]" payment error), D5 (different-account sign-in UX), live-region nit.
- 2026-10-11: T8 done. Slice #29 `c0c20be`; slice #31 `73f945c` (retested as `892b81c`, identical tree) `fix(checkout): restore guest items dropped on sign-in and clarify edge cases`; #30 and #31 rebased cleanly. Checks per branch in the T8 report (tsc, eslint with only the 2 baseline errors; tip also flow check and build).

## Next step
Review and merge #29 → #30 → #31 in order, retargeting each to `main`; #28 any time. Follow-ups stay listed above.
