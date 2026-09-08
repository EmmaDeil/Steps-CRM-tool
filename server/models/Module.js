const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  componentName: { type: String },
});

module.exports = mongoose.model('Module', ModuleSchema);
