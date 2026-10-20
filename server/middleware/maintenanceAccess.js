const MaintenanceControl = require("../models/MaintenanceControl");

// Roles that always bypass the facility maintenance permission matrix
const ADMIN_ROLES = ["admin", "security admin"];

/**
 * Gate an action behind the Facility Maintenance Controls permission matrix.
 * Admin / Security Admin roles always pass. Other roles must have the
 * action explicitly granted via MaintenanceControl.permissionMatrix.
 */
const requireMaintenanceAction = (action) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const role = String(req.user.role || "").toLowerCase();
      if (ADMIN_ROLES.includes(role)) {
        return next();
      }

      const settings = await MaintenanceControl.getSingleton();
      const rolePermissions = settings.permissionMatrix?.get
        ? settings.permissionMatrix.get(req.user.role)
        : settings.permissionMatrix?.[req.user.role];

      if (rolePermissions && rolePermissions[action]) {
        return next();
      }

      return res.status(403).json({
        error: `You do not have permission to perform this action (${action})`,
      });
    } catch (error) {
      console.error("Error checking maintenance permission:", error);
      return res.status(500).json({ error: "Failed to verify permissions" });
    }
  };
};

module.exports = { requireMaintenanceAction };
