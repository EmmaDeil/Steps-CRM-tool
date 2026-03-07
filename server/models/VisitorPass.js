const mongoose = require('mongoose');
const crypto = require('crypto');

const visitorPassSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, default: () => crypto.randomBytes(16).toString('hex') },
  status: { type: String, enum: ['pending', 'signed-in', 'checked-out', 'expired'], default: 'pending' },
  createdBy: { type: String }, // name of the security officer who generated the pass
  // Filled by visitor upon sign-in
  visitorName: { type: String, default: '' },
  visitorEmail: { type: String, default: '' },
  visitorPhone: { type: String, default: '' },
  company: { type: String, default: '' },
  purpose: { type: String, default: '' },
  hostName: { type: String, default: '' },
  signedInAt: { type: Date },
  checkedOutAt: { type: Date },
  expiresAt: { type: Date, required: true },
}, {
  timestamps: true,
});

// Auto-expire passes after their expiresAt time
visitorPassSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VisitorPass', visitorPassSchema);
