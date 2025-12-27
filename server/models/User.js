const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    sparse: true,
    index: true,
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  role: {
    type: String,
    enum: ['Admin', 'Editor', 'Viewer'],
    default: 'Viewer',
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Pending',
  },
  permissions: {
    modules: [{
      moduleId: Number,
      moduleName: String,
      access: {
        type: Boolean,
        default: false,
      }
    }],
    userManagement: {
      viewUsers: { type: Boolean, default: false },
      editUsers: { type: Boolean, default: false },
      inviteUsers: { type: Boolean, default: false },
    },
    billingFinance: {
      viewInvoices: { type: Boolean, default: false },
      manageSubscription: { type: Boolean, default: false },
    },
    systemSettings: {
      globalConfiguration: { type: Boolean, default: false },
    },
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastLogin: Date,
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  invitedAt: Date,
  profilePicture: {
    type: String,
    default: null,
  },
  phoneNumber: {
    type: String,
    default: null,
  },
  department: {
    type: String,
    default: null,
  },
  jobTitle: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for faster queries
userSchema.index({ email: 1, status: 1 });
userSchema.index({ role: 1 });

// Method to generate password reset token
userSchema.methods.generateResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return token;
};

module.exports = mongoose.model('User', userSchema);
