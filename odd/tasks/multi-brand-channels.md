# Multi-brand channels (Easy Home + 305 Discount on one Vendure backend)

Repo: `~/Projects/Freelancer/easy-home-appliance` (Vendure 3.6.4, Postgres since 2026-10-07)
Branch: `feat/multi-brand-channels` (from `main` @ f47718f)

## Objective
One Vendure admin (the Easy Home backend) holds both brands. Each brand gets its own channel with the full catalog kept in sync, and each brand bills through its own Stripe account. Default is the combined admin view.

## Problem
- 305discount.com runs on the Easy Home backend but sends `__default_channel__`. The `305discount` channel exists in the prod DB but is empty (no products, no payment methods). So 305 orders get mixed in with Easy Home's in Default and are charged to the Easy Home Stripe account.
- A PaymentMethod can't be removed from Default (`payment-method.service.js:181-183`), and creating one in any channel also assigns it to Default (`:85`). The Stripe plugin picks the first PaymentMethod in the channel with a Stripe handler (`stripe.service.js:78`, `stripe.controller.js:141`). If a storefront stays on Default and Default holds two Stripe methods, it could charge through the wrong account.

## Decision (user, 2026-10-07): option A
- New channel `easyhome` for the Easy Home storefront; the existing `305discount` channel for 305.
- No storefront uses Default. It is the aggregate admin view only.
- Each brand channel has exactly one Stripe PaymentMethod:
  - `easyhome` reuses the existing `stripe` method (the Easy Home account);
  - `305discount` gets a new `stripe-305` method (the 305 account).

## Scope (code)
- T1 Config: `catalogOptions.productVariantPriceUpdateStrategy = new DefaultProductVariantPriceUpdateStrategy({ syncPricesAcrossChannels: true })`.
- T2 Plugin `channel-catalog-sync`: when a Product, ProductVariant, Collection or Facet is created, assign it to every channel.
- T3 Scripts:
  - Idempotent `setup-brand-channels`:
    - ensure the brand channels exist, with currency and zones matching Default;
    - assign every product, variant, asset, collection, facet, shipping method, promotion and stock location to each brand channel;
    - assign existing customers to every brand channel;
    - assign Default-only orders to `easyhome`.
  - Make `setup-payment-methods` channel-aware: take a channel token and a code, and check for an existing method per channel.
- T4 Readiness and CORS:
  - `check:ecommerce` sends `vendure-token` for each channel;
  - the multiple-Stripe warning skips Default;
  - CORS supports several storefront origins, if the browser calls Vendure directly;
  - `e2e-stripe-webhook.mjs` gets its channel token from env.

## Out of scope / follow-ups
- Email branding per channel. Today emails use one brand for the whole process (`resolveEmailBrand`, `vendure-config.ts:66`), so 305 customers get Easy Home-branded emails. That's pre-existing, and the user will decide on it separately.
- Historical orders can't be attributed to 305: no marker exists, and every one of them was charged to the Easy Home Stripe account. All of them go to `easyhome`.

## Constraints
- Prod data and config changes need explicit user OK at the time:
  - running the scripts;
  - the Stripe PaymentMethod and webhook for the 305 account;
  - Vercel/Railway env changes (`VENDURE_CHANNEL_TOKEN`, the 305 `pk_live`);
  - deploys.
- Every brand channel uses the same currency (USD): price sync only applies within one currency.
- Payment method codes must start with `stripe` (the storefront and the readiness checks depend on it).
- Delivery strategy: ask-on-risk. Forecast is about 450 authored lines; pick the chain strategy when the running count crosses about 400.
- RDD is off (global).

## Checks
- `npm test` (Vitest, repo root). Per file: `npx vitest run <path>`.
- `npx tsc --noEmit -p apps/server`.
- Storefront: `npm run lint -w storefront` and `npm run check-types -w storefront` (only if storefront files change).

