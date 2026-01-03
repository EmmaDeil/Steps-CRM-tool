const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  fullName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['Admin', 'Security Admin', 'Security Analyst', 'Editor', 'Viewer', 'user'],
    default: 'user',
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
    security: {
      viewLogs: { type: Boolean, default: false },
      exportLogs: { type: Boolean, default: false },
      manageSettings: { type: Boolean, default: false },
      manageNotifications: { type: Boolean, default: false },
      viewAnalytics: { type: Boolean, default: false },
      manageSessions: { type: Boolean, default: false },
      generateReports: { type: Boolean, default: false },
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

// Pre-save middleware to hash password and set fullName
userSchema.pre('save', async function(next) {
  // Set fullName from firstName and lastName
  if (this.firstName && this.lastName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }

  // Hash password if it's modified
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate password reset token
userSchema.methods.generateResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  return token;
};

module.exports = mongoose.model('User', userSchema);
