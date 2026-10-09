# Stripe payment reconciliation (Florida Home, 305 Discount, Easy Home)

## Objective
Orders paid in Stripe must reach `PaymentSettled` in Vendure reliably and show up in near real time, across all three stores.

## Problem
Orders charged in Stripe stay in `ArrangingPayment`. The only signal Vendure uses to settle an order is the StripePlugin webhook (`POST <backend>/payments/stripe`, `payment_intent.succeeded`). When that webhook is misrouted or rejected, nothing recovers the order.
- Florida: the Stripe destinations point at the frontend (`www.floridahomefurniture.com`). The frontend webhook route was deleted in b2391c6, and the destination shows a 43% error rate. The backend route `https://vendure-server-production-60d5.up.railway.app/payments/stripe` exists (an unsigned POST returns 400).
- 305 Discount and Easy Home share identical payment code (`@vendure-community/stripe-plugin` 1.0.0). Their webhook config in Stripe has not been verified yet.
- Each store has its own Stripe account (confirmed by the user).

## Why
A single missed or misconfigured webhook currently leaves revenue invisible in the admin with no self-healing path.

## Scope
- Backend safety net: a scheduled reconciliation task that settles `ArrangingPayment` orders whose Stripe PaymentIntent already succeeded (305, Easy Home; Florida once its backend repo is available).
- Florida storefront: the confirmation page polls the order state until it settles, as 305 and Easy Home already do.
- Ops checklist for each Stripe account (done by the user).

## Constraints
- Idempotent: never add a second payment for the same PaymentIntent, and only touch orders in `ArrangingPayment`.
- Reuse the plugin's own settlement path and metadata. Do not invent a new payment method.
- No new dependencies. The `stripe` SDK already ships with the plugin.
- RDD is off globally, so there is no native review. Ordinary checks apply.

## Tasks
- [x] T1 — Easy Home backend: `ScheduledTask` that reconciles `ArrangingPayment` orders against the Stripe PaymentIntent status. Route: delegated (writer; requires reading the plugin internals). Branch: `fix/stripe-payment-reconciliation`.
- [x] T2 — 305 Discount backend: port T1 unchanged (the payment code is byte-identical). Route: inline (mechanical patch apply).
- [x] T3 — Florida storefront: the confirmation page polls the order state until it is `PaymentSettled` or a terminal state. Route: delegated (writer; requires reading the page and the data layer).
- [x] T4 — Florida backend (`github.com/LiamMarega/florida-home-back`, cloned to `~/Projects/Freelancer/florida-home-back`): adapt the corrected T1 reconciliation. It differs from Easy Home in three ways: it uses the official `@vendure/payments-plugin` (^3.5.6) instead of the community plugin, it is a single-package repo rather than a monorepo, and it has no test runner. It already has `DefaultSchedulerPlugin` and a `start:worker` script. Route: delegated (writer).
- [x] T6 — Hotfix in all 3 backends:
  - The in-transaction re-check uses `findOneByCode` without `payments`, which crashed in production. The first Florida run logged "checked 35, settled 0, errors 32".
  - Add a guard that skips fully refunded or disputed PaymentIntents, because refunded PaymentIntents stay `succeeded`.
  - Route: delegated writer on Easy Home (TDD), then a mechanical port to Florida back and 305.
- [ ] T5 — Ops (user): in each Stripe account, set a destination at `<backend>/payments/stripe` with a Snapshot payload, `payment_intent.succeeded`, and a `whsec` that matches the Vendure PaymentMethod `webhookSecret`. Resend failed events, then disable stale frontend destinations.

## Acceptance criteria
- An order whose PaymentIntent succeeded but never got a webhook is settled within one task interval.
- Running the task twice creates no duplicate payment.
- The Florida confirmation page moves from "processing" to "confirmed" without a manual reload.

## Checks
- T1/T2: server typecheck/build and the repo test runner if one exists (the writer determines this). No deterministic RED is possible without a Stripe mock unless the repo already has one.
- T3: `npm run build` and lint in the Florida front (no test runner).

## Delivery
- Forecast: about 300 authored lines in total. Strategy: ask-on-risk (under the budget).
- Push, PRs, and merges are the user's decision.

## Progress
- 2026-10-06: diagnosis done, feature doc created.
- 2026-10-06 T1: first pass in Easy Home commit `86395a3` (branch `fix/stripe-payment-reconciliation`). Verified: vitest 10/10 (parent spot check reran it, 10 passed), full suite 1073 passed, tsc exit 0, build:server exit 0. Assessment: risk medium, review_due false (under_budget); RDD is off.
- 2026-10-06 T1: correction requested. The first pass searched Stripe once per order for the newest 100 `ArrangingPayment` orders. Abandoned checkouts also sit in that state, so they could starve older paid orders. The fix inverts the lookup: per channel, search Stripe for succeeded PaymentIntents in the last 7 days, paginate, then match orders by `orderCode`.
- Known residual risk: a webhook arriving concurrently with the task's per-order transaction could add a duplicate payment. Vendure's `addPaymentToOrder` refuses orders that are no longer in `ArrangingPayment`, so the window is limited to truly concurrent transactions.

