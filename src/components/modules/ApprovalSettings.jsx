import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import apiService from "../../services/api";
import ModuleLoader from "../common/ModuleLoader";

const ApprovalSettings = () => {
  const formatApproverRole = (role) =>
    role === "Direct Manager" ? "Manager" : role;

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);

  // Form State
  const [moduleType, setModuleType] = useState("Advance Requests");
  const [conditions, setConditions] = useState(["All Requests"]);
  const [levels, setLevels] = useState([{ level: 1, approverRole: "Manager" }]);

  const fetchRules = async () => {
    try {
      const response = await apiService.get("/api/approval-settings");
      console.log("Fetched approval rules:", response);
      // apiService already extracts the data, so response is the array directly
      setRules(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Error fetching approval rules:", error);
      toast.error("Failed to load approval rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSaveRule = async () => {
    if (levels.length === 0) {
      return toast.error("Please add at least one approval level.");
    }

    setIsSaving(true);
    try {
      const ruleData = {
        moduleType,
        condition: conditions,
        levels,
        status: "Active",
      };

      if (editingRule) {
        // Update existing rule
        console.log("Updating approval rule:", editingRule._id, ruleData);
        await apiService.put(
          `/api/approval-settings/${editingRule._id}`,
          ruleData,
        );
        toast.success("Rule updated successfully!");
      } else {
        // Create new rule
        console.log("Creating approval rule:", ruleData);
        const response = await apiService.post(
          "/api/approval-settings",
          ruleData,
        );
        console.log("Rule created:", response);
        toast.success("Rule saved successfully!");
      }

      setShowAddModal(false);
      setEditingRule(null);
      fetchRules(); // Reload list

      // Reset form
      setModuleType("Advance Requests");
      setConditions(["All Requests"]);
      setLevels([{ level: 1, approverRole: "Manager" }]);
    } catch (error) {
      console.error("Error saving rule:", error);
      const serverMessage =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message;
      toast.error(serverMessage || "Failed to save rule");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setModuleType(rule.moduleType);
    setConditions(
      Array.isArray(rule.condition) ? rule.condition : [rule.condition],
    );
    setLevels(
      rule.levels.map((level) => ({
        ...level,
        approverRole:
          level.approverRole === "Direct Manager"
            ? "Manager"
            : level.approverRole,
      })),
    );
    setShowAddModal(true);
  };

  const handleDeleteRule = async () => {
    if (!deleteConfirmModal) return;

    try {
      await apiService.delete(
        `/api/approval-settings/${deleteConfirmModal._id}`,
      );
      toast.success("Approval rule deleted successfully");
      setDeleteConfirmModal(null);
      fetchRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const handleToggleStatus = async (rule) => {
    try {
      const newStatus = rule.status === "Active" ? "Inactive" : "Active";
      await apiService.put(`/api/approval-settings/${rule._id}`, {
        ...rule,
        status: newStatus,
      });
      toast.success(`Rule ${newStatus.toLowerCase()} successfully`);
      fetchRules();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingRule(null);
    // Reset form
    setModuleType("Advance Requests");
    setConditions(["All Requests"]);
    setLevels([{ level: 1, approverRole: "Manager" }]);
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#111418] mb-2">
            Approval Flow Settings
          </h2>
          <p className="text-gray-600">
            Define multi-level approval matrices and routing rules for various
            requests.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold leading-normal shadow-sm transition-colors"
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Create Rule
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Request Module
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Condition
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Approval Chain
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <ModuleLoader moduleName="Approval Settings" />
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No approval rules defined yet.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => (
                  <tr
                    key={rule._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#111418]">
                        {rule.moduleType}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {Array.isArray(rule.condition) ? (
                        <div className="flex flex-wrap gap-1">
                          {rule.condition.map((cond, i) => (
                            <span
                              key={i}
                              className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded"
                            >
                              {cond}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-medium px-2 py-0.5 rounded">
                          {rule.condition}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {rule.levels.map((level, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span
                              className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1 rounded-full cursor-help whitespace-nowrap"
                              title={`Level ${level.level}: ${formatApproverRole(level.approverRole)}`}
                            >
                              {level.level}.{" "}
                              {formatApproverRole(level.approverRole)}
                            </span>
                            {idx < rule.levels.length - 1 && (
                              <i className="fa-solid fa-arrow-right text-gray-400 text-[10px]"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rule.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rule.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Rule"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button
                        onClick={() => handleToggleStatus(rule)}
                        className={`p-2 transition-colors ml-1 ${
                          rule.status === "Active"
                            ? "text-gray-400 hover:text-orange-600"
                            : "text-gray-400 hover:text-green-600"
                        }`}
                        title={
                          rule.status === "Active"
                            ? "Deactivate Rule"
                            : "Activate Rule"
                        }
                      >
                        <i
                          className={`fa-solid ${rule.status === "Active" ? "fa-toggle-on" : "fa-toggle-off"}`}
                        ></i>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmModal(rule)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors ml-1"
                        title="Delete Rule"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#111418]">
                {editingRule ? "Edit Approval Rule" : "Create Approval Rule"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Module
                </label>
                <select
                  value={moduleType}
                  onChange={(e) => setModuleType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Advance Requests">Advance Requests</option>
                  <option value="Leave Requests">Leave Requests</option>
                  <option value="Refund Requests">Refund Requests</option>
                  <option value="Purchase Orders">Purchase Orders</option>
                  <option value="Material Requests">Material Requests</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trigger Conditions <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  {[
                    "All Requests",
                    "Amount > 1000",
                    "Amount > 5000",
                    "Duration > 2 Days",
                    "Duration > 5 Days",
                    "Out of Policy",
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={conditions.includes(option)}
                        onChange={(e) => {
                          if (option === "All Requests") {
                            setConditions(["All Requests"]);
                          } else {
                            const newConds = e.target.checked
                              ? [
                                  ...conditions.filter(
                                    (c) => c !== "All Requests",
                                  ),
                                  option,
                                ]
                              : conditions.filter((c) => c !== option);
                            setConditions(
                              newConds.length ? newConds : ["All Requests"],
                            );
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#137fec] focus:ring-[#137fec] cursor-pointer"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-800">
                    Approval Sequence
                  </h4>
                  <button
                    onClick={() =>
                      setLevels([
                        ...levels,
                        {
                          level: levels.length + 1,
                          approverRole: "Manager",
                        },
                      ])
                    }
                    className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus"></i>
                    Add Level
                  </button>
                </div>

                {/* Levels list */}
                {levels.map((level, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 relative"
                  >
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white">
                      {level.level}
                    </div>
                    <div className="ml-4 flex gap-3 items-center">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Approver Role / Group
                        </label>
                        <select
                          value={level.approverRole}
                          onChange={(e) => {
                            const newLevels = [...levels];
                            newLevels[idx].approverRole = e.target.value;
                            setLevels(newLevels);
                          }}
                          className="w-full h-9 px-3 rounded border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Manager">Manager</option>
                          <option value="Department Head">
                            Department Head
                          </option>
                          <option value="Finance Manager">
                            Finance Manager
                          </option>
                          <option value="HR Director">HR Director</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          const newLevels = levels
                            .filter((_, i) => i !== idx)
                            .map((l, i) => ({ ...l, level: i + 1 }));
                          setLevels(newLevels);
                        }}
                        className="mt-5 text-gray-400 hover:text-red-500 p-2"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isSaving}
                onClick={handleSaveRule}
                className="px-4 py-2 bg-[#137fec] text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? "Saving..."
                  : editingRule
                    ? "Update Rule"
                    : "Save Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 border-b border-red-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <i className="fa-solid fa-triangle-exclamation text-red-600 text-lg"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  Delete Approval Rule
                </h3>
              </div>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete this approval rule?
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Module:
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {deleteConfirmModal.moduleType}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Status:
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded ${
                        deleteConfirmModal.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {deleteConfirmModal.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      Levels:
                    </span>
                    <span className="text-sm text-gray-900">
                      {deleteConfirmModal.levels.length} approval level(s)
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-red-600 font-medium">
                ⚠️ This action cannot be undone.
              </p>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRule}
                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-trash"></i>
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalSettings;
