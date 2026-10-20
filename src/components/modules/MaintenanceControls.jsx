import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const ACTION_LABELS = {
  canAssignTicket: "Assign Tickets",
  canCloseTicket: "Close / Complete Tickets",
  canApproveHighCost: "Approve High-Cost Items",
  canManageAssets: "Manage Equipment & Assets",
  canManagePreventiveMaintenance: "Manage Preventive Maintenance",
  canManageTasks: "Manage Tasks",
  canManageTeams: "Manage FM Controls (Teams & Permissions)",
  canDeleteRecords: "Delete Records",
};

const COLOR_OPTIONS = ["blue", "cyan", "orange", "gray", "indigo", "red", "green", "purple", "teal", "rose"];

const MaintenanceControls = ({ onBack }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("");
  const [rolePermissions, setRolePermissions] = useState({});
  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [savingTeams, setSavingTeams] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [savingApprovalRule, setSavingApprovalRule] = useState(false);
  const [approvalRule, setApprovalRule] = useState({ enabled: false, costThreshold: 0 });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/maintenance/controls");
      setSettings(response);
      setTeams(response.teams || []);
      setApprovalRule(response.approvalRule || { enabled: false, costThreshold: 0 });
      const firstRole = response.roles?.[0] || "";
      setSelectedRole(firstRole);
      setRolePermissions(
        response.permissionMatrix?.[firstRole] ||
          response.actions.reduce((acc, a) => ({ ...acc, [a]: false }), {})
      );
    } catch (error) {
      console.error("Error fetching FM control settings:", error);
      toast.error("Failed to load Controls settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setRolePermissions(
      settings?.permissionMatrix?.[role] || settings?.actions.reduce((acc, a) => ({ ...acc, [a]: false }), {})
    );
  };

  const handlePermissionToggle = (action) => {
    setRolePermissions((prev) => ({ ...prev, [action]: !prev[action] }));
  };

  const handleSavePermissions = async () => {
    setSavingPermissions(true);
    try {
      const response = await apiService.put("/api/maintenance/controls/permissions", {
        roleName: selectedRole,
        permissions: rolePermissions,
      });
      setSettings((prev) => ({ ...prev, permissionMatrix: response.permissionMatrix }));
      toast.success(`Permissions updated for ${selectedRole}`);
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error(error.serverData?.error || "Failed to save permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    setTeams((prev) => [...prev, { name: newTeamName.trim(), color: "gray", isActive: true }]);
    setNewTeamName("");
  };

  const updateTeam = (idx, patch) => {
    setTeams((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const removeTeam = (idx) => {
    setTeams((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveTeams = async () => {
    setSavingTeams(true);
    try {
      const response = await apiService.put("/api/maintenance/controls/teams", { teams });
      setTeams(response.teams);
      toast.success("Teams roster updated");
    } catch (error) {
      console.error("Error saving teams:", error);
      toast.error(error.serverData?.error || "Failed to save teams");
    } finally {
      setSavingTeams(false);
    }
  };

  const handleSaveApprovalRule = async () => {
    setSavingApprovalRule(true);
    try {
      const response = await apiService.put("/api/maintenance/controls/approval-rule", approvalRule);
      setApprovalRule(response.approvalRule);
      toast.success("Approval rule updated");
    } catch (error) {
      console.error("Error saving approval rule:", error);
      toast.error(error.serverData?.error || "Failed to save approval rule");
    } finally {
      setSavingApprovalRule(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench", onClick: onBack },
          { label: "Controls", icon: "fa-shield-halved" },
        ]}
      />

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Facility Maintenance Controls</h2>
          <p className="text-gray-600 mt-1">
            Manage teams, who can assign/close/approve work, and high-cost approval thresholds
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
            <p className="text-gray-600">Loading Controls settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Teams Roster */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Teams Roster</h3>
              <p className="text-sm text-gray-500 mb-4">
                Teams used across Ticketing, Tasks, and Preventive Maintenance assignment
              </p>

              <div className="space-y-2 mb-4">
                {teams.map((team, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => updateTeam(idx, { name: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    />
                    <select
                      value={team.color}
                      onChange={(e) => updateTeam(idx, { color: e.target.value })}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      {COLOR_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={team.isActive}
                        onChange={(e) => updateTeam(idx, { isActive: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      Active
                    </label>
                    <button onClick={() => removeTeam(idx)} className="text-red-500 hover:text-red-700">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="New team name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addTeam}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Add Team
                </button>
              </div>

              <button
                onClick={handleSaveTeams}
                disabled={savingTeams}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingTeams ? "Saving..." : "Save Teams"}
              </button>
            </div>

            {/* Permission Matrix */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Role Permissions</h3>
              <p className="text-sm text-gray-500 mb-4">
                Admin and Security Admin roles always have full access. Configure what other roles can do.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {settings?.roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {settings?.actions.map((action) => (
                  <label
                    key={action}
                    className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg"
                  >
                    <input
                      type="checkbox"
                      checked={!!rolePermissions[action]}
                      onChange={() => handlePermissionToggle(action)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    {ACTION_LABELS[action] || action}
                  </label>
                ))}
              </div>

              <button
                onClick={handleSavePermissions}
                disabled={savingPermissions || !selectedRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPermissions ? "Saving..." : `Save Permissions for ${selectedRole}`}
              </button>
            </div>

            {/* Approval Rule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">High-Cost Approval Rule</h3>
              <p className="text-sm text-gray-500 mb-4">
                Require explicit approval before closing tickets above a cost threshold
              </p>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="approvalEnabled"
                  checked={approvalRule.enabled}
                  onChange={(e) => setApprovalRule((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="approvalEnabled" className="text-sm text-gray-700">
                  Enable high-cost approval requirement
                </label>
              </div>

              <div className="mb-4 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cost Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={approvalRule.costThreshold}
                  onChange={(e) =>
                    setApprovalRule((prev) => ({ ...prev, costThreshold: Number(e.target.value) }))
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleSaveApprovalRule}
                disabled={savingApprovalRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingApprovalRule ? "Saving..." : "Save Approval Rule"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceControls;
