const mongoose = require('mongoose');

const signatureSchema = new mongoose.Schema({
  id: Number,
  type: {
    type: String,
    enum: ['image', 'text', 'recipient'],
    required: true,
  },
  data: mongoose.Schema.Types.Mixed, // Can be image URL, text object, or recipient object
  position: {
    x: Number,
    y: Number,
  },
  size: {
    width: Number,
    height: Number,
  },
  signedAt: Date,
  signedBy: String, // User ID who signed
});

const recipientSchema = new mongoose.Schema({
  id: Number,
  name: String,
  email: String,
  role: String,
  status: {
    type: String,
    enum: ['pending', 'signed', 'declined'],
    default: 'pending',
  },
  signedAt: Date,
  signatureId: mongoose.Schema.Types.ObjectId,
});

const fieldSchema = new mongoose.Schema({
  id: String,
  type: {
    type: String,
    enum: ['signature', 'initials', 'dateSigned', 'textbox', 'checkbox', 'fullName'],
    required: true,
  },
  label: String,
  page: Number,
  position: {
    x: Number,
    y: Number,
  },
  size: {
    width: Number,
    height: Number,
  },
  required: {
    type: Boolean,
    default: false,
  },
  assignedTo: Number, // Recipient ID
  value: mongoose.Schema.Types.Mixed, // Filled value after signing
});

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  fileURL: {
    type: String,
    required: true,
  },
  fileSize: String,
  uploadedBy: {
    type: String,
    required: true,
  },
  uploadedByName: String,
  status: {
    type: String,
    enum: ['Pending', 'Action Required', 'Completed', 'Declined'],
    default: 'Pending',
  },
  signatures: [signatureSchema],
  recipients: [recipientSchema],
  fields: [fieldSchema], // Form fields placed on the document
  involvedParties: [{
    name: String,
    role: String,
  }],
  dueDate: Date,
  completedAt: Date,
  currentPage: {
    type: Number,
    default: 1,
  },
  totalPages: {
    type: Number,
    default: 1,
  },
  metadata: {
    icon: String,
    iconColor: String,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for faster queries
documentSchema.index({ uploadedBy: 1, status: 1 });
documentSchema.index({ 'recipients.email': 1 });

module.exports = mongoose.model('Document', documentSchema);
