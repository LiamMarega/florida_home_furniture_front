# Feature: Checkout error feedback and US-only addresses

- Feature id: `checkout-error-feedback`
- Engram mirror: `odd/checkout-error-feedback/tasks` (project `florida-home-back`)
- Repo: `florida_home_furniture_front` — branch `fix/checkout-error-feedback` (from `origin/main` `24415ce`)
- Started: 2026-11-20

## Objective

The checkout never fails silently. A shopper who enters an address outside the United States is told early,
next to the field, what to fix; every failure in the checkout shows a specific message that says what to do next.

## Problem and evidence (read-only map, 2026-11-20)

- Non-US addresses are neither refused nor explained: no country field (hidden `US`), state is free text with
  `min(2)` ("Córdoba" passes), "US only" is never stated (`lib/checkout/types.ts`,
  `components/checkout/shipping-address-section.tsx:52-62`). The backend registers no shipping restrictions, so a
  card order with a non-US state can be placed; only Affirm refuses it.
- Saved addresses: chosen without validation (`app/checkout/page.tsx:104-125`); a guest address with country
  "Argentina" fails with a generic retry message; the add/edit modal has no validation and logs save errors to
  the console only (`app/profile/components/AddressFormModal.tsx:90-92,186-219`); an edited address does not refresh
  the form.
- Step errors render in one box at the top of the card without `role=alert`, focus or scroll
  (`app/checkout/page.tsx:251-255`): on a long or mobile form the spinner just stops.
- Shipping methods: a load error is ignored and zero methods read as "available after entering your address"
  (`app/checkout/page.tsx:44-47`, `components/checkout/shipping-methods-section.tsx:91-96`); the list is never
  refetched after the address is saved.
- `ORDER_TRANSITION_FAILED` maps to a generic "not ready for payment", hiding "without a ShippingMethod" and
  "insufficient stock of …" (`lib/checkout/utils.ts:26,49-52`).
- `set-shipping-address` returns GraphQL `errors` that `readableApiError` cannot read, and billing failures say
  "shipping address" (`app/api/checkout/set-shipping-address/route.ts:52-54,71-73,84-86`).
- A Stripe.js / Payment Element load failure leaves "Pay now" disabled over an empty panel
  (`components/checkout/payment-step.tsx:114,138`).
- Field errors are not linked for screen readers (`components/checkout/form-field.tsx:28-40`).

## Decisions

1. The store delivers within the United States only, and says so under the Shipping Address heading.
2. State is a native select of the 50 states, DC and the territories the backend knows (PR, GU, AS, MP, VI),
   stored as the two-letter code; saved values (codes or names) are normalized, anything else asks the shopper to
   choose a state. Phone stays free (buyers abroad may ship to the US).
3. No backend change: the storefront enforces US addresses; Affirm already refuses non-US country or ZIP.
4. No new dependency and no test framework: logic is checked with `node --experimental-transform-types` scripts,
   UI with a browser pass.
5. The schema accepts state codes only; saved names ("Florida") and lowercase codes are normalized in
   `addressToFormData`, and a saved country naming the US ("USA", "United States", which the account address
   routes answer after a save) becomes `US`. The country has no input: a read-only "United States" line carries
   its error and is focused on submit.
6. Billing Full Name and Phone are optional (no asterisk), as the schema says: Affirm falls back on the customer's
   name and treats the phone as optional.

## Tasks

| ID | Task | Route | Status |
| --- | --- | --- | --- |
| E1 | US-only address entry: state select, "ZIP Code"/"State" labels, US-only note, non-US country refused with a message that names the saved address, saved addresses normalized and validated on selection, billing asterisks match the schema, route trims the state; readable address errors (unrecognized country → US-only message, billing failures say billing) | delegated writer | done (commit recorded in the next update) |
| E2 | Visible step errors: `role=alert`, focus and scroll when the error changes; field errors linked (`aria-invalid`, `aria-describedby`) | delegated writer | pending |
| E3 | Shipping methods: load error with Retry; zero methods explained with a way forward and submit blocked; list refetched after the address is saved | delegated writer | pending |
| E4 | Payment readiness: missing shipping method and insufficient stock named; Stripe load failure shown with the alternative | delegated writer | pending |
| E5 | Saved-address modal: same US rules as checkout, inline save errors, edited or new address selected and the form refreshed | delegated writer | pending |

Route evidence: about 12 files across forms, hooks, routes and the profile modal (writer trigger: 2+ non-trivial files).

## Acceptance criteria

- An Argentine address (state "Córdoba", ZIP "5000") cannot be submitted; the shopper sees, next to each field,
  that a US state and a 5-digit ZIP code are needed, and the US-only note.
- A saved address outside the US or with an invalid field shows what to fix as soon as it is selected.
- Every step failure is visible without scrolling, announced to screen readers, and says what to do next.
- No delivery option → the shopper is told so and how to reach the store; a load failure offers Retry.
- Payment cannot start without a shipping method or with missing stock, and the message says which.
- A failed card form load says so and points to Affirm or a refresh.

## Checks

- Logic check (schema, state normalization, message mapping): RED before, GREEN after.
- `npx tsc --noEmit`; `npx eslint` on changed files; `npm run build` (2 pre-existing lint errors elsewhere).
- Browser pass of the address and error states.

## Delivery

`ask-on-risk`; forecast about 500 authored changed lines (over the 400-line budget): chain strategy asked at PR time.

## Progress and evidence

- 2026-11-20: map done; feature doc created.
- 2026-11-20 E1 done (delegated writer). `lib/checkout/us-states.ts` lists 56 places (50 states, DC, PR, GU, AS,
  MP, VI) with `isUsStateCode`, `toUsStateCode`, `toUsCountryCode`; the schema requires a listed state code for
  shipping and a separate billing address ("Select a US state") and `shippingCountry === 'US'` ("This saved
  address is outside the United States. Please choose or add a US address."); `StateSelect` (native select, codes);
  "We deliver within the United States only." under the heading; read-only Country line with its error; labels
  "State" and "ZIP Code"; `addressToFormData` normalizes state and country and fills every field; a chosen address
  is validated at once (`trigger`) and a flagged field is re-checked as it changes; set-shipping-address trims
  states and answers readable `{ error }` ("We only deliver within the United States. Please use a US address."
  for an unknown country; "We could not save your shipping|billing address. Please check it and try again.").
  Checks: logic check `checkout-feedback-check.mts` RED (15 of 16 failing) before, then E1's 13 tests GREEN
  (E4/E5 tests still RED by design); `checkout-address-check.mts` 9/9 (its harness gained a resolve hook for the
  extensionless `./us-states` import, fixtures unchanged); `npx tsc --noEmit` exit 0; `npx eslint` on the changed
  files: no issues.

## Next step

E2 and E3 (visible step errors, shipping method states), then E4, E5.
