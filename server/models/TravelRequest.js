const mongoose = require('mongoose');

const travelRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  userId: { type: String, required: true },
  department: { type: String },
  currentLocation: { type: String, required: true },
  destination: { type: String, required: true },
  purpose: { 
    type: String, 
    required: true,
    enum: ['conference', 'client-meeting', 'training', 'audit', 'site-visit', 'other']
  },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  numberOfDays: { type: Number, required: true },
  numberOfNights: { type: Number, required: true },
  accommodationRequired: { type: Boolean, default: false },
  budget: { type: Number, required: true },
  description: { type: String },
  managerId: { type: String, required: true },
  managerName: { type: String, required: true },
  managerEmail: { type: String },
  status: { 
    type: String, 
    default: 'pending_manager',
    enum: ['pending_manager', 'approved_manager', 'rejected_manager', 'pending_booking', 'booked', 'completed', 'cancelled']
  },
  managerApprovedAt: { type: Date },
  managerRejectedAt: { type: Date },
  managerComments: { type: String },
  bookingDetails: {
    ticketBooked: { type: Boolean, default: false },
    bookedBy: { type: String },
    bookedAt: { type: Date },
    bookingReference: { type: String },
    hotelBooked: { type: Boolean, default: false },
    hotelDetails: { type: String },
  },
  requestDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  collection: 'travel_requests'
});

// Indexes for efficient queries
travelRequestSchema.index({ employeeId: 1, status: 1 });
travelRequestSchema.index({ managerId: 1, status: 1 });
travelRequestSchema.index({ userId: 1 });

module.exports = mongoose.model('TravelRequest', travelRequestSchema);
