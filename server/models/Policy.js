const mongoose = require('mongoose');

const versionHistorySchema = new mongoose.Schema({
  version: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  author: {
    userId: String,
    userName: String,
    userEmail: String,
    initials: String
  },
  changes: String,
  status: {
    type: String,
    enum: ['Current', 'Archived'],
    default: 'Archived'
  },
  documentUrl: String,
  documentName: String
});

const policySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['IT Security', 'HR', 'Finance', 'Legal', 'Marketing', 'Operations']
  },
  policyId: {
    type: String,
    required: true,
    unique: true
  },
  version: {
    type: String,
    default: 'v1.0'
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Published', 'Review', 'Expiring', 'Archived'],
    default: 'Draft'
  },
  description: {
    type: String,
    trim: true
  },
  documentUrl: {
    type: String,
    required: true
  },
  documentName: {
    type: String,
    required: true
  },
  documentType: {
    type: String // pdf, doc, docx
  },
  author: {
    userId: String,
    userName: String,
    userEmail: String,
    initials: String
  },
  versionHistory: [versionHistorySchema],
  approvedBy: {
    userId: String,
    userName: String,
    approvedDate: Date
  },
  expiryDate: Date,
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
policySchema.index({ status: 1, category: 1 });
policySchema.index({ policyId: 1 });
policySchema.index({ 'author.userId': 1 });

const Policy = mongoose.model('Policy', policySchema);

module.exports = Policy;
