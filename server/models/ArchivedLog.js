const mongoose = require('mongoose');

const archivedLogSchema = new mongoose.Schema({
  // Original audit log data
  actor: {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    initials: String,
  },
  action: { type: String, required: true },
  actionColor: String,
  ipAddress: { type: String, required: true },
  userAgent: String,
  description: { type: String, required: true },
  status: { type: String, enum: ['Success', 'Failed'], required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, required: true },
  
  // Archive metadata
  archiveDate: { type: Date, default: Date.now },
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  archiveBatch: String,
  compressed: { type: Boolean, default: false },
  compressedSize: Number,
  originalSize: Number,
}, {
  timestamps: false, // Don't add createdAt/updatedAt since we preserve original timestamp
});

// Index for faster queries
archivedLogSchema.index({ timestamp: -1 });
archivedLogSchema.index({ archiveDate: -1 });
archivedLogSchema.index({ 'actor.userName': 1 });
archivedLogSchema.index({ action: 1 });
archivedLogSchema.index({ archiveBatch: 1 });

module.exports = mongoose.model('ArchivedLog', archivedLogSchema);
