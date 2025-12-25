const mongoose = require('mongoose');

const retirementBreakdownSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  employeeName: { type: String, required: true },
  monthYear: { type: String, required: true },
  previousClosingBalance: { type: Number, default: 0 },
  inflowAmount: { type: Number, default: 0 },
  lineItems: [{
    id: { type: Number },
    date: { type: String },
    description: { type: String },
    quantity: { type: Number },
    amount: { type: Number },
  }],
  totalExpenses: { type: Number, default: 0 },
  newOpeningBalance: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'submitted'], default: 'draft' },
  submittedDate: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('RetirementBreakdown', retirementBreakdownSchema);
