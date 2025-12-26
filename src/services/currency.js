// Centralized currency formatting utilities

// Default currency and locale can be adjusted here or via env
const DEFAULT_CURRENCY = import.meta.env.VITE_CURRENCY || 'NGN';
const DEFAULT_LOCALE = import.meta.env.VITE_LOCALE || 'en-NG';

export function formatCurrency(value, options = {}) {
  const currency = options.currency || DEFAULT_CURRENCY;
  const locale = options.locale || DEFAULT_LOCALE;
  const minimumFractionDigits = options.minimumFractionDigits ?? 2;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;

  const num = Number(value) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(num);
  } catch (e) {
    // Fallback if Intl or currency code fails
    return `${currency} ${num.toFixed(maximumFractionDigits)}`;
  }
}

export function parseCurrencyString(str) {
  if (typeof str !== 'string') return Number(str) || 0;
  // Remove any non-numeric except dot and minus
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
