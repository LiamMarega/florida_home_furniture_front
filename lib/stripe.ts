import { loadStripe, type Stripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
// When Stripe.js cannot load (script blocked or unreachable, missing key) this resolves to null instead of
// rejecting: Stripe's <Elements> never handles a rejection, and the card form says it could not load.
const stripePromise: Promise<Stripe | null> = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!).catch(
  (error: unknown) => {
    console.error('Stripe.js could not load:', error instanceof Error ? error.message : error);
    return null;
  }
);

export const getStripe = () => stripePromise;