## Tasks
- [ ] T1 Price sync across channels (config). Route: delegated, bundled with T2.
- [ ] T2 `channel-catalog-sync` plugin, with a test of the pure logic. Route: delegated writer (2+ non-trivial files).
- [ ] T3 `setup-brand-channels` script and a channel-aware `setup-payment-methods`. Route: delegated writer.
- [ ] T4 Readiness per channel, Default warning skip, CORS origins, e2e token env. Route: delegated writer.
- [ ] T5 (prod, user OK) Run the cutover:
  1. Deploy.
  2. Run `setup-brand-channels`.
  3. Payment methods: assign `stripe` to `easyhome`, create `stripe-305` in `305discount`.
  4. Add a webhook in the 305 Stripe account pointing to `/payments/stripe`.
  5. Switch the storefront tokens: EH → `easyhome`; 305 → `305discount`, plus the 305 `pk_live`.
  6. Run readiness for each channel.

## Progress / evidence
- 2026-10-07: Exploration done (core and Stripe plugin behavior verified in node_modules; affected code mapped). Feature doc created.
- T1 `3966091`, T2 `f202c0a`. Both committed; 202 authored lines.
  - RED/GREEN on `missing-channels.test.ts` (5/6 failed against the stub, then 6/6 passed).
  - `npm test` 1087 passed.
  - Server tsc (`apps/server/node_modules/.bin/tsc --noEmit -p apps/server`) exit 0. Parent spot-check reran it and the plugin tests: OK.
  - Root `npx tsc` fails on main too (TS 6.0.3, TS5101 `baseUrl`), so that command checks nothing. Pre-existing.
  - `review assess`: high. RDD is off, so an independent verifier is running.
- Known gaps from T2:
  - Facet values added later to an existing facet aren't auto-synced.
  - Option groups aren't assigned (the shop API doesn't filter them by channel, so storefronts are unaffected).

- T1/T2 independent verifier: **pass-with-notes**. Event shapes, assign args, transactions, server-only guard and no-loop all checked against the 3.6.4 dist. Findings:
  1. FacetValueEvent isn't handled; the variant handler doesn't assign option groups or assets.
  2. The duplicator emits Product and Variant `created` events after the same commit, and the parallel handlers race (duplicate-key on Postgres, no retry).
  3. Assignments depend on the creator's permissions; they should use a SuperAdmin ctx.
  4. A partially failed assignment can leave channels inconsistent (the backfill script covers this).
  5. Price sync ignores `pricesIncludeTax`, so every channel must share that setting. T3 now aborts on a mismatch (sent to the writer).
- [ ] T2b (reopened from verifier findings 1–3), a scoped correction:
  - subscribe to FacetValueEvent;
  - the variant handler assigns the parent products via `assignProductsToChannel`;
  - serialize the assignments (`concatMap`);
  - SuperAdmin ctx for the assignments.
  Route: delegated writer after T3 (single writer).

- T3: `55f281c` (setup-brand-channels) and `9441478` (channel-aware setup-payment-methods). +1254/−32 lines, about 366 of them tests.
  - RED/GREEN on the helper tests: 52/52 in `brand-channels`. `npm test`: 1139 passed. Server tsc exit 0.
  - Parent spot-check reran the dir tests and tsc: OK. Assess: high. Independent verifier is running.
  - Vendure findings:
    - `ChannelService.create` grants no roles, so the script grants SuperAdmin/Customer per channel.
    - `getChannelFromToken` falls back to Default while it's the only channel, so the scripts look channels up by token in the repository.
    - The root collection must be assigned to every channel.
    - Search reindex runs per channel.
- Delivery: the running count is about 1490 authored lines. The chain-strategy question is still open with the user.

- T2b: `2fb01bd` (superadmin helper moved to `src/shared`) and `d31c136` (plugin hardening). +585/−73 lines, 369 of them tests.
  - RED 14/30 → GREEN 82/82. Mutation checks: removing the queue or the superadmin ctx breaks the matching tests. `npm test`: 1163 passed. tsc: exit 0.
  - Parent spot-check: OK.
  - Known limit: `assignProductsToChannel` rewrites existing variants' target prices from the ctx channel, with 0 when a price is missing. That only happens when data is already out of sync, because creating a variant always creates a Default price (`product-variant.service.js:375-381`). Independent verifier running.
