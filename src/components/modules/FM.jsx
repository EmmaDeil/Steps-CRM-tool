import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const FM = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
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
  });

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await apiService.get("/api/maintenance/stats");
      setStats(response);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load statistics");
    }
  };

  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });

      const response = await apiService.get(`/api/maintenance?${params}`);
      setTickets(response.tickets || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load maintenance tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle view ticket details
  const handleViewTicket = async (ticketId) => {
    try {
      const response = await apiService.get(`/api/maintenance/${ticketId}`);
      setSelectedTicket(response);
      setShowDetailModal(true);
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      toast.error("Failed to load ticket details");
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    const colors = {
      Low: "bg-gray-100 text-gray-800",
      Medium: "bg-blue-100 text-blue-800",
      High: "bg-orange-100 text-orange-800",
      Urgent: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      Open: "bg-yellow-100 text-yellow-800",
      Assigned: "bg-purple-100 text-purple-800",
      "In Progress": "bg-blue-100 text-blue-800",
      "On Hold": "bg-gray-100 text-gray-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench" },
        ]}
      />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              Facility Maintenance
            </h2>
            <p className="text-gray-600 mt-1">
              Manage and track maintenance requests, schedules, and facility
              operations
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <i className="fa-solid fa-plus mr-2"></i>
            Create New Ticket
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Tickets
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.summary.totalTickets}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-ticket text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">
                    {stats.summary.openTickets}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-folder-open text-yellow-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    In Progress
                  </p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {stats.summary.inProgressTickets}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-spinner text-blue-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {stats.summary.completedTickets}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-check-circle text-green-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Urgent</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {stats.summary.urgentTickets}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-exclamation-triangle text-red-600 text-xl"></i>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Completion
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.summary.avgCompletionDays}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      days
                    </span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-clock text-purple-600 text-xl"></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "overview"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="fa-solid fa-list mr-2"></i>
                All Tickets
              </button>
              <button
                onClick={() => setActiveTab("my-tickets")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "my-tickets"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="fa-solid fa-user mr-2"></i>
                My Tickets
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "analytics"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className="fa-solid fa-chart-bar mr-2"></i>
                Analytics
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-search text-gray-400"></i>
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
                  onChange={(e) => handleFilterChange("status", e.target.value)}
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

          {/* Tickets List */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-gray-600">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-inbox text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-600 text-lg">
                  No maintenance tickets found
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <i className="fa-solid fa-plus mr-2"></i>
                  Create First Ticket
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
                                <i className="fa-solid fa-tag mr-1"></i>
                                {ticket.category}
                              </span>
                              <span className="flex items-center">
                                <i className="fa-solid fa-location-dot mr-1"></i>
                                {ticket.location.building}
                                {ticket.location.floor &&
                                  `, Floor ${ticket.location.floor}`}
                              </span>
                              <span className="flex items-center">
                                <i className="fa-solid fa-user mr-1"></i>
                                {ticket.reportedBy?.firstName}{" "}
                                {ticket.reportedBy?.lastName}
                              </span>
                              {ticket.assignedTo && (
                                <span className="flex items-center">
                                  <i className="fa-solid fa-user-check mr-1"></i>
                                  Assigned to {ticket.assignedTo.firstName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            ticket.priority,
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            ticket.status,
                          )}`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
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
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
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
          }}
        />
      )}
    </div>
  );
};

// Create Ticket Modal Component
const CreateTicketModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    location: {
      building: "",
      floor: "",
      room: "",
      specificLocation: "",
    },
    dueDate: "",
    isEmergency: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await apiService.post("/api/maintenance", formData);
      toast.success("Maintenance ticket created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating ticket:", error);
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
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description of the issue"
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
                setFormData({ ...formData, description: e.target.value })
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detailed description of the maintenance request"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Carpentry">Carpentry</option>
                <option value="Painting">Painting</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Landscaping">Landscaping</option>
                <option value="IT Equipment">IT Equipment</option>
                <option value="Safety & Security">Safety & Security</option>
                <option value="General Maintenance">General Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Priority <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Building <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.location.building}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      ...formData.location,
                      building: e.target.value,
                    },
                  })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Main Building"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Floor
              </label>
              <input
                type="text"
                value={formData.location.floor}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: { ...formData.location, floor: e.target.value },
                  })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 3rd Floor"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Room/Area
              </label>
              <input
                type="text"
                value={formData.location.room}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: { ...formData.location, room: e.target.value },
                  })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Room 301"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Specific Location/Details
            </label>
            <input
              type="text"
              value={formData.location.specificLocation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: {
                    ...formData.location,
                    specificLocation: e.target.value,
                  },
                })
              }
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Near the water cooler"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isEmergency"
              checked={formData.isEmergency}
              onChange={(e) =>
                setFormData({ ...formData, isEmergency: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isEmergency"
              className="ml-2 block text-sm text-gray-700"
            >
              <i className="fa-solid fa-exclamation-triangle text-red-500 mr-1"></i>
              This is an emergency
            </label>
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
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Creating...
                </>
              ) : (
                "Create Ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Ticket Detail Modal Component (placeholder for now)
const TicketDetailModal = ({ ticket, onClose, onUpdate }) => {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatedTicket, setUpdatedTicket] = useState(ticket);

  const handleAddComment = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiService.post(
        `/api/maintenance/${ticket._id}/comments`,
        {
          comment,
        },
      );
      setUpdatedTicket({ ...updatedTicket, comments: response.comments });
      setComment("");
      toast.success("Comment added successfully");
      onUpdate();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await apiService.put(`/api/maintenance/${ticket._id}`, {
        status: newStatus,
      });
      setUpdatedTicket(response.ticket);
      toast.success("Status updated successfully");
      onUpdate();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {updatedTicket.title}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {updatedTicket.ticketNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          {/* Status and Priority */}
          <div className="flex gap-3 mb-6">
            <select
              value={updatedTicket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <span
              className={`px-3 py-2 rounded-lg text-sm font-medium ${getPriorityColor(updatedTicket.priority)}`}
            >
              Priority: {updatedTicket.priority}
            </span>
            {updatedTicket.isEmergency && (
              <span className="px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-800">
                <i className="fa-solid fa-exclamation-triangle mr-1"></i>
                Emergency
              </span>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Description
              </label>
              <p className="text-gray-900">{updatedTicket.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Category
              </label>
              <p className="text-gray-900">{updatedTicket.category}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Location
              </label>
              <p className="text-gray-900">
                {updatedTicket.location.building}
                {updatedTicket.location.floor &&
                  `, ${updatedTicket.location.floor}`}
                {updatedTicket.location.room &&
                  `, ${updatedTicket.location.room}`}
              </p>
              {updatedTicket.location.specificLocation && (
                <p className="text-sm text-gray-600 mt-1">
                  {updatedTicket.location.specificLocation}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Reported By
              </label>
              <p className="text-gray-900">
                {updatedTicket.reportedBy?.firstName}{" "}
                {updatedTicket.reportedBy?.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {updatedTicket.reportedBy?.email}
              </p>
            </div>
            {updatedTicket.assignedTo && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Assigned To
                </label>
                <p className="text-gray-900">
                  {updatedTicket.assignedTo.firstName}{" "}
                  {updatedTicket.assignedTo.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {updatedTicket.assignedTo.email}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Created
              </label>
              <p className="text-gray-900">
                {new Date(updatedTicket.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Comments ({updatedTicket.comments?.length || 0})
            </h4>

            <div className="space-y-4 mb-4">
              {updatedTicket.comments && updatedTicket.comments.length > 0 ? (
                updatedTicket.comments.map((c, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">
                        {c.user?.firstName} {c.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(c.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-gray-700">{c.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No comments yet
                </p>
              )}
            </div>

            {/* Add Comment */}
            <div className="flex gap-3">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === "Enter" && handleAddComment()}
              />
              <button
                onClick={handleAddComment}
                disabled={submitting || !comment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-paper-plane"></i>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function (shared with parent component)
const getPriorityColor = (priority) => {
  const colors = {
    Low: "bg-gray-100 text-gray-800",
    Medium: "bg-blue-100 text-blue-800",
    High: "bg-orange-100 text-orange-800",
    Urgent: "bg-red-100 text-red-800",
  };
  return colors[priority] || "bg-gray-100 text-gray-800";
};

export default FM;
