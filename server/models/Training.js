const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  icon: {
    type: String,
    default: 'book',
  },
  dueDate: {
    type: Date,
  },
  completionPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  category: {
    type: String,
    enum: ['compliance', 'technical', 'soft-skills', 'safety', 'onboarding', 'other'],
    default: 'other',
  },
  mandatory: {
    type: Boolean,
    default: false,
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  }],
  completedBy: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    completedDate: Date,
    score: Number,
  }],
  duration: {
    type: Number, // in hours
  },
  instructor: {
    type: String,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'archived'],
    default: 'active',
  },
}, {
  timestamps: true,
});

// Virtual field to calculate days until due
trainingSchema.virtual('dueInDays').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Indexes
trainingSchema.index({ status: 1 });
trainingSchema.index({ dueDate: 1 });
trainingSchema.index({ category: 1 });

module.exports = mongoose.model('Training', trainingSchema);
