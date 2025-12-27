const mongoose = require('mongoose');

const jobRequisitionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'filled'],
    default: 'draft',
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    default: 'mid',
  },
  description: {
    type: String,
    trim: true,
  },
  requirements: {
    type: [String],
    default: [],
  },
  responsibilities: {
    type: [String],
    default: [],
  },
  candidates: {
    type: Number,
    default: 0,
  },
  progressPct: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD',
    },
  },
  location: {
    type: String,
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    default: 'full-time',
  },
  openings: {
    type: Number,
    default: 1,
  },
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  closedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for performance
jobRequisitionSchema.index({ status: 1 });
jobRequisitionSchema.index({ department: 1 });
jobRequisitionSchema.index({ title: 1 });
jobRequisitionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('JobRequisition', jobRequisitionSchema);
