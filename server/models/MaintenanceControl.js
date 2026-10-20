const mongoose = require("mongoose");

const DEFAULT_TEAMS = [
  { name: "HVAC Team", color: "blue", isActive: true },
  { name: "Plumbing Team", color: "cyan", isActive: true },
  { name: "Electrical Team", color: "orange", isActive: true },
  { name: "General Maintenance", color: "gray", isActive: true },
  { name: "IT Support", color: "indigo", isActive: true },
  { name: "Security Team", color: "red", isActive: true },
];

// Actions gated behind the facility maintenance permission matrix.
// Admin / Security Admin roles always bypass this matrix.
const MAINTENANCE_ACTIONS = [
  "canAssignTicket",
  "canCloseTicket",
  "canApproveHighCost",
  "canManageAssets",
  "canManagePreventiveMaintenance",
  "canManageTasks",
  "canManageTeams",
  "canDeleteRecords",
];

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, default: "gray" },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const permissionSetSchema = new mongoose.Schema(
  MAINTENANCE_ACTIONS.reduce((acc, action) => {
    acc[action] = { type: Boolean, default: false };
    return acc;
  }, {}),
  { _id: false }
);

const maintenanceControlSchema = new mongoose.Schema(
  {
    teams: {
      type: [teamSchema],
      default: () => DEFAULT_TEAMS,
    },
    permissionMatrix: {
      type: Map,
      of: permissionSetSchema,
      default: () => new Map(),
    },
    approvalRule: {
      enabled: { type: Boolean, default: false },
      costThreshold: { type: Number, default: 0, min: 0 },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Singleton pattern - only one settings document
    singleton: { type: Boolean, default: true, unique: true },
  },
  {
    timestamps: true,
  }
);

// Fetch the single settings document, creating it with defaults if absent
maintenanceControlSchema.statics.getSingleton = async function () {
  let settings = await this.findOne({ singleton: true });
  if (!settings) {
    settings = await this.create({ singleton: true });
  }
  return settings;
};

const MaintenanceControl = mongoose.model("MaintenanceControl", maintenanceControlSchema);

module.exports = MaintenanceControl;
module.exports.MAINTENANCE_ACTIONS = MAINTENANCE_ACTIONS;
