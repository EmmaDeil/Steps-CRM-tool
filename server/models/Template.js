const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: String,
  fileURL: {
    type: String,
    required: true,
  },
  fileSize: String,
  roles: [mongoose.Schema.Types.Mixed], // Flexible roles list
  fields: [mongoose.Schema.Types.Mixed], // Flexible fields metadata
  uploadedBy: {
    type: String,
    required: true,
  },
  uploadedByName: String,
}, {
  timestamps: true,
});

// Index for query optimization
templateSchema.index({ uploadedBy: 1, category: 1 });

module.exports = mongoose.model('Template', templateSchema);
