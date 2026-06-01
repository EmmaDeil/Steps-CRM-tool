import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import ModuleLoader from "../common/ModuleLoader";
import { useAuth } from "../../context/useAuth";

// Facilities Management main component with analytics timeline
const FM = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [ticketTimes, setTicketTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    category: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchStats();
    fetchTickets();
    if (activeTab === "analytics") fetchTicketTimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pagination.page]);

  const fetchStats = async () => {
    try {
      const res = await apiService.get("/api/maintenance/stats");
      setStats(res);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (filters.status) params.set("status", filters.status);
      if (filters.priority) params.set("priority", filters.priority);
      if (filters.category) params.set("category", filters.category);
      if (filters.search) params.set("search", filters.search);
      if (activeTab === "my-tickets") params.set("mine", "true");

      const res = await apiService.get(`/api/maintenance?${params.toString()}`);
      setTickets(res.tickets || []);
      setPagination((p) => ({
        ...p,
        total: res.pagination?.total || 0,
        pages: res.pagination?.pages || 0,
      }));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load maintenance tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketTimes = async () => {
    try {
      const res = await apiService.get("/api/maintenance/analytics/times");
      setTicketTimes(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics");
    }
  };

  const handleFilterChange = (k, v) => {
    setFilters((prev) => ({ ...prev, [k]: v }));
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const handleViewTicket = async (id) => {
    try {
      const res = await apiService.get(`/api/maintenance/${id}`);
      setSelectedTicket(res);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load ticket");
    }
  };

  // helpers
  const msToHuman = (ms) => {
    if (ms == null) return "—";
    if (ms < 1000) return `${ms} ms`;
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  };
  const formatDate = (d) => {
    if (!d) return "—";
    const dt = typeof d === "string" ? new Date(d) : d;
    return dt.toLocaleString();
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench" },
        ]}
      />

      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Facility Maintenance
            </h2>
            <p className="text-gray-600 mt-1">
              Manage and track maintenance requests and schedules
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <i className="fa-solid fa-plus mr-2"></i> Create New Ticket
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.summary.totalTickets}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Open</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.summary.openTickets}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stats.summary.inProgressTickets}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.summary.completedTickets}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              >
                <i className="fa-solid fa-list mr-2"></i> All Tickets
              </button>
              <button
                onClick={() => setActiveTab("my-tickets")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "my-tickets" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              >
                <i className="fa-solid fa-user mr-2"></i> My Tickets
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "analytics" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              >
                <i className="fa-solid fa-chart-bar mr-2"></i> Analytics
              </button>
            </nav>
          </div>

          {/* Filters */}
          {activeTab !== "analytics" && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Search
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fa-solid fa-search text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={filters.search}
                      onChange={(e) =>
                        handleFilterChange("search", e.target.value)
                      }
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) =>
                      handleFilterChange("status", e.target.value)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={filters.priority}
                    onChange={(e) =>
                      handleFilterChange("priority", e.target.value)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Priorities</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Carpentry">Carpentry</option>
                    <option value="Painting">Painting</option>
                    <option value="Cleaning">Cleaning</option>
                    <option value="Landscaping">Landscaping</option>
                    <option value="IT Equipment">IT Equipment</option>
                    <option value="Safety & Security">Safety & Security</option>
                    <option value="General Maintenance">
                      General Maintenance
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Tickets List */}
          {activeTab !== "analytics" && (
            <div className="p-6">
              {loading ? (
                <ModuleLoader moduleName="Facilities Management" />
              ) : tickets.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-inbox text-6xl text-gray-300 mb-4" />
                  <p className="text-gray-600 text-lg">
                    {activeTab === "my-tickets"
                      ? "You have not submitted any tickets yet"
                      : "No maintenance tickets found"}
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <i className="fa-solid fa-plus mr-2" /> Create First Ticket
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket._id}
                      onClick={() => handleViewTicket(ticket._id)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {ticket.ticketNumber}
                                </span>
                                <h3 className="text-base font-semibold text-gray-900">
                                  {ticket.title}
                                </h3>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                                {ticket.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <i className="fa-solid fa-tag mr-1" />
                                  {ticket.category}
                                </span>
                                <span className="flex items-center">
                                  <i className="fa-solid fa-location-dot mr-1" />
                                  {ticket.location?.building}
                                  {ticket.location?.floor
                                    ? `, Floor ${ticket.location.floor}`
                                    : ""}
                                </span>
                                <span className="flex items-center">
                                  <i className="fa-solid fa-user mr-1" />
                                  {ticket.reportedBy?.firstName}{" "}
                                  {ticket.reportedBy?.lastName}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}
                          >
                            {ticket.priority}
                          </span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pagination.pages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total,
                    )}{" "}
                    of {pagination.total} tickets
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPagination((p) => ({
                          ...p,
                          page: Math.max(1, p.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        setPagination((p) => ({
                          ...p,
                          page: Math.min(pages || 1, p.page + 1),
                        }))
                      }
                      disabled={pagination.page >= pagination.pages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Analytics */}
          {activeTab === "analytics" && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Timeline Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Average time to assign
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {msToHuman(ticketTimes?.summary?.avgToAssign)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Average time to complete
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {msToHuman(ticketTimes?.summary?.avgToComplete)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      Average in-progress → complete
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {msToHuman(ticketTimes?.summary?.avgInProgressToComplete)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Ticket Track Records
                </h3>
                <div className="space-y-3">
                  {ticketTimes?.tickets?.length ? (
                    ticketTimes.tickets.map((t) => (
                      <div
                        key={t._id}
                        className="bg-white border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-gray-500">
                              {t.ticketNumber} • {t.title}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Status: {t.status}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>Created: {formatDate(t.createdAt)}</div>
                            <div>Assigned: {formatDate(t.assignedAt)}</div>
                            <div>In Progress: {formatDate(t.inProgressAt)}</div>
                            <div>Completed: {formatDate(t.completedAt)}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm text-gray-700">
                          <div className="p-2 bg-gray-50 rounded">
                            To Assign: {msToHuman(t.durToAssign)}
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            To In-Progress: {msToHuman(t.durToInProgress)}
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            In-Progress → Complete:{" "}
                            {msToHuman(t.durInProgressToComplete)}
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            Total to Complete: {msToHuman(t.durToComplete)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">
                      No ticket timeline data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTickets();
            fetchStats();
          }}
        />
      )}

      {/* Ticket Detail Modal */}
      {showDetailModal && selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedTicket(null);
          }}
          onUpdate={() => {
            fetchTickets();
            fetchStats();
            fetchTicketTimes();
          }}
        />
      )}
    </div>
  );
};

// Create Ticket Modal (simplified)
const CreateTicketModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    location: { building: "", floor: "", room: "", specificLocation: "" },
    dueDate: "",
    isEmergency: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.post("/api/maintenance", formData);
      toast.success("Maintenance ticket created");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            Create Maintenance Ticket
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData((f) => ({ ...f, title: e.target.value }))
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData((f) => ({ ...f, description: e.target.value }))
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ticket detail modal (simplified)
const TicketDetailModal = ({ ticket, onClose, onUpdate }) => {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addComment = async () => {
    if (!comment.trim()) return toast.error("Please enter a comment");
    setSubmitting(true);
    try {
      await apiService.post(`/api/maintenance/${ticket._id}/comments`, {
        comment,
      });
      toast.success("Comment added");
      setComment("");
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {ticket.ticketNumber} — {ticket.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fa-solid fa-times" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-600">{ticket.description}</p>
        </div>

        <div className="mb-4">
          <h4 className="font-medium mb-2">Comments</h4>
          {(ticket.comments || []).map((c) => (
            <div key={c.timestamp} className="border-b py-2">
              <div className="text-sm text-gray-700">{c.comment}</div>
              <div className="text-xs text-gray-400">
                {new Date(c.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={addComment}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FM;
