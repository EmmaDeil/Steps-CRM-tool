/* eslint-disable */
// Server-side API helpers that encapsulate MongoDB operations.
const ModuleModel = require('./models/Module');
const AnalyticsModel = require('./models/Analytics');
const AttendanceModel = require('./models/Attendance');
const LeaveAllocation = require('./models/LeaveAllocation');
const LeaveRequest = require('./models/LeaveRequest');
const TravelRequest = require('./models/TravelRequest');
const UserModel = require('./models/User');

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

// Travel Request functions
async function getTravelRequests(query = {}) {
  return TravelRequest.find(query).sort({ createdAt: -1 }).lean();
}

async function createTravelRequest(data) {
  return TravelRequest.create(data);
}

async function updateTravelRequestStatus(id, status, comments, approverType) {
  const request = await TravelRequest.findById(id);
  if (!request) throw new Error('Travel request not found');
  
  request.status = status;
  request.updatedAt = new Date();
  
  if (approverType === 'manager') {
    request.managerComments = comments;
    if (status === 'approved_manager') {
      request.managerApprovedAt = new Date();
      request.status = 'pending_booking'; // Move to booking stage
    } else if (status === 'rejected_manager') {
      request.managerRejectedAt = new Date();
      request.status = 'rejected_manager';
    }
  }
  
  return request.save();
}

async function updateTravelBooking(id, bookingData) {
  const request = await TravelRequest.findById(id);
  if (!request) throw new Error('Travel request not found');
  
  request.bookingDetails = {
    ...request.bookingDetails,
    ...bookingData,
    bookedAt: new Date(),
  };
  request.status = 'booked';
  request.updatedAt = new Date();
  
  return request.save();
}

// User Profile functions
async function getUserByClerkId(clerkId) {
  return UserModel.findOne({ clerkId }).lean();
}

async function createOrUpdateUserProfile(data) {
  const { clerkId, email, fullName } = data;
  
  // Check if user exists
  let user = await UserModel.findOne({ clerkId });
  
  if (user) {
    // Update existing user
    Object.assign(user, data, { updatedAt: new Date() });
    return user.save();
  } else {
    // Create new user
    return UserModel.create({
      clerkId,
      email,
      fullName,
      ...data,
    });
  }
}

async function updateUserProfile(clerkId, data) {
  const user = await UserModel.findOne({ clerkId });
  if (!user) throw new Error('User not found');
  
  Object.assign(user, data, { updatedAt: new Date() });
  return user.save();
}

async function updateUserProfilePicture(clerkId, pictureUrl) {
  const user = await UserModel.findOne({ clerkId });
  if (!user) throw new Error('User not found');
  
  user.profilePicture = pictureUrl;
  user.updatedAt = new Date();
  return user.save();
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
  getTravelRequests,
  createTravelRequest,
  updateTravelRequestStatus,
  updateTravelBooking,
  getUserByClerkId,
  createOrUpdateUserProfile,
  updateUserProfile,
  updateUserProfilePicture,
};
