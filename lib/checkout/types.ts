import { z } from 'zod';

/** `12345` or `12345-6789`: the store ships within the US only, and Affirm refuses any other postal code. */
const US_ZIP_CODE = /^\d{5}(-\d{4})?$/;
const ZIP_CODE_MESSAGE = 'Enter a valid 5-digit ZIP code';

// Form validation schema
export const customerSchema = z.object({
  emailAddress: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),

  shippingFullName: z.string().min(2, 'Full name is required'),
  shippingStreetLine1: z.string().min(5, 'Street address is required'),
  shippingStreetLine2: z.string().optional(),
  shippingCity: z.string().min(2, 'City is required'),
  shippingProvince: z.string().min(2, 'State/Province is required'),
  shippingPostalCode: z.string().trim().regex(US_ZIP_CODE, ZIP_CODE_MESSAGE),
  shippingCountry: z.string(),
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
  need(length(data.billingProvince) >= 2, 'billingProvince', 'State/Province is required');
  need(US_ZIP_CODE.test((data.billingPostalCode ?? '').trim()), 'billingPostalCode', ZIP_CODE_MESSAGE);
});

export type CustomerFormData = z.infer<typeof customerSchema>;

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
