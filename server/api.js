/* eslint-disable */
// Server-side API helpers that encapsulate MongoDB operations.
const ModuleModel = require('./models/Module');
const AnalyticsModel = require('./models/Analytics');
const AttendanceModel = require('./models/Attendance');

async function getModules() {
  return ModuleModel.find().sort({ id: 1 }).lean();
}

async function getModuleById(id) {
  return ModuleModel.findOne({ id: Number(id) }).lean();
}

async function createModule(data) {
  return ModuleModel.create(data);
}

async function updateModule(id, data) {
  return ModuleModel.findOneAndUpdate({ id: Number(id) }, data, { new: true });
}

async function deleteModule(id) {
  return ModuleModel.deleteOne({ id: Number(id) });
}

async function getAnalytics() {
  return AnalyticsModel.findOne().lean();
}

async function updateAnalytics(data) {
  const doc = await AnalyticsModel.findOne();
  if (!doc) return AnalyticsModel.create(data);
  Object.assign(doc, data);
  return doc.save();
}

async function getAttendance() {
  return AttendanceModel.find().lean();
}

async function getAttendanceById(id) {
  return AttendanceModel.findOne({ id: Number(id) }).lean();
}

async function createAttendance(data) {
  return AttendanceModel.create(data);
}

module.exports = {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  getAnalytics,
  updateAnalytics,
  getAttendance,
  getAttendanceById,
  createAttendance,
};
