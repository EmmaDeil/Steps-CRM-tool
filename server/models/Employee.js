const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  dateOfBirth: { type: Date },
  department: { type: String },
  jobTitle: { type: String },
  startDate: { type: Date },
  status: { type: String, default: 'Active', enum: ['Active', 'On Leave', 'Terminated'] },
  avatar: { type: String, default: '' }, // Stores base64 data URL (data:image/png;base64,...)
  employeeId: { type: String },
  salary: { type: Number, default: 0 },
  address: { type: String },
  emergencyContact: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String }
  },
  documents: [
    {
      name: { type: String, required: true },
      type: { type: String, default: 'File' },
      fileData: { type: String },
      url: { type: String },
      fileSize: { type: Number, default: 0 },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: String, default: '' },
    },
  ],
  managerId: { type: String },
  managerName: { type: String },
  role: { type: String }, // Used in UI for role descriptor
  location: { type: String },
  workArrangement: {
    type: String,
    enum: ['On-site', 'Hybrid', 'Remote'],
    default: undefined,
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
    default: undefined,
  },
  userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Virtual for full name since UI expects `e.name`
EmployeeSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Transform output to match UI expectations (e.g., `id` instead of `_id`)
EmployeeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
