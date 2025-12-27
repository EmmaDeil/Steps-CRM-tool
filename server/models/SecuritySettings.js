const mongoose = require('mongoose');

const notificationRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  event: { type: String, required: true },
  condition: { type: String, required: true },
  recipient: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const settingsHistorySchema = new mongoose.Schema({
  setting: { type: String, required: true },
  change: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  changedBy: {
    userName: String,
    userEmail: String,
    initials: String,
  },
});

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
  notificationRules: [notificationRuleSchema],
  settingsHistory: [settingsHistorySchema],
  // Singleton pattern - only one settings document
  singleton: { type: Boolean, default: true, unique: true },
}, {
  timestamps: true,
});

// Middleware to track changes to settings
securitySettingsSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    const modifiedPaths = this.modifiedPaths();
    const relevantPaths = modifiedPaths.filter(path => 
      path.startsWith('passwordPolicy') || 
      path.startsWith('mfaSettings') || 
      path.startsWith('sessionControl')
    );
    
    if (relevantPaths.length > 0 && this.settingsHistory) {
      // Only add to history if not already adding history
      const lastHistory = this.settingsHistory[this.settingsHistory.length - 1];
      const now = new Date();
      if (!lastHistory || (now - lastHistory.timestamp) > 1000) {
        // Add history entry (simplified - in production would have more detail)
        const setting = relevantPaths[0].split('.')[0];
        this.settingsHistory.push({
          setting: setting.replace(/([A-Z])/g, ' $1').trim(),
          change: `Updated ${setting} settings`,
          timestamp: now,
          changedBy: {
            userName: 'System',
            userEmail: 'system@example.com',
            initials: 'SYS',
          },
        });
      }
    }
  }
  next();
});

module.exports = mongoose.model('SecuritySettings', securitySettingsSchema);
