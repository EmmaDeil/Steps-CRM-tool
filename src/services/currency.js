// Centralized currency formatting utilities

// Default currency: Nigerian Naira (NGN)
// Currency is dynamically set from System Settings via CurrencyContext
let APP_CURRENCY = import.meta.env.VITE_CURRENCY || 'NGN';
const DEFAULT_LOCALE = import.meta.env.VITE_LOCALE || 'en-NG';

// Locale mapping for proper Intl formatting
const CURRENCY_LOCALES = {
  NGN: 'en-NG',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CAD: 'en-CA',
  AUD: 'en-AU',
  ZAR: 'en-ZA',
  GHS: 'en-GH',
  KES: 'en-KE',
  INR: 'en-IN',
  CNY: 'zh-CN',
};

/**
 * Set the application-wide currency (called by CurrencyContext)
 * @param {string} currencyCode - ISO 4217 currency code
 */
export function setAppCurrency(currencyCode) {
  if (currencyCode) APP_CURRENCY = currencyCode;
}

/**
 * Format a number as currency
 * @param {number} value - The number to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string (e.g., "₦1,500.00")
 */
export function formatCurrency(value, options = {}) {
  const currency = options.currency || APP_CURRENCY;
  const locale = options.locale || CURRENCY_LOCALES[currency] || DEFAULT_LOCALE;
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
  } catch {
    // Fallback if Intl or currency code fails
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${num.toFixed(maximumFractionDigits)}`;
  }
}

/**
 * Parse a currency string to a number
 * @param {string|number} str - Currency string or number
 * @returns {number} Parsed number value
 */
export function parseCurrencyString(str) {
  if (typeof str !== 'string') return Number(str) || 0;
  // Remove any non-numeric except dot and minus
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - ISO 4217 currency code
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currencyCode = APP_CURRENCY) {
  const symbols = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'CA$',
    AUD: 'A$',
    ZAR: 'R',
    GHS: '₵',
    KES: 'KSh',
    INR: '₹',
    CNY: '¥',
  };
  return symbols[currencyCode] || currencyCode;
}

/**
 * Get current currency configuration
 * @returns {object} Current currency and locale
 */
export function getCurrencyConfig() {
  return {
    currency: APP_CURRENCY,
    locale: CURRENCY_LOCALES[APP_CURRENCY] || DEFAULT_LOCALE,
    symbol: getCurrencySymbol(APP_CURRENCY),
  };
}
