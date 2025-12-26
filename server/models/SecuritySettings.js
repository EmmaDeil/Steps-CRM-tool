/* eslint-disable */
const mongoose = require('mongoose');

const securitySettingsSchema = new mongoose.Schema({
  passwordPolicy: {
    enabled: { type: Boolean, default: true },
    minLength: { type: Number, default: 12 },
    specialChars: { type: Boolean, default: true },
    uppercaseRequired: { type: Boolean, default: true },
    lowercaseRequired: { type: Boolean, default: true },
    numberRequired: { type: Boolean, default: true },
    expiry: { type: Number, default: 90 }, // days
  },
  mfaSettings: {
    enabled: { type: Boolean, default: true },
    method: { type: String, default: 'Authenticator App' },
    enforcement: { type: String, enum: ['All Users', 'Admins Only', 'Optional'], default: 'All Users' },
    gracePeriod: { type: String, default: 'None' },
  },
  sessionControl: {
    idleTimeout: { type: Number, default: 30 }, // minutes
    concurrentSessions: { type: Number, default: 3 },
    rememberMeDuration: { type: Number, default: 30 }, // days
  },
  // Singleton pattern - only one settings document
  singleton: { type: Boolean, default: true, unique: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('SecuritySettings', securitySettingsSchema);
