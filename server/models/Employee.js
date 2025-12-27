const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
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
  phone: {
    type: String,
    trim: true,
  },
  dateOfBirth: {
    type: Date,
  },
  department: {
    type: String,
    required: true,
    default: 'Engineering',
  },
  role: {
    type: String,
    required: true,
    default: 'Employee',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Active', 'On Leave', 'Inactive', 'Terminated'],
    default: 'Active',
  },
  avatar: {
    type: String,
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Additional fields for HR management
  jobTitle: {
    type: String,
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  salary: {
    type: Number,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },
}, {
  timestamps: true,
});

// Indexes for performance
employeeSchema.index({ name: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ employeeId: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
