const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  reviewPeriod: { type: String, required: true }, // e.g. "Q3 2026"
  status: { type: String, enum: ['pending_self', 'pending_manager', 'completed'], default: 'pending_self' },
  selfRating: { type: Number },
  managerRating: { type: Number },
  overallRating: { type: Number },
  selfComments: { type: String },
  managerComments: { type: String },
  completedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);
