const mongoose = require('mongoose');

const BudgetCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: 'fa-wallet' },
  color: { type: String, default: 'text-blue-600' },
  bar: { type: String, default: 'bg-blue-500' },
  allocated: { type: Number, required: true, default: 0 },
  spent: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  period: { type: String, default: 'Q1 2025' },
  description: { type: String, default: '' },
  createdBy: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('BudgetCategory', BudgetCategorySchema);
