const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['Facility Usage Report', 'Financial Report', 'Attendance Report', 'Approval Statistics', 'Custom Report']
  },
  module: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'All Departments'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Ready', 'Processing', 'Archived'],
    default: 'Processing'
  },
  generatedBy: {
    type: String,
    required: true
  },
  includeDrafts: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: 'fa-file-alt'
  },
  iconColor: {
    type: String,
    default: 'bg-blue-100 text-blue-600'
  },
  fileUrl: {
    type: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Add index for faster queries
ReportSchema.index({ reportType: 1, status: 1, createdAt: -1 });
ReportSchema.index({ generatedBy: 1 });

module.exports = mongoose.model('Report', ReportSchema);
