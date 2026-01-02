import React, { useState } from "react";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";
import { validateBulkUpdate } from "../../utils/validation";
import "../ProfileAnimations.css";

const BulkEditModal = ({ selectedEmployees, onClose, onSuccess }) => {
  const [bulkUpdates, setBulkUpdates] = useState({
    department: "",
    status: "",
    jobTitle: "",
  });
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Filter out empty fields
    const updates = {};
    if (bulkUpdates.department) updates.department = bulkUpdates.department;
    if (bulkUpdates.status) updates.status = bulkUpdates.status;
    if (bulkUpdates.jobTitle) updates.jobTitle = bulkUpdates.jobTitle;

    if (Object.keys(updates).length === 0) {
      toast.error("Please select at least one field to update");
      return;
    }

    // Validate
    const { isValid, errors } = validateBulkUpdate(updates);
    if (!isValid) {
      setValidationErrors(errors);
      toast.error("Please fix validation errors");
      return;
    }

    try {
      setSaving(true);
      setValidationErrors({});

      const response = await apiService.put("/api/hr/employees/bulk-update", {
        employeeIds: selectedEmployees.map((emp) => emp._id || emp.id),
        updates,
        updatedBy: localStorage.getItem("userId") || "admin",
      });

      if (response && response.success) {
        toast.success(
          `${response.modifiedCount} employees updated successfully`,
          {
            icon: "✅",
            duration: 3000,
            className: "animate-success",
          }
        );
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update employees",
        {
          icon: "❌",
          duration: 4000,
          className: "animate-error",
        }
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-slide-in">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Bulk Edit Employees
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <i className="fa-solid fa-info-circle mr-2"></i>
              Updating <strong>{selectedEmployees.length}</strong> employee
              {selectedEmployees.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="space-y-4">
            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={bulkUpdates.department}
                onChange={(e) =>
                  setBulkUpdates({ ...bulkUpdates, department: e.target.value })
                }
                className={`w-full px-3 py-2 border ${
                  validationErrors.department
                    ? "border-red-500 validation-error"
                    : "border-gray-300 dark:border-gray-600"
                } rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 input-focus`}
                placeholder="Leave empty to skip"
              />
              {validationErrors.department && (
                <p className="text-red-500 text-xs mt-1 animate-fade-in">
                  {validationErrors.department}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={bulkUpdates.status}
                onChange={(e) =>
                  setBulkUpdates({ ...bulkUpdates, status: e.target.value })
                }
                className={`w-full px-3 py-2 border ${
                  validationErrors.status
                    ? "border-red-500 validation-error"
                    : "border-gray-300 dark:border-gray-600"
                } rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">-- No Change --</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
                <option value="Terminated">Terminated</option>
              </select>
              {validationErrors.status && (
                <p className="text-red-500 text-xs mt-1 animate-fade-in">
                  {validationErrors.status}
                </p>
              )}
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={bulkUpdates.jobTitle}
                onChange={(e) =>
                  setBulkUpdates({ ...bulkUpdates, jobTitle: e.target.value })
                }
                className={`w-full px-3 py-2 border ${
                  validationErrors.jobTitle
                    ? "border-red-500 validation-error"
                    : "border-gray-300 dark:border-gray-600"
                } rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 input-focus`}
                placeholder="Leave empty to skip"
              />
              {validationErrors.jobTitle && (
                <p className="text-red-500 text-xs mt-1 animate-fade-in">
                  {validationErrors.jobTitle}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-hover-scale"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check mr-2"></i>
                  Update All
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkEditModal;
