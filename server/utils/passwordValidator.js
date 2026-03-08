const SecuritySettings = require('../models/SecuritySettings');

/**
 * Fetch password policy from SecuritySettings and validate a password against it.
 * Returns { valid: true } or { valid: false, error: 'description' }.
 */
async function validatePassword(password) {
  const settings = await SecuritySettings.findOne();
  const policy = settings?.passwordPolicy;

  // If no policy or policy disabled, fall back to basic 8-char minimum
  if (!policy || !policy.enabled) {
    if (!password || password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    return { valid: true };
  }

  const minLen = policy.minLength || 8;
  if (password.length < minLen) {
    return { valid: false, error: `Password must be at least ${minLen} characters` };
  }

  if (policy.uppercaseRequired && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (policy.lowercaseRequired && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (policy.numberRequired && !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  if (policy.specialChars && !/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Return serializable password policy for frontend consumption (no auth required).
 */
async function getPasswordPolicy() {
  const settings = await SecuritySettings.findOne();
  const policy = settings?.passwordPolicy;

  if (!policy || !policy.enabled) {
    return { enabled: false, minLength: 8 };
  }

  return {
    enabled: true,
    minLength: policy.minLength || 8,
    uppercaseRequired: !!policy.uppercaseRequired,
    lowercaseRequired: !!policy.lowercaseRequired,
    numberRequired: !!policy.numberRequired,
    specialChars: !!policy.specialChars,
  };
}

module.exports = { validatePassword, getPasswordPolicy };
