const express = require("express");
const router = express.Router();
const MaintenanceControl = require("../models/MaintenanceControl");
const RoleModel = require("../models/Role");
const { verifyToken } = require("../middleware/auth");
const { requireMaintenanceAction } = require("../middleware/maintenanceAccess");

// Get FM control settings: teams roster, permission matrix, approval rule
router.get("/", verifyToken, async (req, res) => {
  try {
    const [settings, roles] = await Promise.all([
      MaintenanceControl.getSingleton(),
      RoleModel.find().select("name").sort({ name: 1 }).lean(),
    ]);

    res.json({
      teams: settings.teams,
      permissionMatrix: Object.fromEntries(settings.permissionMatrix || new Map()),
      approvalRule: settings.approvalRule,
      actions: MaintenanceControl.MAINTENANCE_ACTIONS,
      roles: roles.map((r) => r.name),
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching maintenance control settings:", error);
    res.status(500).json({ error: "Failed to fetch maintenance control settings" });
  }
});

// Replace the team roster
router.put("/teams", verifyToken, requireMaintenanceAction("canManageTeams"), async (req, res) => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams)) {
      return res.status(400).json({ error: "teams must be an array" });
    }

    const settings = await MaintenanceControl.getSingleton();
    settings.teams = teams;
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({ message: "Teams updated successfully", teams: settings.teams });
  } catch (error) {
    console.error("Error updating teams:", error);
    res.status(500).json({ error: "Failed to update teams" });
  }
});

// Update the permission matrix for a specific role
router.put("/permissions", verifyToken, requireMaintenanceAction("canManageTeams"), async (req, res) => {
  try {
    const { roleName, permissions } = req.body;
    if (!roleName || typeof permissions !== "object") {
      return res.status(400).json({ error: "roleName and permissions are required" });
    }

    const settings = await MaintenanceControl.getSingleton();
    const allowedActions = MaintenanceControl.MAINTENANCE_ACTIONS;
    const sanitized = allowedActions.reduce((acc, action) => {
      acc[action] = !!permissions[action];
      return acc;
    }, {});

    settings.permissionMatrix.set(roleName, sanitized);
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({
      message: "Permissions updated successfully",
      permissionMatrix: Object.fromEntries(settings.permissionMatrix),
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({ error: "Failed to update permissions" });
  }
});

// Update the high-cost approval rule
router.put("/approval-rule", verifyToken, requireMaintenanceAction("canManageTeams"), async (req, res) => {
  try {
    const { enabled, costThreshold } = req.body;

    const settings = await MaintenanceControl.getSingleton();
    if (typeof enabled === "boolean") settings.approvalRule.enabled = enabled;
    if (typeof costThreshold === "number" && costThreshold >= 0) {
      settings.approvalRule.costThreshold = costThreshold;
    }
    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({ message: "Approval rule updated successfully", approvalRule: settings.approvalRule });
  } catch (error) {
    console.error("Error updating approval rule:", error);
    res.status(500).json({ error: "Failed to update approval rule" });
  }
});

module.exports = router;
