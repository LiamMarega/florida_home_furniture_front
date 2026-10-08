# Easy Home backend: SQLite → Postgres cutover

## Objective
Easy Home's production Vendure, which also serves 305discount.com, runs on Postgres. Both Railway services (`vendure-server`, `vendure-worker`) share that database, so the separate worker processes real data and the scheduler lock dedupes tasks across instances.

## Problem
- Production runs on SQLite at `/vendure-assets/vendure.sqlite` on the vendure-server volume (3.9 MB). `DATABASE_URL` is unset in both services.
- `vendure-worker` has no volume, so it boots on the bundled image `vendure.sqlite`, which holds stale repo data. It is a separate phantom store.
- The Railway Postgres service is unused.

## Why
The user wants Easy Home and 305 clean, solid and working, with separate worker processes doing real work. Today the worker service is useless and the data lives on a single-instance SQLite file.

## Scope
- Use the existing repo tooling: `prepareDatabase` (migrations only) and `copy:sqlite-to-postgres` (one transaction, read-only source, row-count check).
- No code changes are needed for the cutover itself.

## Constraints
- Zero data loss: keep the SQLite volume and file untouched, and keep a snapshot as a backup.
- Minimal checkout downtime: during the copy, use `STORE_MODE=catalog`, which rejects Shop API mutations while browsing keeps working.
- Never first-boot both services at once on an empty Postgres, because migrations and bootstrap take no lock.
- Stripe payments that land during the freeze are settled later by the reconciliation task (7-day window).
- Rollback: remove `DATABASE_URL` from both services, which returns them to the SQLite volume. Orders taken on Postgres after reopening would then be lost, so decide on rollback before reopening.

## Tasks
- [ ] C1 Rehearsal: snapshot the prod SQLite read-only, pull it to the Mac, run `prepareDatabase` and the copy into a local Postgres, and confirm all row counts match.
- [ ] C2 Railway Postgres: confirm it is empty, then apply migrations only (`prepareDatabase`, `MIGRATIONS_STRICT=1`).
- [ ] C3 Freeze: `STORE_MODE=catalog` on vendure-server, and wait until no jobs are pending.
- [ ] C4 Final snapshot, pull with sha256 check, and copy into the Railway Postgres. It must print "all row counts match".
- [ ] C5 Switch vendure-server: `DATABASE_URL=${{Postgres.DATABASE_URL}}` and restore `STORE_MODE` in one change.
- [ ] C6 Once the server is healthy, switch vendure-worker to the same `DATABASE_URL`.
- [ ] C7 Verify:
  - `/health` returns 200, and the logs show `Using Postgres` and 0 migrations.
  - A Shop API products query works on both storefronts (Easy Home and 305).
  - The search rebuild has run.
  - The reconciliation task runs once per slot.
  - The worker logs are clean.
- [ ] C8 Docs: fix the stale README migration count and record that the cutover is done.

## Acceptance criteria
- Both services log `[database] Using Postgres`.
- Row counts match the snapshot.
- Both storefronts list products and checkout works.
- Each scheduled-task slot logs exactly one reconciliation summary.

## Out of scope (follow-ups)
- A worker-only start for `vendure-worker`. It needs a worker health-check server and a separate Railway config file. Today it runs server and worker, which is harmless on a shared DB.
- Weak `SUPERADMIN_*` credentials.

## Progress
- 2026-10-07: runbook mapped by an explorer, covering the copy script, migrations, assets, search index and races. The prod file location was verified: `/vendure-assets/vendure.sqlite`, 3.9 MB, written today.

- 2026-10-07 C1 done: rehearsal on a local Postgres 16 with a prod snapshot (sha verified). Migrations 3/3, copy "all row counts match", a local boot gave /health 200, and the Shop API matched prod (default 44/44, 305 0/0).
- 2026-10-07 C2 done:
  - The Railway Postgres was NOT empty. It held a stale June 4 import: 108 products, 0 orders, 0 customers, 1 channel, empty migrations table.
  - It was backed up with pg_dump to `scratchpad/cutover/railway-pg-before-cutover-20261007.dump` (83 tables), then the schema was recreated and migrations applied: 3 migrations, 92 tables.
- 2026-10-07 C3 done: `STORE_MODE=catalog` (16:14–16:23 UTC), verified by the mutation rejection message. No pending jobs (360 completed, 3 failed).
- 2026-10-07 C4 done: snapshot `/vendure-assets/vendure.sqlite.cutover-20261007.sqlite`, kept on the volume (sha f8126837…, verified locally). Copy result: all row counts match (98 products, 132 variants, 8 orders, 9 lines, 3 payments, 2 channels, 4 admins, 324 assets). The live SQLite vs snapshot comparison over 17 tables was identical, so there were no edits between snapshot and switch.
- 2026-10-07 C5 done: vendure-server on `${{Postgres.DATABASE_URL}}` with STORE_MODE back to ecommerce. Logs show "Using Postgres" and 0 migrations; the reindex was enqueued; search returns 44.
- 2026-10-07 C6 done:
  - vendure-worker is on the same `DATABASE_URL`.
  - It also needed `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` and `STOREFRONT_URL`, added as `${{vendure-server.*}}` references. Without them it would have consumed email jobs without being able to send them. The hashes match the server's.
- 2026-10-07 C7 done:
  - The 16:30 UTC reconciliation produced exactly one summary across both services, with the worker processing real data.
  - /health is 200, the dashboard is 200, the Shop API works on both channels, and the storefronts are 200 with Vercel prod Ready.
  - The readiness check could not log in: the env SUPERADMIN creds are stale because the passwords were changed in the dashboard. Hashes were copied, so existing logins are unaffected.
- 2026-10-07 incident found during C7, unrelated to the cutover:
  - The `305discount` channel was created in the dashboard at 16:01 UTC (not by us).
  - Both storefronts sent `VENDURE_CHANNEL_TOKEN=__default_channel__` (the channel code), which only works with a single channel, so EH has been returning 500 since 16:06 UTC and 305 since 16:01.
  - Fix: patched the Vercel env to the real default-channel token in both projects and redeployed prod; both are 200 again.
  - 305 was restored to the default channel, its last known good state. Whether it should use the new `305discount` channel (currently 0 products) is the user's decision.
- 2026-10-07 C8 done: docs PRs EH #14 (`f47718f`) and 305 #5 (`46b85ea`) cover the channel token warning and the 3-migration count. The redeploys after the merge are all SUCCESS/Ready.
- Cleanup: removed the local rehearsal Postgres container and the local SQLite copies (PII). The stale-PG dump stays in the scratchpad (no orders or customers).

## Remaining (user)
- Decide the 305 channel: keep the default (EH catalog) or switch to `305discount` (assign products, plus its own Stripe PaymentMethod). Then set the matching token in Vercel.
- 305 storefront: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing, and next-intl has `MISSING_MESSAGE` keys (Footer.*, Home.*).
- After a few days on Postgres: run `git rm --cached apps/server/vendure.sqlite`, then detach the old SQLite from the volume (keep the assets volume).
- Rotate or update `SUPERADMIN_*` env to strong values.

## Next step
None for the cutover. It is complete.
