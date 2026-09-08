const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    category: { type: String, default: 'general' },
    source: { type: String, default: 'system' },
    sourceKey: { type: String, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ targetUser: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
