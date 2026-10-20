import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const FREQUENCY_OPTIONS = ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-Annually", "Yearly", "Custom"];

const MaintenancePreventive = ({ onBack }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      if (showUpcomingOnly) {
        const response = await apiService.get("/api/maintenance/preventive/upcoming?days=30");
        setSchedules(response.schedules || []);
        setPagination((prev) => ({ ...prev, total: response.schedules?.length || 0, pages: 1 }));
      } else {
        const params = new URLSearchParams({ page: pagination.page, limit: pagination.limit });
        const response = await apiService.get(`/api/maintenance/preventive?${params}`);
        setSchedules(response.schedules || []);
        setPagination((prev) => ({
          ...prev,
          total: response.pagination?.total || 0,
          pages: response.pagination?.pages || 0,
        }));
      }
    } catch (error) {
      console.error("Error fetching preventive maintenance schedules:", error);
      toast.error("Failed to load preventive maintenance schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpcomingOnly, pagination.page]);

  const handleViewSchedule = async (id) => {
    try {
      const response = await apiService.get(`/api/maintenance/preventive/${id}`);
      setSelectedSchedule(response);
    } catch (error) {
      console.error("Error fetching schedule details:", error);
      toast.error("Failed to load schedule details");
    }
  };

  const handleGenerateNow = async (id, e) => {
    e.stopPropagation();
    try {
      await apiService.post(`/api/maintenance/preventive/${id}/generate-now`);
      toast.success("Maintenance ticket generated successfully");
      fetchSchedules();
    } catch (error) {
      console.error("Error generating ticket:", error);
      toast.error(error.serverData?.error || "Failed to generate ticket");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench", onClick: onBack },
          { label: "Preventive Maintenance", icon: "fa-calendar-check" },
        ]}
      />

      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Preventive Maintenance</h2>
            <p className="text-gray-600 mt-1">Scheduled recurring upkeep linked to equipment and assets</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <i className="fa-solid fa-plus mr-2"></i>
            New Schedule
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setShowUpcomingOnly(false)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  !showUpcomingOnly
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="fa-solid fa-list mr-2"></i>
                All Schedules
              </button>
              <button
                onClick={() => setShowUpcomingOnly(true)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  showUpcomingOnly
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="fa-solid fa-clock mr-2"></i>
                Due Within 30 Days
              </button>
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-gray-600">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-calendar-xmark text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-600 text-lg">No preventive maintenance schedules found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule._id}
                    onClick={() => handleViewSchedule(schedule._id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {schedule.scheduleNumber}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900">{schedule.title}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <i className="fa-solid fa-cube mr-1"></i>
                            {schedule.asset?.name} ({schedule.asset?.assetTag})
                          </span>
                          <span className="flex items-center">
                            <i className="fa-solid fa-repeat mr-1"></i>
                            {schedule.frequency}
                          </span>
                          <span className="flex items-center">
                            <i className="fa-solid fa-calendar mr-1"></i>
                            Next due {new Date(schedule.nextDueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            schedule.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {schedule.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={(e) => handleGenerateNow(schedule._id, e)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          Generate Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showUpcomingOnly && pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} schedules
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSchedules();
          }}
        />
      )}

      {selectedSchedule && (
        <ScheduleDetailModal schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />
      )}
    </div>
  );
};

const CreateScheduleModal = ({ onClose, onSuccess }) => {
  const [assets, setAssets] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    asset: "",
    frequency: "Monthly",
    customIntervalDays: "",
    assignedTeam: "Unassigned",
    startDate: "",
    leadTimeDays: 7,
    autoGenerateTicket: true,
    estimatedDuration: "",
    estimatedCost: "",
    checklist: [],
  });
  const [checklistInput, setChecklistInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiService
      .get("/api/maintenance/assets?limit=200")
      .then((response) => setAssets(response.assets || []))
      .catch((error) => console.error("Error fetching assets:", error));
  }, []);

  const addChecklistItem = () => {
    if (!checklistInput.trim()) return;
    setFormData((prev) => ({ ...prev, checklist: [...prev.checklist, { item: checklistInput.trim() }] }));
    setChecklistInput("");
  };

  const removeChecklistItem = (idx) => {
    setFormData((prev) => ({ ...prev, checklist: prev.checklist.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        customIntervalDays: formData.customIntervalDays ? Number(formData.customIntervalDays) : undefined,
        leadTimeDays: Number(formData.leadTimeDays) || 0,
        estimatedDuration: formData.estimatedDuration ? Number(formData.estimatedDuration) : undefined,
        estimatedCost: formData.estimatedCost ? Number(formData.estimatedCost) : undefined,
      };
      await apiService.post("/api/maintenance/preventive", payload);
      toast.success("Preventive maintenance schedule created!");
      onSuccess();
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error(error.serverData?.error || "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Create Preventive Maintenance Schedule</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Asset <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.asset}
              onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select asset</option>
              {assets.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.assetTag} - {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {FREQUENCY_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            {formData.frequency === "Custom" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Custom Interval (days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.customIntervalDays}
                  onChange={(e) => setFormData({ ...formData, customIntervalDays: e.target.value })}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Lead Time (days before due)</label>
              <input
                type="number"
                min="0"
                value={formData.leadTimeDays}
                onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned Team</label>
              <input
                type="text"
                value={formData.assignedTeam}
                onChange={(e) => setFormData({ ...formData, assignedTeam: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center h-full">
                <input
                  type="checkbox"
                  id="autoGenerateTicket"
                  checked={formData.autoGenerateTicket}
                  onChange={(e) => setFormData({ ...formData, autoGenerateTicket: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoGenerateTicket" className="ml-2 block text-sm text-gray-700">
                  Automatically generate a ticket when due
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Duration (hours)</label>
              <input
                type="number"
                min="0"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Cost</label>
              <input
                type="number"
                min="0"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Checklist Items</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addChecklistItem();
                  }
                }}
                placeholder="Add a checklist item"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addChecklistItem}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Add
              </button>
            </div>
            {formData.checklist.length > 0 && (
              <ul className="space-y-1">
                {formData.checklist.map((c, idx) => (
                  <li key={idx} className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    <span>{c.item}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ScheduleDetailModal = ({ schedule, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{schedule.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{schedule.scheduleNumber}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Asset</label>
              <p className="text-gray-900">
                {schedule.asset?.name} ({schedule.asset?.assetTag})
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Frequency</label>
              <p className="text-gray-900">{schedule.frequency}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Next Due Date</label>
              <p className="text-gray-900">{new Date(schedule.nextDueDate).toLocaleDateString()}</p>
            </div>
            {schedule.lastCompletedDate && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Last Cycle Generated</label>
                <p className="text-gray-900">{new Date(schedule.lastCompletedDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          {schedule.checklist?.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Checklist</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {schedule.checklist.map((c, idx) => (
                  <li key={idx}>{c.item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Generated Tickets ({schedule.generatedTickets?.length || 0})
            </h4>
            {schedule.generatedTickets?.length > 0 ? (
              <ul className="space-y-2">
                {schedule.generatedTickets.map((g, idx) => (
                  <li key={idx} className="text-sm bg-gray-50 px-3 py-2 rounded-lg flex justify-between">
                    <span>{g.ticket?.ticketNumber || "Ticket"}</span>
                    <span className="text-gray-500">{g.ticket?.status}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No tickets generated yet for this schedule.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePreventive;
