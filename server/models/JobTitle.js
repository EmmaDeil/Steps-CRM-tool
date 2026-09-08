const mongoose = require('mongoose');

const jobTitleSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true, trim: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('JobTitle', jobTitleSchema);
