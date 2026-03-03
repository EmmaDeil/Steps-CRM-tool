const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Acme Corp' },
  contactEmail: { type: String, default: 'admin@acmecorp.com' },
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
  primaryColor: { type: String, default: '#137fec' },
  logoUrl: { type: String, default: '' },
  slackEnabled: { type: Boolean, default: false },
  emailSmtp: { type: String, default: 'smtp.mailtrap.io' },
  attendanceApiKey: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
