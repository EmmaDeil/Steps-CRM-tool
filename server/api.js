/* eslint-disable */
// Server-side API helpers that encapsulate MongoDB operations.
const ModuleModel = require('./models/Module');
const AnalyticsModel = require('./models/Analytics');
const AttendanceModel = require('./models/Attendance');
const LeaveAllocation = require('./models/LeaveAllocation');
const LeaveRequest = require('./models/LeaveRequest');

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

// Leave Allocation functions
async function getLeaveAllocations(query = {}) {
  return LeaveAllocation.find(query).lean();
}

async function createLeaveAllocation(data) {
  // Update existing if same employee and year, else create new
  const existing = await LeaveAllocation.findOne({ 
    employeeId: data.employeeId, 
    year: data.year 
  });
  
  if (existing) {
    Object.assign(existing, data, { updatedAt: new Date() });
    return existing.save();
  }
  
  return LeaveAllocation.create(data);
}

async function updateLeaveUsage(employeeId, year, leaveType, daysUsed) {
  const allocation = await LeaveAllocation.findOne({ employeeId, year });
  if (!allocation) throw new Error('Leave allocation not found');
  
  const field = `${leaveType}LeaveUsed`;
  allocation[field] = (allocation[field] || 0) + daysUsed;
  allocation.updatedAt = new Date();
  return allocation.save();
}

// Leave Request functions
async function getLeaveRequests(query = {}) {
  return LeaveRequest.find(query).sort({ createdAt: -1 }).lean();
}

async function createLeaveRequest(data) {
  return LeaveRequest.create(data);
}

async function updateLeaveRequestStatus(id, status, comments, approverType) {
  const request = await LeaveRequest.findById(id);
  if (!request) throw new Error('Leave request not found');
  
  request.status = status;
  request.updatedAt = new Date();
  
  if (approverType === 'manager') {
    request.managerComments = comments;
    if (status === 'approved_manager') {
      request.managerApprovedAt = new Date();
      request.status = 'pending_hr'; // Move to HR approval
    } else if (status === 'rejected_manager') {
      request.managerRejectedAt = new Date();
      request.status = 'rejected';
    }
  } else if (approverType === 'hr') {
    request.hrComments = comments;
    if (status === 'approved') {
      request.hrApprovedAt = new Date();
    } else if (status === 'rejected') {
      request.hrRejectedAt = new Date();
    }
  }
  
  return request.save();
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
  getLeaveAllocations,
  createLeaveAllocation,
  updateLeaveUsage,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveRequestStatus,
};
