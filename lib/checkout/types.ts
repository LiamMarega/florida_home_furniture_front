import { z } from 'zod';
import { isUsStateCode } from './us-states';

/** `12345` or `12345-6789`: the store ships within the US only, and Affirm refuses any other postal code. */
const US_ZIP_CODE = /^\d{5}(-\d{4})?$/;
const ZIP_CODE_MESSAGE = 'Enter a valid 5-digit ZIP code';
/** The state is a code from the state select (saved names and lowercase codes are normalized before). */
const STATE_MESSAGE = 'Select a US state';
/** The form has no country input: only a saved address can bring another country. */
const OUTSIDE_US_MESSAGE = 'This saved address is outside the United States. Please choose or add a US address.';

// Form validation schema
export const customerSchema = z.object({
  emailAddress: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),

  shippingFullName: z.string().min(2, 'Full name is required'),
  shippingStreetLine1: z.string().min(5, 'Street address is required'),
  shippingStreetLine2: z.string().optional(),
  shippingCity: z.string().min(2, 'City is required'),
  shippingProvince: z.string().refine(isUsStateCode, STATE_MESSAGE),
  shippingPostalCode: z.string().trim().regex(US_ZIP_CODE, ZIP_CODE_MESSAGE),
  // `: boolean` keeps the type a string: an inferred `country is 'US'` would narrow it to the literal.
  shippingCountry: z.string().refine((country): boolean => country === 'US', OUTSIDE_US_MESSAGE),
  shippingPhoneNumber: z.string().min(10, 'Phone number is required'),

  billingSameAsShipping: z.boolean(),
  billingFullName: z.string().optional(),
  billingStreetLine1: z.string().optional(),
  billingStreetLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingProvince: z.string().optional(),
  billingPostalCode: z.string().optional(),
  billingCountry: z.string().optional(),
  billingPhoneNumber: z.string().optional(),

  shippingMethodId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.billingSameAsShipping) return;
  // A separate billing address must be complete: payment providers such as Affirm refuse a partial one.
  const need = (ok: boolean, path: string, message: string) => {
    if (!ok) ctx.addIssue({ code: 'custom', path: [path], message });
  };
  const length = (value: string | undefined) => (value ?? '').trim().length;
  need(length(data.billingStreetLine1) >= 5, 'billingStreetLine1', 'Street address is required');
  need(length(data.billingCity) >= 2, 'billingCity', 'City is required');
  need(isUsStateCode(data.billingProvince), 'billingProvince', STATE_MESSAGE);
  need(US_ZIP_CODE.test((data.billingPostalCode ?? '').trim()), 'billingPostalCode', ZIP_CODE_MESSAGE);
});

export type CustomerFormData = z.infer<typeof customerSchema>;

/**
 * A saved address (account address book, checkout's saved addresses) follows the checkout's US rules: a listed state
 * code and a US ZIP code. The country is always the US; nickname, second line and phone stay optional.
 */
export const savedAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  street: z.string().trim().min(5, 'Street address is required'),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().refine(isUsStateCode, STATE_MESSAGE),
  zipCode: z.string().trim().regex(US_ZIP_CODE, ZIP_CODE_MESSAGE),
});

// Shipping method type
export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  priceWithTax: number;
  metadata?: {
    deliveryTime?: string;
  };
}

// Payment method offered for the active order (Vendure `eligiblePaymentMethods`)
export interface EligiblePaymentMethod {
  code: string;
  name: string;
  isEligible: boolean;
  eligibilityMessage?: string | null;
}

/**
 * How a payment attempt ended on the page:
 * - failed: nothing was paid (declined, closed, invalid input): the payment method choice unlocks
 * - uncertain: the outcome is unknown: everything stays locked and the shopper checks the order status first
 * - paid: final success, the page moves on to the confirmation
 */
export type PaymentAttemptOutcome = 'failed' | 'uncertain' | 'paid';

// What the payment method selector hands each payment form, so only one payment runs per order
export interface PaymentAttemptHandlers {
  /** Called right before a payment attempt starts; false when another tab is paying this order: do not start. */
  onAttemptStart: () => boolean;
  /** Called once when the attempt ends (see PaymentAttemptOutcome). */
  onAttemptEnd: (outcome: PaymentAttemptOutcome) => void;
}

// Payment step props
export interface PaymentStepProps extends PaymentAttemptHandlers {
  clientSecret: string;
  orderCode: string;
  /** True while another tab is paying this order: the pay button stays disabled. */
  disabled?: boolean;
  onPaid: (orderCode: string) => void;
  onBack: () => void;
}

// Checkout step enum
export enum CheckoutStep {
  CUSTOMER_INFO = 'customer_info',
  PAYMENT = 'payment',
}
