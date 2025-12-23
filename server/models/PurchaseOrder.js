const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    unique: true,
  },
  requester: {
    type: String,
    required: true,
  },
  approver: {
    type: String,
    required: true,
  },
  vendor: {
    type: String,
    required: true,
  },
  orderDate: {
    type: String,
    required: true,
  },
  deliveryDate: String,
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'reviewed', 'approved', 'payment_pending', 'paid', 'received', 'cancelled'],
    default: 'pending_review',
  },
  lineItems: [{
    itemName: String,
    description: String,
    quantity: Number,
    unit: String,
    unitPrice: Number,
    total: Number,
  }],
  totalAmount: {
    type: Number,
    default: 0,
  },
  message: String,
  attachments: [String],
  materialRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialRequest',
  },
  reviewNotes: String,
  paidDate: Date,
}, {
  timestamps: true,
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
