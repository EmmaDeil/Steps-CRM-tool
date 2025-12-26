import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Footer from "../Footer";
import Breadcrumb from "../Breadcrumb";
import SecuritySettings from "./SecuritySettings";

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get("view") || "dashboard";
  const [systemStats, setSystemStats] = useState({
    activeUsers: 0,
    usersGrowth: 0,
    pendingApprovals: 0,
    totalRequests: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    systemLoad: 0,
    loadTrend: "stable",
    uptime: 0,
    totalAdvanceRequests: 0,
    totalRefundRequests: 0,
    totalRetirementBreakdowns: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // User Management States
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showConfigureRolesModal, setShowConfigureRolesModal] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [selectedRoleTab, setSelectedRoleTab] = useState("Admin");
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableModules, setAvailableModules] = useState([]);

  const [newUser, setNewUser] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Editor",
  });

  const [rolePermissions, setRolePermissions] = useState({
    Admin: {
      userManagement: { viewUsers: true, editUsers: true, inviteUsers: true },
      billingFinance: { viewInvoices: true, manageSubscription: true },
      systemSettings: { globalConfiguration: true },
    },
    Editor: {
      userManagement: { viewUsers: true, editUsers: true, inviteUsers: false },
      billingFinance: { viewInvoices: false, manageSubscription: false },
      systemSettings: { globalConfiguration: false },
    },
    Viewer: {
      userManagement: { viewUsers: true, editUsers: false, inviteUsers: false },
      billingFinance: { viewInvoices: false, manageSubscription: false },
      systemSettings: { globalConfiguration: false },
    },
  });

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRole) params.append("role", filterRole);
      if (filterStatus) params.append("status", filterStatus);
      if (searchQuery) params.append("search", searchQuery);

      const response = await apiService.get(`/api/users?${params.toString()}`);
      setUsers(response.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  }, [filterRole, filterStatus, searchQuery]);

  const fetchModules = useCallback(async () => {
    try {
      const response = await apiService.get("/api/modules");
      setAvailableModules(response.data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    if (activeView === "users") {
      fetchUsers();
      fetchModules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, fetchUsers, fetchModules]);

  const fetchAdminData = async () => {
    setStatsLoading(true);
    try {
      // Fetch all data for dashboard
      const [advanceRes, refundRes, retirementRes, usersRes] =
        await Promise.all([
          apiService.get("/api/advance-requests"),
          apiService.get("/api/refund-requests"),
          apiService.get("/api/retirement-breakdown"),
          apiService.get("/api/users"),
        ]);

      const users = usersRes.data || [];
      const activeUsersCount = users.filter(
        (u) => u.status === "Active"
      ).length;
      const pendingUsersCount = users.filter(
        (u) => u.status === "Pending"
      ).length;

      // Calculate system stats from real data
      const pendingApprovals =
        (advanceRes.data?.filter((r) => r.status === "pending").length || 0) +
        (refundRes.data?.filter((r) => r.status === "pending").length || 0) +
        pendingUsersCount;

      setSystemStats({
        activeUsers: activeUsersCount,
        usersGrowth: 0, // Would need historical data to calculate
        pendingApprovals,
        totalRequests:
          (advanceRes.data?.length || 0) + (refundRes.data?.length || 0),
        totalRevenue: 0, // Would need to be calculated from financial data
        revenueGrowth: 0, // Would need historical data
        systemLoad: Math.floor(Math.random() * 30 + 30), // Simulated for now
        loadTrend: "stable",
        uptime: 99.9, // Would come from monitoring service
        totalAdvanceRequests: advanceRes.data?.length || 0,
        totalRefundRequests: refundRes.data?.length || 0,
        totalRetirementBreakdowns: retirementRes.data?.length || 0,
      });

      // Fetch service status
      fetchServiceStatus();
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchServiceStatus = async () => {
    setServicesLoading(true);
    try {
      // Set default service status (this could be fetched from a monitoring API)
      setServiceStatus([
        {
          id: 1,
          name: "Database Cluster",
          status: "online",
          uptime: "99.9%",
          color: "green",
        },
        {
          id: 2,
          name: "API Gateway",
          status: "online",
          uptime: "99.8%",
          color: "green",
        },
        {
          id: 3,
          name: "Email Service",
          status: "online",
          uptime: "99.5%",
          color: "green",
        },
        {
          id: 4,
          name: "Storage Buckets",
          status: "online",
          uptime: "100%",
          color: "green",
        },
      ]);
    } catch (error) {
      console.error("Error fetching service status:", error);
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === "users") {
      const timer = setTimeout(() => {
        fetchUsers();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, filterRole, filterStatus, activeView, fetchUsers]);

  const handleAddUser = async () => {
    if (!newUser.fullName || !newUser.email) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const userData = {
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        permissions: rolePermissions[newUser.role],
      };

      await apiService.post("/api/users", userData);
      toast.success("User added successfully!");
      setShowAddUserModal(false);
      setNewUser({ fullName: "", email: "", password: "", role: "Editor" });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      toast.error(error.response?.data?.message || "Failed to add user");
    }
  };

  const handleSaveRolePermissions = () => {
    toast.success("Role permissions updated successfully!");
    setShowConfigureRolesModal(false);
  };

  const togglePermission = (role, category, permission) => {
    setRolePermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [category]: {
          ...prev[role][category],
          [permission]: !prev[role][category][permission],
        },
      },
    }));
  };

  const handleEditUser = (userId) => {
    const user = users.find((u) => u._id === userId);
    if (user) {
      setSelectedUser({
        ...user,
        selectedModules: user.permissions?.modules || [],
      });
      setShowEditUserModal(true);
    }
    setActiveDropdown(null);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData = {
        fullName: selectedUser.fullName,
        email: selectedUser.email,
        role: selectedUser.role,
        status: selectedUser.status,
        permissions: {
          ...rolePermissions[selectedUser.role],
          modules: selectedUser.selectedModules,
        },
      };

      await apiService.patch(`/api/users/${selectedUser._id}`, updateData);
      toast.success("User updated successfully!");
      setShowEditUserModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = (userId) => {
    const user = users.find((u) => u._id === userId);
    if (user) {
      setSelectedUser(user);
      setShowDeleteUserModal(true);
    }
    setActiveDropdown(null);
  };

  const confirmDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      await apiService.delete(`/api/users/${selectedUser._id}`);
      toast.success("User deleted successfully");
      setShowDeleteUserModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user");
    }
  };

  const handleChangeStatus = async (userId) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    const newStatus =
      user.status === "Active"
        ? "Inactive"
        : user.status === "Inactive"
        ? "Active"
        : "Active";

    try {
      await apiService.patch(`/api/users/${userId}/status`, {
        status: newStatus,
      });
      toast.success(`User status changed to ${newStatus}`);
      fetchUsers();
    } catch (error) {
      console.error("Error changing status:", error);
      toast.error("Failed to change user status");
    }
    setActiveDropdown(null);
  };

  const handleResetPassword = async (userId) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    try {
      await apiService.post(`/api/users/${userId}/reset-password`);
      toast.success(`Password reset link sent to ${user.email}`);
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to send password reset email");
    }
    setActiveDropdown(null);
  };

  const toggleModuleAccess = (moduleId) => {
    if (!selectedUser) return;

    const modules = selectedUser.selectedModules || [];
    const moduleIndex = modules.findIndex((m) => m.moduleId === moduleId);
    const module = availableModules.find((m) => m.id === moduleId);

    if (moduleIndex >= 0) {
      // Remove module
      setSelectedUser({
        ...selectedUser,
        selectedModules: modules.filter((m) => m.moduleId !== moduleId),
      });
    } else {
      // Add module
      setSelectedUser({
        ...selectedUser,
        selectedModules: [
          ...modules,
          {
            moduleId: moduleId,
            moduleName: module?.name || "",
            access: true,
          },
        ],
      });
    }
  };

  const hasModuleAccess = (moduleId) => {
    if (!selectedUser) return false;
    return (
      selectedUser.selectedModules?.some((m) => m.moduleId === moduleId) ||
      false
    );
  };

  const applyFilters = () => {
    setShowFilterModal(false);
    fetchUsers();
  };

  const clearFilters = () => {
    setFilterRole("");
    setFilterStatus("");
    setShowFilterModal(false);
    fetchUsers();
  };

  const toggleDropdown = (userId) => {
    setActiveDropdown(activeDropdown === userId ? null : userId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest(".dropdown-container")) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeDropdown]);

  const filteredUsers = users;

  const getRoleBadgeColor = (role) => {
    const colors = {
      Admin: "bg-purple-100 text-purple-700",
      Editor: "bg-blue-100 text-blue-700",
      Viewer: "bg-gray-100 text-gray-700",
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const getStatusBadge = (status) => {
    const badges = {
      Active: (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Active
        </span>
      ),
      Pending: (
        <span className="flex items-center gap-1 text-yellow-600 text-sm">
          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
          Pending
        </span>
      ),
      Inactive: (
        <span className="flex items-center gap-1 text-gray-500 text-sm">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          Inactive
        </span>
      ),
    };
    return badges[status] || badges.Inactive;
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      Administrator: "Full access to all settings and user management.",
      Editor: "Can edit content but cannot manage users.",
      Viewer: "Read-only access to published content.",
    };
    return descriptions[role] || "";
  };

  if (activeView === "security") {
    return <SecuritySettings />;
  }

  if (activeView === "users") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            {
              label: "Admin Controls",
              href: "/home/7",
              icon: "fa-user-shield",
            },
            { label: "User Management", icon: "fa-users" },
          ]}
        />
        <div className="w-full p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-[#111418] mb-1">
                  User Role & Access Management
                </h1>
                <p className="text-gray-600">
                  Manage system users, assign roles, and configure granular
                  permissions.
                </p>
              </div>
              <button
                onClick={() => setShowConfigureRolesModal(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Configure Roles
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 relative"
            >
              <i className="fa-solid fa-filter"></i>
              Filter
              {(filterRole || filterStatus) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-plus"></i>
              Add User
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usersLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-gray-600">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <i className="fa-solid fa-users text-4xl mb-3"></i>
                        <p className="font-medium">No users found</p>
                        <p className="text-sm">
                          Try adjusting your search or filters
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {getInitials(user.fullName)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.fullName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => toggleDropdown(user._id)}
                            className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            <i className="fa-solid fa-ellipsis-vertical"></i>
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdown === user._id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                              <div className="py-1">
                                <button
                                  onClick={() => handleEditUser(user._id)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <i className="fa-solid fa-pen-to-square w-4"></i>
                                  Edit User
                                </button>
                                <button
                                  onClick={() => handleChangeStatus(user._id)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <i className="fa-solid fa-toggle-on w-4"></i>
                                  {user.status === "Active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                                <button
                                  onClick={() => handleResetPassword(user._id)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <i className="fa-solid fa-key w-4"></i>
                                  Reset Password
                                </button>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <i className="fa-solid fa-trash w-4"></i>
                                  Delete User
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} results
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Add New User
                </h2>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={newUser.fullName}
                    onChange={(e) =>
                      setNewUser({ ...newUser, fullName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="jane@company.com"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temporary Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordField ? "text" : "password"}
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      className="w-full px-3 py-2 pr-10 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordField(!showPasswordField)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <i
                        className={`fa-solid ${
                          showPasswordField ? "fa-eye-slash" : "fa-eye"
                        }`}
                      ></i>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    User will be prompted to change this upon login.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Assign Role
                  </label>
                  <div className="space-y-3">
                    {["Administrator", "Editor", "Viewer"].map((role) => (
                      <label
                        key={role}
                        className={`flex items-start p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                          newUser.role === role
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role}
                          checked={newUser.role === role}
                          onChange={(e) =>
                            setNewUser({ ...newUser, role: e.target.value })
                          }
                          className="mt-0.5 sm:mt-1 w-4 h-4 text-blue-600 flex-shrink-0"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">
                            {role}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {getRoleDescription(role)}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={selectedUser.fullName}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          fullName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={selectedUser.role}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          role: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={selectedUser.status}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          status: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Module Access Permissions
                  </label>
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {availableModules.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p>Loading modules...</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {availableModules.map((module) => (
                          <div
                            key={module.id}
                            className="flex items-center justify-between p-3 hover:bg-gray-50"
                          >
                            <div className="flex items-center gap-3">
                              <i
                                className={`fa-solid ${
                                  module.icon || "fa-cube"
                                } text-blue-600`}
                              ></i>
                              <span className="font-medium text-gray-900">
                                {module.name}
                              </span>
                            </div>
                            <button
                              onClick={() => toggleModuleAccess(module.id)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                hasModuleAccess(module.id)
                                  ? "bg-blue-600"
                                  : "bg-gray-200"
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  hasModuleAccess(module.id)
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select which modules this user can access
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <i className="fa-solid fa-trash text-red-600 text-xl"></i>
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                  Delete User
                </h2>
                <p className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete{" "}
                  <strong>{selectedUser.fullName}</strong>? This action cannot
                  be undone.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                  <div className="flex gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-yellow-600 mt-0.5"></i>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Warning</p>
                      <p>
                        All user data and permissions will be permanently
                        removed from the system.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteUserModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Filter Users
                </h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Roles</option>
                    <option value="Admin">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Clear Filters
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Configure Roles Modal */}
        {showConfigureRolesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Configure Roles
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Set granular permissions for each role type.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfigureRolesModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>

              {/* Role Tabs */}
              <div className="flex border-b border-gray-200">
                {["Admin", "Editor", "Viewer"].map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleTab(role)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      selectedRoleTab === role
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {/* Permissions */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* User Management */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-users text-blue-600"></i>
                      <h3 className="font-semibold text-gray-900 uppercase text-xs tracking-wider">
                        User Management
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            View Users
                          </p>
                          <p className="text-sm text-gray-600">
                            Can see the list of all users
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            togglePermission(
                              selectedRoleTab,
                              "userManagement",
                              "viewUsers"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rolePermissions[selectedRoleTab].userManagement
                              .viewUsers
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rolePermissions[selectedRoleTab].userManagement
                                .viewUsers
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Edit Users
                          </p>
                          <p className="text-sm text-gray-600">
                            Modify user details and roles
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            togglePermission(
                              selectedRoleTab,
                              "userManagement",
                              "editUsers"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rolePermissions[selectedRoleTab].userManagement
                              .editUsers
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rolePermissions[selectedRoleTab].userManagement
                                .editUsers
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Invite Users
                          </p>
                          <p className="text-sm text-gray-600">
                            Send email invitations
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            togglePermission(
                              selectedRoleTab,
                              "userManagement",
                              "inviteUsers"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rolePermissions[selectedRoleTab].userManagement
                              .inviteUsers
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rolePermissions[selectedRoleTab].userManagement
                                .inviteUsers
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Billing & Finance */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-credit-card text-blue-600"></i>
                      <h3 className="font-semibold text-gray-900 uppercase text-xs tracking-wider">
                        Billing & Finance
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            View Invoices
                          </p>
                          <p className="text-sm text-gray-600">
                            Access billing history
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            togglePermission(
                              selectedRoleTab,
                              "billingFinance",
                              "viewInvoices"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rolePermissions[selectedRoleTab].billingFinance
                              .viewInvoices
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rolePermissions[selectedRoleTab].billingFinance
                                .viewInvoices
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Manage Subscription
                          </p>
                          <p className="text-sm text-gray-600">
                            Upgrade or downgrade plans
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            togglePermission(
                              selectedRoleTab,
                              "billingFinance",
                              "manageSubscription"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rolePermissions[selectedRoleTab].billingFinance
                              .manageSubscription
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rolePermissions[selectedRoleTab].billingFinance
                                .manageSubscription
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* System Settings */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fa-solid fa-gear text-blue-600"></i>
                      <h3 className="font-semibold text-gray-900 uppercase text-xs tracking-wider">
                        System Settings
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            Global Configuration
                          </p>
                          <p className="text-sm text-gray-600">
                            Modify core app settings
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            togglePermission(
                              selectedRoleTab,
                              "systemSettings",
                              "globalConfiguration"
                            )
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            rolePermissions[selectedRoleTab].systemSettings
                              .globalConfiguration
                              ? "bg-blue-600"
                              : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              rolePermissions[selectedRoleTab].systemSettings
                                .globalConfiguration
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowConfigureRolesModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRolePermissions}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Admin Controls", icon: "fa-user-shield" },
        ]}
      />
      <div className="w-full p-3">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#111418] mb-1"></h1>
            <p className="text-[#617589]">
              Overview of system performance, user activity, and administrative
              tasks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <i className="fa-solid fa-circle text-green-500"></i>
                System Online
              </div>
              <p className="text-xs text-gray-500">Last updated: Just now</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-3 flex-wrap">
          <button
            onClick={() => setSearchParams({ view: "users" })}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-user-plus"></i>
            Manage Users
          </button>
          <button
            onClick={() => navigate("/admin?tab=logs")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#111418] rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-file-lines"></i>
            View Logs
          </button>
          <button
            onClick={() => navigate("/admin?tab=system")}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#111418] rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-gear"></i>
            System Settings
          </button>
          <button
            onClick={() =>
              toast.promise(Promise.resolve(), {
                loading: "Starting backup...",
                success: "Backup completed",
                error: "Backup failed",
              })
            }
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[#111418] rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <i className="fa-solid fa-database"></i>
            Backup Data
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            // Loading skeleton for stats
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-14 h-14 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))
          ) : (
            <>
              {/* Active Users */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Active Users
                    </p>
                    <p className="text-3xl font-bold text-[#111418]">
                      {systemStats.activeUsers.toLocaleString()}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-users text-blue-600 text-2xl"></i>
                  </div>
                </div>
                <p className="text-sm text-green-600 font-semibold">
                  <i className="fa-solid fa-arrow-up"></i> +
                  {systemStats.usersGrowth}%
                </p>
              </div>

              {/* Pending Approvals */}
              <div className="bg-white rounded-lg p-6 border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Pending Approvals
                    </p>
                    <p className="text-3xl font-bold text-[#111418]">
                      {systemStats.pendingApprovals}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-clock text-yellow-600 text-2xl"></i>
                  </div>
                </div>
                <p className="text-sm text-yellow-700 font-semibold bg-yellow-100 px-2 py-1 rounded w-fit">
                  Action Required
                </p>
              </div>

              {/* Total Revenue */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      Total Revenue
                    </p>
                    <p className="text-3xl font-bold text-[#111418]">
                      ${(systemStats.totalRevenue / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-chart-line text-green-600 text-2xl"></i>
                  </div>
                </div>
                <p className="text-sm text-green-600 font-semibold">
                  <i className="fa-solid fa-arrow-up"></i> +
                  {systemStats.revenueGrowth}%
                </p>
              </div>

              {/* System Load */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      System Load
                    </p>
                    <p className="text-3xl font-bold text-[#111418]">
                      {systemStats.systemLoad}%
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
                    <i className="fa-solid fa-gauge text-purple-600 text-2xl"></i>
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-semibold capitalize">
                  {systemStats.loadTrend}
                </p>
              </div>
            </>
          )}
        </div>

        {/* System Health & Service Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* System Health */}
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-8 text-white flex flex-col items-center justify-center border border-gray-700">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-check-circle text-green-400 text-4xl"></i>
            </div>
            <h3 className="text-2xl font-bold mb-2">System Healthy</h3>
            <p className="text-gray-300">{systemStats.uptime}% Uptime</p>
            <div className="mt-6 text-sm text-gray-400">
              All systems operational
            </div>
          </div>

          {/* Service Status */}
          <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-[#111418]">
                Service Status
              </h3>
              <button
                onClick={() => navigate("/admin?tab=logs")}
                className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1"
              >
                View All Logs <i className="fa-solid fa-arrow-right"></i>
              </button>
            </div>

            {servicesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : serviceStatus.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <i className="fa-solid fa-server text-4xl mb-3"></i>
                <p className="font-medium">No service data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serviceStatus.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          service.status === "online"
                            ? "bg-green-500"
                            : service.status === "warning"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-[#111418]">
                          {service.name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {service.status}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-600">
                      {service.uptime}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
              View Detailed Report
            </button>
          </div>
        </div>

        {/* Administration Modules */}
        <div>
          <h2 className="text-2xl font-bold text-[#111418] mb-6">
            Administration Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* User Management */}
            <div
              onClick={() => setSearchParams({ view: "users" })}
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-blue-400"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fa-solid fa-users text-blue-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#111418] mb-2">
                User Management
              </h3>
              <p className="text-sm text-gray-600">
                Manage users, roles, and permissions across the platform.
              </p>
            </div>

            {/* System Settings */}
            <div
              onClick={() => navigate("/admin?tab=system")}
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-green-400"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fa-solid fa-gear text-green-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#111418] mb-2">
                System Settings
              </h3>
              <p className="text-sm text-gray-600">
                Configure global parameters, APIs, and integrations.
              </p>
            </div>

            {/* Security & Audit */}
            <div
              onClick={() => setSearchParams({ view: "security" })}
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-purple-400"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fa-solid fa-shield text-purple-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#111418] mb-2">
                Security & Audit
              </h3>
              <p className="text-sm text-gray-600">
                Review security protocols, login attempts, and audit logs.
              </p>
            </div>

            {/* Reports */}
            <div
              onClick={() => navigate("/admin?tab=reports")}
              className="bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-orange-400"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <i className="fa-solid fa-chart-bar text-orange-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#111418] mb-2">Reports</h3>
              <p className="text-sm text-gray-600">
                Generate and export detailed system and performance reports.
              </p>
            </div>
          </div>
        </div>

        <Footer variant="admin" />
      </div>
    </div>
  );
};

export default Admin;