- T3 verifier: **pass-with-notes, with real defects**:
  1. HIGH: a soft-deleted product option aborts the run at the same batch on every attempt (`assignProductsToChannel` assigns deleted options, then `getEntityOrThrow` throws).
  2. A brand channel that already has its own root collection ends up with two roots.
  3. `--channel` without `--code` silently attaches the EH Stripe account to 305. The warning also tells the operator to "disable" the extra method, but `enabled` is global and the webhook ignores it.
  4. The reindex is skipped on a re-run.
  5. `console.error(err)` can leak `apiKey` (TypeORM parameters).
  6. With no flags, a method with a code other than `stripe` gets duplicated.
  7. The dry-run doesn't warn that re-assigning a product rewrites its prices.
- [ ] T3c: scoped correction of findings 1–7. Route: delegated writer (running).

- T2b verifier: **pass-with-notes**. All 4 fixes are correct. Real defect:
  - The price source is the event channel. If a variant is missing its price in that channel, it gets 0 (`product-price-applicator.js:81`), and the sync spreads the 0 to Default and the other channels.
  - Scenario: an easyhome admin adds a variant while a sibling variant isn't in easyhome.
  - Fix: build the SuperAdmin ctx in Default. Default always has a price, and under the sync it equals the brand price.
  - Nits: build requests inside the `try`; wrap `onError` in a `try`; add a test for an event coming from a brand channel; check `txCtx` in the tests.
  - Not persisted: the in-memory queue has no retry. Reconcile by re-running `setup-brand-channels` (document this).
- [ ] T2c: price source = Default ctx, plus the nits above. Route: inline after T3c (to keep a single writer).

- T3c: `70944ff` and `717bd6d`. All 7 findings confirmed in dist and fixed:
  - fallback per product, plus a preflight count of soft-deleted options and groups;
  - abort on a root conflict (including two roots in Default);
  - `--code` required when `--channel` is given, with a refusal to share a method across brand channels;
  - the warning counts every Stripe-handler method and advises removing, not disabling;
  - reindex always runs on `--apply`;
  - `err.message` only;
  - the no-flags compat preserved;
  - the reassign price warning.
  Numbers: +851/−111. 118 tests in the dirs; `npm test` 1199. tsc exit 0. Parent spot-check OK. SQL preflight queries are documented in the README.
- T2c `890d772` (inline, parent):
  - the SuperAdmin ctx uses Default as the price source;
  - the request is built inside the `try`;
  - `serialQueue` survives a throwing `onError`;
  - README note to re-run the script to reconcile.
  RED: 2/32 failed (the brand-channel price-source test and the `onError` throw test). GREEN: 32/32; `npm test` 1201. tsc exit 0.
- [x] T1, T2, T2b, T2c, T3, T3c: done, with the evidence above.
- T4: `0d6d72f` (readiness per channel) and `1f78d24` (e2e token from env). +374/−59 lines, 201 of them tests.
  - RED: 8 + 13 failures. GREEN: 69/69 and 75/75. `npm test` 1223. tsc exit 0. ts-node compile of the readiness script OK; `node --check` on the e2e script OK. Parent spot-check OK.
  - CORS: no change. The storefront calls Vendure only from server-only `lib/vendure/api.ts` (`next/headers`).
  - Follow-up: the e2e script's eligibility check looks for the exact code `stripe`, so it fails on the `305discount` channel (`stripe-305`).
  - Assess: high. Independent verifiers running for T4 and for T3c.
- Running total about 2800 authored lines (about 1100 of them tests). The delivery-strategy question to the user is still open.

- T4 verifier: **pass-with-notes**.
  - The header is sent on every request, the mismatch FAILs, and a brand channel with 0 or 2+ Stripe methods FAILs.
  - Notes:
    - refunds use the dashboard's current channel, so 305 refunds must be done from the 305 channel;
    - the FAIL text should mention the header name;
    - document the unknown token;
    - run `setup:payments easyhome` right after `--apply`;
    - check that the two brand Stripe method ids differ;
    - missing test: Default with two enabled methods → INFO.
