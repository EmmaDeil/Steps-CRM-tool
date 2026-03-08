const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// --- Physical Security Models ---

// 1. Digital Representation of physical camera streams
const CameraFeedSchema = new Schema({
    name: { type: String, required: true },
    status: { type: String, enum: ['online', 'offline'], default: 'online' },
    lastMotion: { type: String, required: false },
    streamUrl: { type: String, required: false }, 
    location: { type: String, required: false }
}, {
    timestamps: true
});

// 2. Incident, activity, and visitor tracking
const SecurityLogSchema = new Schema({
    time: { type: String, required: true }, // e.g., '09:42 AM' or an actual date depending on needs
    type: { type: String, enum: ['Visitor', 'Access', 'Alert', 'System', 'Guard'], required: true },
    details: { type: String, required: true },
    severity: { type: String, enum: ['info', 'warning', 'error'], default: 'info' }
}, {
    timestamps: true
});

// 3. On-duty guard and personnel tracking
const SecurityPersonnelSchema = new Schema({
    name: { type: String, required: true },
    role: { type: String, required: true }, // e.g., "Chief Security Officer"
    shift: { type: String, required: false },
    contact: { type: String, required: false }, // email or phone
    status: { type: String, enum: ['On Duty', 'Off Duty', 'On Break'], default: 'On Duty' },
    avatarUrl: { type: String, required: false }
}, {
    timestamps: true
});

// 4. Security badge tracking
const SecurityBadgeSchema = new Schema({
    badgeNumber: { type: String, required: true, unique: true },
    holderName: { type: String, required: true },
    department: { type: String, default: '' },
    badgeType: { type: String, enum: ['Employee', 'Contractor', 'Visitor', 'Temporary'], default: 'Employee' },
    accessLevel: { type: String, enum: ['Full', 'Restricted', 'Visitor', 'Custom'], default: 'Restricted' },
    status: { type: String, enum: ['Active', 'Revoked', 'Expired', 'Lost'], default: 'Active' },
    issuedBy: { type: String, default: 'Security Officer' },
    expiresAt: { type: Date },
    notes: { type: String, default: '' },
}, {
    timestamps: true
});

const CameraFeed = mongoose.model('CameraFeed', CameraFeedSchema);
const SecurityLog = mongoose.model('SecurityLog', SecurityLogSchema);
const SecurityPersonnel = mongoose.model('SecurityPersonnel', SecurityPersonnelSchema);
const SecurityBadge = mongoose.model('SecurityBadge', SecurityBadgeSchema);

module.exports = { CameraFeed, SecurityLog, SecurityPersonnel, SecurityBadge };
