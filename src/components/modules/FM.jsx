import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import ModuleLoader from "../common/ModuleLoader";

// Facilities Management main component with analytics timeline
const FM = () => {
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
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-5">
                    <i className="fa-solid fa-inbox text-4xl text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-lg font-medium">
                    {activeTab === "my-tickets"
                      ? "You have not submitted any tickets yet"
                      : "No maintenance tickets found"}
                  </p>
                  <p className="text-gray-400 text-sm mt-1 mb-5">Get started by creating your first maintenance request</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow font-medium"
                  >
                    <i className="fa-solid fa-plus mr-2" /> Create First Ticket
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Reported By</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tickets.map((ticket) => {
                        const priorityStyles = {
                          Urgent: "bg-red-50 text-red-700 ring-1 ring-red-200",
                          High: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
                          Medium: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
                          Low: "bg-green-50 text-green-700 ring-1 ring-green-200",
                        };
                        const statusStyles = {
                          Open: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
                          Assigned: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
                          "In Progress": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                          "On Hold": "bg-gray-100 text-gray-600 ring-1 ring-gray-300",
                          Completed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
                          Cancelled: "bg-red-50 text-red-600 ring-1 ring-red-200",
                        };
                        return (
                          <tr
                            key={ticket._id}
                            onClick={() => handleViewTicket(ticket._id)}
                            className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                                  <i className={`fa-solid ${
                                    ticket.category === "Item Movement" ? "fa-truck-ramp-box" :
                                    ticket.category === "Plumbing" ? "fa-droplet" :
                                    ticket.category === "Electrical" ? "fa-bolt" :
                                    ticket.category === "HVAC" ? "fa-temperature-arrow-up" :
                                    ticket.category === "Safety & Security" ? "fa-shield-halved" :
                                    ticket.category === "Cleaning" ? "fa-broom" :
                                    ticket.category === "Carpentry" ? "fa-hammer" :
                                    ticket.category === "IT Equipment" ? "fa-laptop" :
                                    "fa-wrench"
                                  } text-white text-xs`} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-gray-400 font-mono">{ticket.ticketNumber}</span>
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900 truncate max-w-[260px] group-hover:text-blue-700 transition-colors">{ticket.title}</p>
                                  <p className="text-xs text-gray-400 truncate max-w-[260px] mt-0.5 hidden sm:block">{ticket.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 hidden md:table-cell">
                              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                                <i className="fa-solid fa-tag text-gray-400 text-xs" />
                                {ticket.category || "—"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 hidden lg:table-cell">
                              <span className="text-sm text-gray-600">
                                {ticket.location?.building || "—"}
                                {ticket.location?.floor ? `, Fl ${ticket.location.floor}` : ""}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-bold text-gray-500">
                                    {(ticket.reportedBy?.firstName?.[0] || "")}{(ticket.reportedBy?.lastName?.[0] || "")}
                                  </span>
                                </div>
                                <span className="text-sm text-gray-600 truncate">
                                  {ticket.reportedBy?.firstName} {ticket.reportedBy?.lastName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${priorityStyles[ticket.priority] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200"}`}>
                                {ticket.priority}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyles[ticket.status] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200"}`}>
                                {ticket.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right hidden md:table-cell">
                              <span className="text-xs text-gray-400">
                                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                          page: Math.min(p.pages || 1, p.page + 1),
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

// Create Ticket Modal
const CreateTicketModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "Medium",
    location: { building: "", floor: "", room: "", specificLocation: "" },
    dueDate: "",
    scheduledDate: "",
    isEmergency: false,
    assignedTo: "",
    assignedTeam: "Unassigned",
    estimatedCost: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoadingEmployees(true);
        const res = await apiService.get("/api/hr/employees?limit=500");
        if (!mounted) return;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setEmployees(list);
      } catch (err) {
        console.error("Failed to load employees for assign dropdown", err);
      } finally {
        if (mounted) setLoadingEmployees(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const updateLocation = (key, value) => {
    setFormData((f) => ({
      ...f,
      location: { ...f.location, [key]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.location.building) {
      toast.error("Please enter the building location");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        estimatedCost: formData.estimatedCost ? Number(formData.estimatedCost) : undefined,
        dueDate: formData.dueDate || undefined,
        scheduledDate: formData.scheduledDate || undefined,
      };
      await apiService.post("/api/maintenance", payload);
      toast.success("Maintenance ticket created successfully");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: "HVAC", icon: "fa-fan", color: "text-sky-500" },
    { value: "Plumbing", icon: "fa-faucet-drip", color: "text-blue-500" },
    { value: "Electrical", icon: "fa-bolt", color: "text-yellow-500" },
    { value: "Carpentry", icon: "fa-hammer", color: "text-amber-700" },
    { value: "Painting", icon: "fa-paint-roller", color: "text-purple-500" },
    { value: "Cleaning", icon: "fa-broom", color: "text-green-500" },
    { value: "Landscaping", icon: "fa-tree", color: "text-emerald-600" },
    { value: "IT Equipment", icon: "fa-computer", color: "text-indigo-500" },
    { value: "Safety & Security", icon: "fa-shield-halved", color: "text-red-500" },
    { value: "General Maintenance", icon: "fa-screwdriver-wrench", color: "text-gray-600" },
    { value: "Other", icon: "fa-ellipsis", color: "text-gray-400" },
  ];

  const teams = [
    "Unassigned", "HVAC Team", "Plumbing Team", "Electrical Team",
    "General Maintenance", "IT Support", "Security Team",
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <i className="fa-solid fa-wrench text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Create Maintenance Ticket</h3>
              <p className="text-blue-100 text-xs">Fill in the details to submit a new request</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
            <i className="fa-solid fa-times text-xl" />
          </button>
        </div>

        {/* Emergency Toggle Banner */}
        {formData.isEmergency && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-red-500 animate-pulse" />
            <span className="text-sm font-semibold text-red-700">Emergency ticket — this will be flagged as urgent</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Section: Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider">
                <i className="fa-solid fa-info-circle text-blue-500" />
                Basic Information
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Broken AC unit in Conference Room B"
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the issue in detail — what happened, when it started, and the impact..."
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Select a category...</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.value}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {["Low", "Medium", "High", "Urgent"].map((p) => {
                      const priorityColors = {
                        Low: formData.priority === p ? "bg-green-100 border-green-500 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300",
                        Medium: formData.priority === p ? "bg-yellow-100 border-yellow-500 text-yellow-700" : "border-gray-200 text-gray-500 hover:border-yellow-300",
                        High: formData.priority === p ? "bg-orange-100 border-orange-500 text-orange-700" : "border-gray-200 text-gray-500 hover:border-orange-300",
                        Urgent: formData.priority === p ? "bg-red-100 border-red-500 text-red-700" : "border-gray-200 text-gray-500 hover:border-red-300",
                      };
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData((f) => ({ ...f, priority: p }))}
                          className={`flex-1 py-2 px-1 border-2 rounded-lg text-xs font-semibold transition-all ${priorityColors[p]}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Section: Location */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider">
                <i className="fa-solid fa-location-dot text-red-500" />
                Location Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Building <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Main Office, Warehouse A"
                    value={formData.location.building}
                    onChange={(e) => updateLocation("building", e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Floor</label>
                  <input
                    type="text"
                    placeholder="e.g. 2nd Floor, Ground"
                    value={formData.location.floor}
                    onChange={(e) => updateLocation("floor", e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Room 204, Kitchen"
                    value={formData.location.room}
                    onChange={(e) => updateLocation("room", e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Specific Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Near window, above sink"
                    value={formData.location.specificLocation}
                    onChange={(e) => updateLocation("specificLocation", e.target.value)}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Section: Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider">
                <i className="fa-solid fa-user-gear text-indigo-500" />
                Assignment
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Assign to Employee
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData((f) => ({ ...f, assignedTo: e.target.value }))}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">— Unassigned —</option>
                    {loadingEmployees ? (
                      <option disabled>Loading employees...</option>
                    ) : (
                      employees.map((emp) => (
                        <option key={emp._id || emp.id} value={emp._id || emp.id}>
                          {emp.name || `${emp.firstName || ""} ${emp.lastName || ""}`.trim()} — {emp.department || "No Dept"} {emp.jobTitle ? `(${emp.jobTitle})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Assigned Team
                  </label>
                  <select
                    value={formData.assignedTeam}
                    onChange={(e) => setFormData((f) => ({ ...f, assignedTeam: e.target.value }))}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    {teams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Section: Scheduling & Cost */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800 uppercase tracking-wider">
                <i className="fa-solid fa-calendar-check text-emerald-500" />
                Scheduling & Cost
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((f) => ({ ...f, dueDate: e.target.value }))}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData((f) => ({ ...f, scheduledDate: e.target.value }))}
                    className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Cost</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">₦</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.estimatedCost}
                      onChange={(e) => setFormData((f) => ({ ...f, estimatedCost: e.target.value }))}
                      className="block w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-red-200 bg-red-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <i className="fa-solid fa-triangle-exclamation text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Mark as Emergency</p>
                    <p className="text-xs text-gray-500">Emergency tickets are escalated immediately</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((f) => ({ ...f, isEmergency: !f.isEmergency }))}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    formData.isEmergency ? "bg-red-500" : "bg-gray-200"
                  }`}
                >
                  <span className={`${formData.isEmergency ? "translate-x-5" : "translate-x-0"} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400 hidden sm:block">
              <i className="fa-solid fa-info-circle mr-1" />
              Fields marked with <span className="text-red-500">*</span> are required
            </p>
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus" />
                    Create Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const TicketDetailModal = ({ ticket, onClose, onUpdate }) => {
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [assignedTo, setAssignedTo] = useState(ticket.assignedTo?._id || "");
  const [status, setStatus] = useState(ticket.status || "Open");
  const [updating, setUpdating] = useState(false);

  const fetchCurrentTicket = async () => {
    try {
      const res = await apiService.get(`/api/maintenance/${ticket._id}`);
      setCurrentTicket(res);
    } catch (err) {
      console.error("Failed to refetch ticket details", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await apiService.get("/api/users/dropdown");
        if (!mounted) return;
        const list = Array.isArray(res) ? res : [];
        setUsers(list);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentTicket(ticket);
    setAssignedTo(ticket.assignedTo?._id || "");
    setStatus(ticket.status || "Open");
  }, [ticket]);

  const handleAssign = async (val) => {
    setUpdating(true);
    try {
      await apiService.post(`/api/maintenance/${ticket._id}/assign`, {
        assignedTo: val || null,
      });
      setAssignedTo(val);
      toast.success(val ? "Ticket assigned successfully" : "Ticket unassigned");
      onUpdate();
      await fetchCurrentTicket();
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign ticket");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (val) => {
    setUpdating(true);
    try {
      await apiService.put(`/api/maintenance/${ticket._id}`, { status: val });
      setStatus(val);
      toast.success("Status updated successfully");
      onUpdate();
      await fetchCurrentTicket();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

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
      await fetchCurrentTicket();
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
            {currentTicket.ticketNumber} — {currentTicket.title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <i className="fa-solid fa-times" />
          </button>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-600 font-medium">{currentTicket.description}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div>
            <span className="text-gray-500 block">Category</span>
            <span className="font-semibold text-gray-800">{currentTicket.category}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Building Location</span>
            <span className="font-semibold text-gray-800">
              {currentTicket.location?.building || "—"}
              {currentTicket.location?.floor ? `, Fl ${currentTicket.location.floor}` : ""}
              {currentTicket.location?.room ? `, Rm ${currentTicket.location.room}` : ""}
            </span>
          </div>
        </div>

        {currentTicket.category === "Item Movement" && (
          <div className="mb-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
            <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-truck-ramp-box text-indigo-600" />
              Item Transfer Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 block">Movement Type</span>
                <span className="font-semibold text-gray-800">{currentTicket.movementType || "N/A"}</span>
              </div>
              {currentTicket.movementType === "Temporary" && (
                <div>
                  <span className="text-gray-500 block">Scheduled Return Time</span>
                  <span className="font-semibold text-amber-700">
                    {currentTicket.returnDate ? new Date(currentTicket.returnDate).toLocaleString() : "N/A"}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 block">From (Source Location)</span>
                <span className="font-semibold text-gray-800">{currentTicket.fromLocation || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">To (Destination Location)</span>
                <span className="font-semibold text-gray-800">{currentTicket.toLocation || "N/A"}</span>
              </div>
            </div>
          </div>
        )}

        {currentTicket.attachments && currentTicket.attachments.length > 0 && (
          <div className="mb-4 bg-slate-50 border border-slate-100 p-4 rounded-xl">
            <h4 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <i className="fa-solid fa-paperclip text-blue-600" />
              Supporting Documents
            </h4>
            <div className="space-y-2">
              {currentTicket.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center justify-between border rounded-lg bg-white p-2 text-sm">
                  <span className="truncate text-gray-700 font-medium max-w-md" title={att.filename}>
                    {att.filename}
                  </span>
                  <a
                    href={att.url}
                    download={att.filename || `document_${idx}`}
                    className="ml-4 text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-download text-xs" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Comments</h4>
          {(currentTicket.comments && currentTicket.comments.length > 0) ? (
            <div className="space-y-3 max-h-60 overflow-y-auto mb-3 pr-1">
              {currentTicket.comments.map((c, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-800">
                      {c.user ? `${c.user.firstName || ""} ${c.user.lastName || ""}` : "System / Unknown"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {new Date(c.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100">{c.comment}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic mb-3">No comments yet.</p>
          )}
        </div>

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Assign To
            </label>
            <select
              value={assignedTo}
              disabled={updating}
              onChange={(e) => handleAssign(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Unassigned</option>
              {Array.isArray(users) && users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName} — {u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              value={status}
              disabled={updating}
              onChange={(e) => handleStatusUpdate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option>Open</option>
              <option>Assigned</option>
              <option>In Progress</option>
              <option>On Hold</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Work Log
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
              {(currentTicket.workLog || [])
                .slice()
                .reverse()
                .map((w, idx) => (
                  <div key={`${w.timestamp}-${idx}`} className="mb-2 text-sm">
                    <div className="font-medium">{w.action}</div>
                    <div className="text-xs text-gray-500">{w.description}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(w.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
            </div>
          </div>
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