- T3c verifier: **pass-with-notes**.
  - All 7 fixes are correct, the fallback mirrors `product.service.js:265-297`, the dry-run is side-effect free, the SQL matches the schema, and no secrets are printed.
  - Gaps:
    - the root step must run first, because a server restart mid-run can create a second root;
    - `planPaymentMethod` must refuse a second Stripe code in a brand channel;
    - a throw in a non-product step skips the reindex and the failure list;
    - the fallback itself is untested, so rehearse on a prod snapshot;
    - wording: the plugin ignores `enabled` only in the webhook.
- [ ] T6: pre-cutover hardening, covering the gaps from both verifiers. Route: delegated writer (running).
- T5 update: add a **local rehearsal on a restored prod snapshot** before `--apply` in prod. Pulling the snapshot needs the user's OK.
- [x] T6 `fc428ff`, `3384779` (writer):
  - root collection assigned first;
  - second Stripe code refused in a brand channel;
  - `runChannelSteps` continues after a throw, reindexes and prints failures;
  - `enabled` wording fixed;
  - README: refunds only from the brand channel, header and unknown-token docs, rehearsal SQL;
  - test: Default with two enabled methods reports INFO.
  Evidence: RED 9+1 failures → GREEN; `npm test` 1236. Parent spot-check OK.
- T6 verifier: **pass-with-notes, no defects**. Notes:
  - check storefront tokens before creating channels;
  - orders placed in the step 4–6 window;
  - dry-run summary wording;
  - missing `none` test;
  - rehearsal must use the `:dev` scripts.
- [x] T6b (inline, parent):
  - `9fdbf3b`: dry-run summary wording, plus the `none` regression test. RED 1 failure → GREEN; `npm test` 1238; tsc 0.
  - `1749263`, cutover reordered: EH switches to `easyhome` **before** `stripe-305` exists, so no storefront uses Default while it holds 2 Stripe methods. Also:
    - step 2 checks the storefront tokens;
    - step 7 re-runs `--orders-to easyhome` after the EH switch;
    - the rehearsal uses the `:dev` scripts with NODE_ENV unset.
- Chain built locally (`build-chain.sh`). The last slice tree equals `backup/multi-brand-channels-all` @ `1749263`.
  - Slices: 01 383, 02 405, 03 359, 04 354, 05 364, 06 545 (size:exception), 07 354, 08 202, 09 437, 10 219 (docs).
  - Per-slice check, all tsc=0. Vitest per slice, all passing: 1107, 1113, 1136, 1170, 1183, 1183, 1214, 1214, 1238, 1238.
