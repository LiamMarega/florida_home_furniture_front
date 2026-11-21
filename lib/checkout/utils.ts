/**
 * Utility functions for checkout process
 */

export const formatPrice = (price: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price / 100);
};

/** Shown when the order a checkout step works on is gone or no longer in the state that step expects. */
export const CART_CHANGED_MESSAGE = 'Your cart has changed or expired. Please review your cart and try again.';
const ORDER_NOT_READY_MESSAGE = 'Your order is not ready for payment yet. Please review your details and try again.';
export const EMAIL_IN_USE_MESSAGE = 'This email address is already registered. Please sign in to continue.';
const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please refresh the page and try again.';
const AFFIRM_DECLINED_MESSAGE = 'Affirm declined the payment. You can try again or choose another payment method.';

// Vendure error codes (an ErrorResult's `errorCode`) and the storefront routes' own codes, with what the shopper sees.
const MESSAGES_BY_CODE = new Map<string, string>([
  ['NO_ACTIVE_ORDER', CART_CHANGED_MESSAGE],
  ['NO_ACTIVE_ORDER_ERROR', CART_CHANGED_MESSAGE],
  ['ORDER_MODIFICATION_ERROR', CART_CHANGED_MESSAGE],
  ['ORDER_PAYMENT_STATE_ERROR', CART_CHANGED_MESSAGE],
  ['ORDER_STATE_TRANSITION_ERROR', ORDER_NOT_READY_MESSAGE],
  ['ORDER_TRANSITION_FAILED', ORDER_NOT_READY_MESSAGE],
  ['EMAIL_ADDRESS_CONFLICT_ERROR', EMAIL_IN_USE_MESSAGE],
]);

// Raw backend texts (Vendure's own messages, Affirm's decline reason and code), with what the shopper sees.
const MESSAGE_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bno active order\b/i, CART_CHANGED_MESSAGE],
  [/may only be (modified|added) when/i, CART_CHANGED_MESSAGE],
  [/cannot transition order/i, ORDER_NOT_READY_MESSAGE],
  [/not currently authorized/i, SESSION_EXPIRED_MESSAGE],
  [/^affirm declined the payment\b/i, AFFIRM_DECLINED_MESSAGE],
];

// Technical text never meant for the shopper: an error code, a transport or parsing failure, a generic route label.
const TECHNICAL_TEXT =
  /\w_\w|graphql|json|econn|etimedout|failed to|load failed|networkerror|unexpected token|internal server error|invalid response/i;

/**
 * The reasons Vendure refuses the payment step that the shopper can act on, which the payment-intent route sends
 * behind the generic ORDER_TRANSITION_FAILED code: the order has no shipping method, or not enough stock of the
 * items it names ("... due to insufficient stock of Kendall Sofa, Lulu Chair").
 */
function paymentReadinessMessage(text: string): string | undefined {
  if (/without a ShippingMethod/i.test(text)) {
    return 'Please choose a shipping method, then continue to payment.';
  }
  const items = /insufficient stock of (.+)$/i.exec(text)?.[1].trim().replace(/\.$/, '');
  return items ? `Sorry, we don't have enough stock of ${items}. Please update your cart to continue.` : undefined;
}

/**
 * What the shopper sees for a backend error: a payment-step reason they can act on, else friendly copy for Vendure's
 * raw codes and messages, `fallback` for technical text (or none), otherwise the text itself (the storefront routes
 * already send readable messages). The details stay in the server logs.
 */
export function friendlyCheckoutMessage(message: unknown, fallback: string, code?: unknown): string {
  const text = typeof message === 'string' ? message.trim() : '';
  // Before the code mapping, which would hide the reason behind "not ready for payment".
  const reason = text ? paymentReadinessMessage(text) : undefined;
  if (reason) {
    return reason;
  }
  const byCode = typeof code === 'string' ? MESSAGES_BY_CODE.get(code) : undefined;
  if (byCode) {
    return byCode;
  }
  if (!text) {
    return fallback;
  }
  const rule = MESSAGE_RULES.find(([pattern]) => pattern.test(text));
  if (rule) {
    return rule[1];
  }
  return TECHNICAL_TEXT.test(text) ? fallback : text;
}

/** The error code of an API error body (Vendure's `errorCode`, else the route's `code`), if any. */
export function apiErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const body = data as { errorCode?: unknown; code?: unknown };
  const code = body.errorCode ?? body.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * A readable message from an API error body: the first non-empty string among `message`, `error` and
 * `details` (never an object, so never "[object Object]"), made friendly by `friendlyCheckoutMessage` with the
 * body's error code; otherwise `fallback`.
 */
export function readableApiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: unknown; details?: unknown };
    const text = [body.message, body.error, body.details].find(
      (candidate) => typeof candidate === 'string' && candidate.trim()
    );
    return friendlyCheckoutMessage(text, fallback, apiErrorCode(data));
  }
  return fallback;
}

/** Vendure's UserInputError for a country code it does not know ("The countryCode "AR" was not recognized"). */
const UNKNOWN_COUNTRY = /countryCode .* was not recognized/i;

/**
 * What the shopper sees when Vendure refuses an order address (`errors` from its GraphQL answer): an unknown
 * country on the shipping address asks for a US address, since the store delivers within the US only; anything
 * else says which address could not be saved. The details stay in the server logs.
 */
export function addressErrorMessage(
  errors: ReadonlyArray<{ message?: unknown }> | undefined,
  address: 'shipping' | 'billing'
): string {
  const unknownCountry = (errors ?? []).some(
    (error) => typeof error?.message === 'string' && UNKNOWN_COUNTRY.test(error.message)
  );
  if (address === 'shipping' && unknownCountry) {
    return 'We only deliver within the United States. Please use a US address.';
  }
  return `We could not save your ${address} address. Please check it and try again.`;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

/** What the fields Affirm names in a validation error ("billing.zipcode") are called on the checkout form. */
const AFFIRM_FIELD_NAMES: Record<string, string> = {
  zipcode: 'ZIP code',
  state: 'state',
  city: 'city',
  line1: 'street address',
  phone_number: 'phone number',
  email: 'email',
};

/**
 * A readable message for affirm.js `onValidationError`: the fields Affirm refused, by their form names (its own
 * message is then a bare "Invalid Request"); otherwise Affirm's message, or `fallback`.
 */
export function affirmValidationMessage(validationError: unknown, fallback: string): string {
  const { message, fields } =
    validationError && typeof validationError === 'object'
      ? (validationError as { message?: unknown; fields?: unknown })
      : {};
  const names = Array.isArray(fields)
    ? [...new Set(fields.map((field) => AFFIRM_FIELD_NAMES[String(field).split('.').pop() ?? '']).filter(Boolean))]
    : [];
  if (names.length > 0) {
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
    return `Affirm could not verify your ${list}. Please check your details or choose another payment method.`;
  }
  const text = typeof message === 'string' ? message.trim() : '';
  return text && text !== 'Invalid Request' ? text : fallback;
}