- 2026-10-06 T1 done: correction commit `73bbbd5` in Easy Home. It is Stripe-driven: succeeded PaymentIntents from the last 7 days per distinct apiKey, paginated, with a 50-page stop. Verified: plugin vitest 14/14 (parent spot check reran it, 14 passed), full suite 1077 passed, server tsc exit 0 (run from apps/server; the root `npx tsc` picks up TS 6 and fails on TS5101, which also fails on main), build:server exit 0, dist require smoke ok.
- 2026-10-06 T2 done: 305 commit `f1ebd29` on `fix/stripe-payment-reconciliation`. It is the Easy Home diff squashed into one commit; the conflict in vendure-config was resolved to keep `DiscountDashboardPlugin`, and the task id was renamed to `discount-stripe-payment-reconciliation`. Verified by the parent: plugin vitest 14/14, full suite 1077 passed, apps/server tsc exit 0, build:server exit 0.
- 2026-10-06 T4 done: Florida back commit `b5946fe`, merged as PR #1 (`7799be2`). The only adaptation needed was deep imports from `@vendure/payments-plugin/package/stripe/*`; behavior is identical. Verified: tsc exit 0 (parent spot check), build:server exit 0, require smoke ok. The Railway project `florida-home-furniture` has a `vendure-worker` service that already runs scheduled tasks.
- 2026-10-06 T3 done: Florida front commit `51a1b78`, merged as PR #26 (`efad1f9`). The confirmation page polls `/api/orders/[orderCode]` every 3s for up to 40 tries. Verified: tsc exit 0 (parent spot check), build exit 0, eslint on the file exit 0, Vercel preview passed. The repo-wide `npm run lint` already failed before this work (`components/conditional-back.tsx:16`, `components/header.tsx:37`).
- 2026-10-06 delivery (authorized by the user: push, merge, deploy):
  - Easy Home PR #12 merged as `3f70da0`. Railway server and worker SUCCESS; the worker logs "Vendure Worker is ready". The Vercel preview fails because Preview has no `VENDURE_SHOP_API_URL`; this already happened before and production is unaffected.
  - 305 PR #3 merged as `67df366`. Vercel skipped the build (storefront unaffected). The 305 backend is not in the user's Railway account, so its deploy could not be validated.
  - Florida back PR #1: Railway server SUCCESS, worker still deploying at the time of writing.
  - Florida front PR #26: Vercel production still building at the time of writing.
- 2026-10-06 21:30 UTC, first production run:
  - Florida: "checked 35 succeeded PaymentIntents, settled 0, errors 32" (`payments` not loaded).
  - Easy Home: "checked 1, settled 0, errors 0".
- 2026-10-06 T6, hotfix merged in all three backends:
  - Changes: `findOneByCode(..., ['payments'])`; expand `data.latest_charge`; skip fully refunded or disputed intents, failing closed when the charge is not expanded.
  - Merged as: Easy Home PR #13 `f90d95c` (TDD: 10 RED, then 18/18 GREEN, full suite 1081), 305 PR #4 `93c9fd7` (18/18, tsc 0, build 0), Florida back PR #2 `e2e0aa0` (tsc 0, build 0).
- 2026-10-06 21:40 UTC, verified in production after the hotfix:
  - Florida: "checked 35 succeeded PaymentIntents, settled 27, skipped refunded/disputed 1, errors 0". The 28 distinct stuck orders are accounted for: 27 settled, and 1 (`6XB5AJQAJSJGANN7`) skipped as refunded or disputed.
  - Florida: order `EDKHSVTT468PTRTD` has 5 succeeded, non-refunded PaymentIntents. It was settled with `pi_3UNKYpDQCZzZSPHq2BRFdmd7`, so the customer may have been charged up to 5 times. Needs manual review in Stripe.
  - Easy Home: two summary lines at the same time from different services ("checked 0" and "checked 1, skipped 1"). Both Railway services boot server and worker (start-production), so the task may be executing twice. Follow-up: confirm the scheduler lock, or make only one service run the worker.
- 2026-10-06 investigation of the Easy Home "double run" (read-only):
  - The double run is not a scheduler lock failure. Vendure locks tasks with `SELECT ... FOR UPDATE` plus a hold window (`default-scheduler-strategy.js:234-269`).
  - Root cause: Easy Home production runs on SQLite. Neither service has `DATABASE_URL`, and the boot log warns about it. `vendure-server` uses SQLite on a volume (`SQLITE_DB_PATH`); `vendure-worker` has no volume, so it runs its own empty, ephemeral SQLite, a separate phantom store. The Railway Postgres is unused.
  - The real reconciliation runs inside the `vendure-server` container (start-production boots server and worker): "checked 1, skipped 1". There is no double-settlement risk. `vendure-worker` has no public domain, so it is not exposed.
  - The Easy Home boot log also warns about weak `SUPERADMIN_*` credentials.
- 2026-10-06 Florida 21:50 UTC: "checked 35, settled 0, skipped 1, errors 0". Idempotency is confirmed in production.
- 2026-10-06 305:
  - The live storefront (305discount.com) uses the Easy Home backend (`admin.easyhomeappliancesbr.com`, which is the Easy Home vendure-server on Railway), so the `apps/server` in the 305 repo is not deployed and PRs #3 and #4 are dormant code.
  - The 305 Vercel project has `VENDURE_SHOP_API_URL` and `VENDURE_CHANNEL_TOKEN`, but NO `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, so it presumably cannot take Stripe payments.
  - Whether 305 has its own channel and Stripe PaymentMethod in the Easy Home backend is unverified (the values are sensitive).
- Follow-ups outside scope: the Florida worker logs `ResendEmailSender: Invalid "to" field`; the Easy Home Vercel Preview is missing its env vars.
- Follow-up outside scope: the Easy Home and 305 root TypeScript is 6.0.3, which breaks root-level `tsc` on the deprecated `baseUrl` (TS5101).

## Next step
T5 (user): fix the Florida Stripe webhook destination; review order EDKHSVTT468PTRTD in Stripe for duplicate charges; locate the 305 backend deploy. Follow-ups: Easy Home possibly running the task twice, the Resend "to" errors, missing Easy Home Vercel Preview env vars, and Florida front lint errors.