- [x] Pushed and PRs opened (user OK, 2026-10-07).
  - Tracker #15: draft, `feat/multi-brand-channels` → `main`.
  - Children #16–#25 in order, each based on its parent. Every PR's diff equals exactly its slice (no polluted diffs).
  - Label `size:exception` created and applied to #21.
  - Each body has a Chain Context table, the diagram with 📍, scope, and the Claude Code footer (matching the repo's earlier PRs).
  - `backup/multi-brand-channels-all` @ `1749263` stays local.
- [ ] T5 prod cutover: follow the README runbook (11 steps). Pending the user's explicit OK, starting with pulling the prod snapshot for the rehearsal.

## T5 production log (2026-10-08 UTC; the user chose to skip the rehearsal: "probemos todo en prod directamente")
- Chain merged (user OK): #16–#25 into the tracker (merge commits, clean diffs on each retarget), then #15 into `main` → `a665d79`. The `main` tree equals the verified tree.
- Vercel storefront preview check fails on every PR, #12–#14 included, so it's pre-existing and not caused by this chain.
- Railway `vendure-server` and `vendure-worker` deployed `a665d79`: SUCCESS.
- Backup: `~/Projects/Freelancer/easy-home-appliance-backups/prod-before-brand-channels-20261008T001639Z.dump` (407 KB, mode 600, 92 tables with data).
- Container layout: `/usr/src/app` is the server package, so run `npm run <script> --` with no `-w`. Run via `railway ssh -s vendure-server -- sh -c '...'`.
- Step 3, dry-run, exit 0:
  - per channel: 44 products, 53 collections, 8 facets / 89 values, 1 shipping, 1 stock location, 1 customer;
  - 8 orders to easyhome;
  - 0 products with deleted options;
  - root #1, no conflict.
  - WARNING: `305discount.trackInventory=false` vs Default `true`. Left unchanged; user decision pending.
- Step 3, `--apply`, exit 0:
  - `easyhome` created (#3) with its roles and root;
  - everything assigned, as in the dry run;
  - 279/324 assets per channel (the rest aren't linked to products);
  - reindex jobs 94 and 186 COMPLETED.
- Step 4: `setup:payments --channel easyhome --code stripe` assigned `stripe` (#4) to easyhome, exit 0. Easyhome has exactly one Stripe method.
- Step 5: `check:ecommerce` can't log in. `InvalidCredentialsError`: the env SUPERADMIN creds don't match the DB (follow-up: rotate or align them).
  - Replaced with read-only checks:
    - SQL: Stripe methods per channel (Default #4, easyhome #4, 305discount none); 44 products and 44 prices per brand channel; every price equal to Default (44/44 each); `pricesIncludeTax` and USD match.
    - Public Shop API: the `easyhome` and `305discount` tokens resolve to their own channel, with 44 products, search 44, 47 top-level collections, same price.
- Step 6: Vercel `easy-home-appliance-storefront` env `VENDURE_CHANNEL_TOKEN=easyhome` (Preview and Production) set with the CLI (the MCP connection can't see that project), then production redeployed (`aate9k39c`, aliased www.easyhomeappliancesbr.com). Home page returns 200 with products.
- Step 7: re-ran `setup:channels --apply`: 0 to assign, 0 orders in the window. Exit 0. Reindex jobs 187 and 188.
- [ ] Step 8, the 305 Stripe method. Needs the user:
  - add a webhook endpoint in the 305 Stripe account: `https://admin.easyhomeappliancesbr.com/payments/stripe`;
  - create the PaymentMethod `stripe-305` in the 305discount channel from the dashboard, so the keys never pass through chat or CLI.
- [ ] Step 9: verify 305discount has exactly one Stripe method, with an id different from #4.
- [ ] Step 10: 305 Vercel `VENDURE_CHANNEL_TOKEN=305discount` and the 305 `pk_live`.
- [ ] Step 11: smoke test (a real order and refund per store, done by the user).

## Next step
User: the 305 Stripe webhook and payment method (step 8), and the decision on `305discount.trackInventory`.

## Delivery (user, 2026-10-07): feature-branch-chain
- Tracker: `feat/multi-brand-channels` reset to `main`, with a draft no-merge PR to `main`.
  - Before the reset, the current branch is kept as the backup `backup/multi-brand-channels-all`.
- Children: PR1 → tracker, each later PR → its parent branch.
- Slices are built from the net final diff per area, one pass. Lines include tests:
  1. `01-sync-helpers`: missing-channels, serial-queue, sync-requests, with tests. About 383.
  2. `02-sync-plugin`: plugin, its test, `shared/superadmin.ts`, `vendure-config` (price sync and registration), README reconcile note. About 408.
  3. `03-channel-settings`: cli-args, channel-settings, with tests. About 359.
  4. `04-assignment-plan`: assignment-plan, catalog-checks, run-report, with tests. About 326.
  5. `05-assign-step`: assign-step and its test. About 229.
  6. `06-setup-brand-channels`: the script, `package.json` and the README brand-channels section. About 564, needs **size:exception**: one sequential `main()`, which can't be split cohesively.
  7. `07-payment-plan`: payment-method-plan and its test. About 302.
  8. `08-setup-payment-methods`: the script and the README payments section. About 212.
  9. `09-readiness`: T4 `0d6d72f` (about 420) plus `1f78d24` (about 13), about 433 in total. Just over budget: one cohesive feature with its tests.
- Push and PR creation only with the user's OK.

## Next step
T4 (running) → assess/verify → build the slice branches locally → ask before push/PRs → T5 prod cutover with explicit OK.
Delivery: the running count will cross about 400 lines with T3, so the chain strategy is pending a user answer.
