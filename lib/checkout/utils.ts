/**
 * Utility functions for checkout process
 */

export const formatPrice = (price: number, currencyCode: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price / 100);
};

/**
 * A readable message from an API error body: the first non-empty string among `message`, `error` and
 * `details`, never an object (so never "[object Object]"), otherwise `fallback`.
 */
export function readableApiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: unknown; details?: unknown };
    for (const candidate of [body.message, body.error, body.details]) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return fallback;
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
