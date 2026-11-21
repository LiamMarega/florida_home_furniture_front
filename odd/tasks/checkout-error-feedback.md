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
| E1 | US-only address entry: state select, "ZIP Code"/"State" labels, US-only note, non-US country refused with a message that names the saved address, saved addresses normalized and validated on selection, billing asterisks match the schema, route trims the state; readable address errors (unrecognized country → US-only message, billing failures say billing) | delegated writer | done `015e577` |
| E2 | Visible step errors: `role=alert`, focus and scroll when the error changes; field errors linked (`aria-invalid`, `aria-describedby`) | delegated writer | done `f8c5d34` |
| E3 | Shipping methods: load error with Retry; zero methods explained with a way forward and submit blocked; list refetched after the address is saved | delegated writer | done `f8c5d34` |
| E4 | Payment readiness: missing shipping method and insufficient stock named; Stripe load failure shown with the alternative | delegated writer | done `192e566` |
| E5 | Saved-address modal: same US rules as checkout, inline save errors, edited or new address selected and the form refreshed | delegated writer | done `62f859c` |

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

`ask-on-risk`; forecast about 500 authored changed lines, actual +772/−152 (over the 400-line budget). At PR time
the owner chose one PR with a size exception and a production deploy once the Vercel preview passes (2026-11-20):
PR #34. Parent verification before delivery: `gentle-ai review assess` medium (executable change; writer not on a
small model, so no separate verifier); spot check of both logic checks (16/16, 9/9) and `tsc` 0; structural check
that all 56 USPS codes are accepted, names normalize ("Florida" → FL, "District of Columbia" → DC) and junk is
refused ("Córdoba", "XX" → empty).

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
  files: no issues. Commit `015e577`.
- 2026-11-20 E2 and E3 done (delegated writer). The step error box is `role="alert"`, `tabIndex={-1}`, focused and
  scrolled to the center whenever its message changes (each attempt clears it first); `FormField` and
  `StateSelect` set `aria-invalid` and `aria-describedby` to their message's id. The shipping method section shows
  "We could not load the shipping methods. Please check your connection and try again." with a Retry button
  ("Retrying..." while it runs) when the list fails with nothing loaded; an empty list says "No shipping method is
  available for this address." with the store's phone (+1 (305) 924-0685) and the /contact page, and disables
  "Continue to Payment" (`aria-describedby` points to that message); the list is refetched after the address is
  saved. UI only: no meaningful RED (no DOM test runner).
  Checks: `npx tsc --noEmit` exit 0; `npx eslint` on the changed files: no issues; browser pass
  (scratchpad `browser-pass/checkout-pass.cjs`, Playwright with Chrome for Testing against `next dev -p 3456`, no
  backend, every non-localhost request aborted, the storefront's API routes answered per scenario), 390x844
  viewport, 29 checks passing: E1 saved Argentine address flagged at once under State, ZIP Code and Country, each
  message cleared as it is fixed, a US address saved as "Florida"/"United States" fills FL with no message, submit
  with only the country to fix focuses the Country line; E3 load failure + Retry, then an empty list with phone and
  contact links and the button disabled; E2 a refused address shows the route's US-only message in the step alert,
  focused and in view after the page's smooth scroll. Commit `f8c5d34`.
- 2026-11-20 E4 done (delegated writer). `friendlyCheckoutMessage` names the payment-step reasons before the code
  mapping: "without a ShippingMethod" → "Please choose a shipping method, then continue to payment."; "insufficient
  stock of X" → "Sorry, we don't have enough stock of X. Please update your cart to continue."; other
  ORDER_TRANSITION_FAILED reasons keep the generic message. `getStripe()` resolves to null when Stripe.js cannot
  load (it rejected before, unhandled, and the card form waited forever); `PaymentStep` then, or on the Payment
  Element's `onLoadError`, shows "We couldn't load the card payment form. Please refresh the page and try again."
  (plus "You can also choose Affirm above if it's offered for your order." where the store offers Affirm) with a
  "Refresh the page" button, brought into view, and "Pay now" disabled. Payment logic unchanged.
  Checks: logic check tests 12-13 RED → GREEN (15 of 16 pass; the E5 test still RED by design);
  `checkout-address-check.mts` 9/9; `npx tsc --noEmit` exit 0; `npx eslint` on the changed files: no issues;
  browser pass 15 checks: both reasons named in a focused, in-view step alert; with Stripe.js blocked the payment
  step shows the card form message with and without Affirm, "Pay now" disabled, the alert in view, and no
  unhandled "Failed to load Stripe.js" rejection (it was one before). Not checked in a browser: `onLoadError` (needs
  real Stripe.js). Commit `192e566`.
- 2026-11-20 E5 done (delegated writer). `savedAddressSchema` holds the checkout's US rules for saved addresses (full
  name, street, city, a listed state code, a US ZIP code). The address dialog (profile and checkout) has the State
  select (saved names and lowercase codes preselected), "ZIP Code", a read-only Country "United States" (saved as
  `US`) and "We deliver within the United States only." in its description; it checks on save with messages under
  the fields (`aria-invalid`, `aria-describedby`, focus on the first to fix), re-checks a flagged field as it
  changes, and shows save and delete failures inside the dialog ("We could not save this address. Please try
  again.", "We could not delete this address. Please try again.", or a readable reason such as the 4-address limit)
  instead of only the console. City, State and ZIP stack on phones, as on checkout, so state names fit.
  `useSavedAddresses` create and update resolve to the saved address for accounts too, and checkout chooses it, so
  the form is refreshed and checked.
  Checks: logic check test 16 RED → GREEN (16 of 16 pass); `checkout-address-check.mts` 9/9; `npx tsc --noEmit`
  exit 0; `npx eslint` on the changed files: no issues; browser pass: fixing the saved Argentine address in the
  Edit dialog (messages, focus, live clearing, saved back as US, checkout form refreshed with FL/33130 and no
  message) and adding an address whose first save fails (message in the dialog, then saved, chosen and filled into
  the form): 20 checks; the full pass is 64 of 64 across the 8 scenarios. Commit `62f859c`.
- 2026-11-20 final verification on `62f859c`: `checkout-feedback-check.mts` 16/16; `checkout-address-check.mts` 9/9;
  `npx tsc --noEmit` exit 0; `npx eslint` on the 16 changed code files exit 0, no issues; `npm run build` exit 0
  ("Compiled successfully", the expected "GraphQL fetch error: TypeError: fetch failed" during static generation,
  no local backend).
- Delivery count: 765 authored changed lines in code (+613/−152, the feature document aside) over 4 work units:
  E1 `015e577` 353, E2+E3 `f8c5d34` 88, E4 `192e566` 85, E5 `62f859c` 239. Over the ~400 budget (forecast 500):
  under `ask-on-risk` the chain strategy is asked before the pull request.

## Next step

Choose the delivery (one PR, or a chain split at the work units above); push and the PR are the owner's decisions.
Follow-ups outside this feature's edit surfaces:
`app/profile/components/AddressesPanel.tsx` still calls `alert()` before rethrowing a failed save (the dialog now
shows the reason itself); on phones the payment step opens scrolled to where "Continue to Payment" was
(pre-existing; only the card form failure is brought into view).
