import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";
import Breadcrumb from "../Breadcrumb";
import { useDepartments } from "../../context/useDepartments";

const Policy = () => {
  const { user } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const { departments, loading: departmentsLoading } = useDepartments();
  const [stats, setStats] = useState({
    totalPolicies: 0,
    totalChange: "Loading...",
    published: 0,
    publishedStatus: "Loading...",
    drafts: 0,
    draftsPending: "Loading...",
    reviewRequired: 0,
    reviewStatus: "Loading...",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  // Form fields for creating new policy
  const [newPolicyTitle, setNewPolicyTitle] = useState("");
  const [newPolicyDepartment, setNewPolicyDepartment] = useState("");
  const [newPolicyDescription, setNewPolicyDescription] = useState("");
  const [newPolicyDocument, setNewPolicyDocument] = useState(null);
  const [generatedPolicyId, setGeneratedPolicyId] = useState("");

  // Action menu and modals
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [viewPolicyModal, setViewPolicyModal] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null);
  const [versionHistoryModal, setVersionHistoryModal] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const versionHistoryData = {
    1: [
      {
        version: "v2.4",
        date: "Oct 24, 2023",
        time: "2:30 PM",
        author: "Sarah Jenkins",
        authorAvatar: "SJ",
        changes:
          "Updated data retention policies to comply with new regulations",
        status: "Current",
        isCurrent: true,
      },
      {
        version: "v2.3",
        date: "Aug 15, 2023",
        time: "10:15 AM",
        author: "John Smith",
        authorAvatar: "JS",
        changes: "Added encryption requirements for sensitive data",
        status: "Archived",
        isCurrent: false,
      },
      {
        version: "v2.2",
        date: "Jun 05, 2023",
        time: "3:45 PM",
        author: "Sarah Jenkins",
        authorAvatar: "SJ",
        changes: "Minor updates to access control procedures",
        status: "Archived",
        isCurrent: false,
      },
      {
        version: "v2.1",
        date: "Mar 12, 2023",
        time: "1:20 PM",
        author: "Emily Brown",
        authorAvatar: "EB",
        changes: "Updated compliance requirements",
        status: "Archived",
        isCurrent: false,
      },
      {
        version: "v2.0",
        date: "Jan 08, 2023",
        time: "9:00 AM",
        author: "Sarah Jenkins",
        authorAvatar: "SJ",
        changes: "Major revision: Restructured entire policy framework",
        status: "Archived",
        isCurrent: false,
      },
    ],
    2: [
      {
        version: "v1.0",
        date: "Nov 01, 2023",
        time: "09:15 AM",
        author: "Michael Chen",
        authorAvatar: "MC",
        changes: "Initial policy creation",
        status: "Current",
        isCurrent: true,
      },
    ],
    3: [
      {
        version: "v3.1",
        date: "Sep 12, 2023",
        time: "4:45 PM",
        author: "Emma Wilson",
        authorAvatar: "EW",
        changes: "Updated social media best practices",
        status: "Current",
        isCurrent: true,
      },
      {
        version: "v3.0",
        date: "Jul 20, 2023",
        time: "2:30 PM",
        author: "Emma Wilson",
        authorAvatar: "EW",
        changes: "Added new guidelines for video content",
        status: "Archived",
        isCurrent: false,
      },
      {
        version: "v2.5",
        date: "May 10, 2023",
        time: "11:00 AM",
        author: "Mark Johnson",
        authorAvatar: "MJ",
        changes: "Updated brand voice guidelines",
        status: "Archived",
        isCurrent: false,
      },
    ],
  };

  // Fetch policy statistics from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiService.get("/api/policies/stats");
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error("Error fetching policy stats:", error);
      toast.error("Failed to load policy statistics");
    }
  }, []);

  // Fetch policies from API
  const fetchPolicies = useCallback(async () => {
    setPoliciesLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "All Statuses") {
        params.append("status", statusFilter);
      }
      if (departmentFilter && departmentFilter !== "All Departments") {
        params.append("category", departmentFilter);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await apiService.get(
        `/api/policies?${params.toString()}`
      );
      if (response.data) {
        setPolicies(response.data);
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
      toast.error("Failed to load policies");
    } finally {
      setPoliciesLoading(false);
    }
  }, [statusFilter, departmentFilter, searchQuery]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchStats();
    fetchPolicies();
  }, [fetchStats, fetchPolicies]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPolicies();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Generate Policy ID when department changes
  const generatePolicyId = (department) => {
    if (!department) {
      setGeneratedPolicyId("");
      return;
    }

    const currentYear = new Date().getFullYear();

    // Find department code from API data
    const deptData = departments.find((d) => d.name === department);
    const code = deptData ? deptData.code : "GEN";

    // Count existing policies for this department
    const departmentPolicies = policies.filter(
      (p) => p.category === department
    );
    const nextNumber = String(departmentPolicies.length + 1).padStart(3, "0");

    const policyId = `POL-${currentYear}-${code}-${nextNumber}`;
    setGeneratedPolicyId(policyId);
  };

  // Handle department change
  const handleDepartmentChange = (e) => {
    const dept = e.target.value;
    setNewPolicyDepartment(dept);
    generatePolicyId(dept);
  };

  // Handle document upload
  const handleDocumentUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (PDF, DOC, DOCX)
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPolicyDocument({
          name: file.name,
          type: file.type,
          data: reader.result, // base64 data URL
        });
        toast.success(`Document "${file.name}" uploaded successfully`);
      };
      reader.onerror = () => {
        toast.error("Error reading file");
      };
      reader.readAsDataURL(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewPolicyTitle("");
    setNewPolicyDepartment("");
    setNewPolicyDescription("");
    setNewPolicyDocument(null);
    setGeneratedPolicyId("");
  };

  // Handle create policy
  const handleCreatePolicy = async () => {
    // Validation
    if (!newPolicyTitle.trim()) {
      toast.error("Please enter a policy title");
      return;
    }
    if (!newPolicyDepartment) {
      toast.error("Please select a department");
      return;
    }
    if (!newPolicyDescription.trim()) {
      toast.error("Please enter a policy description");
      return;
    }
    if (!newPolicyDocument) {
      toast.error("Please upload a policy document");
      return;
    }

    try {
      const policyData = {
        title: newPolicyTitle,
        category: newPolicyDepartment,
        description: newPolicyDescription,
        documentData: newPolicyDocument.data,
        documentName: newPolicyDocument.name,
        documentType: newPolicyDocument.type,
        author: {
          userId: user?.id || "unknown",
          userName: user?.fullName || "Unknown User",
          userEmail: user?.primaryEmailAddress?.emailAddress || "",
          initials: user?.firstName?.[0] + user?.lastName?.[0] || "UN",
        },
      };

      const response = await apiService.post("/api/policies", policyData);
      if (response.data) {
        toast.success(`Policy "${newPolicyTitle}" created successfully!`);
        setShowCreateModal(false);
        resetForm();
        fetchPolicies(); // Refresh the list
      }
    } catch (error) {
      console.error("Error creating policy:", error);
      toast.error("Failed to create policy");
    }
  };

  // Handle cancel
  const handleCancelCreate = () => {
    setShowCreateModal(false);
    resetForm();
  };

  // Submit policy for approval
  const handleSubmitForApproval = async (policyId) => {
    try {
      await apiService.patch(`/api/policies/${policyId}/submit`);
      toast.success("Policy submitted for approval");
      setActionMenuOpen(null);
      fetchPolicies();
    } catch (error) {
      console.error("Error submitting policy:", error);
      toast.error("Failed to submit policy");
    }
  };

  // Approve policy
  const handleApprovePolicy = async (policyId) => {
    try {
      await apiService.patch(`/api/policies/${policyId}/approve`, {
        approvedBy: {
          userId: user?.id || "unknown",
          userName: user?.fullName || "Unknown User",
        },
      });
      toast.success("Policy approved and published");
      setApprovalModal(null);
      setActionMenuOpen(null);
      fetchPolicies();
    } catch (error) {
      console.error("Error approving policy:", error);
      toast.error("Failed to approve policy");
    }
  };

  // Reject policy
  const handleRejectPolicy = async (policyId) => {
    try {
      await apiService.patch(`/api/policies/${policyId}/reject`);
      toast.error("Policy rejected and returned to draft");
      setApprovalModal(null);
      setActionMenuOpen(null);
      fetchPolicies();
    } catch (error) {
      console.error("Error rejecting policy:", error);
      toast.error("Failed to reject policy");
    }
  };

  // Delete policy
  const handleDeletePolicy = async (policyId) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      try {
        await apiService.delete(`/api/policies/${policyId}`);
        toast.success("Policy deleted successfully");
        setActionMenuOpen(null);
        fetchPolicies();
      } catch (error) {
        console.error("Error deleting policy:", error);
        toast.error("Failed to delete policy");
      }
    }
  };

  // Edit policy - open edit modal
  const handleEditPolicy = (policyId) => {
    const policy = policies.find((p) => p._id === policyId);
    if (policy) {
      setEditingPolicy(policy);
      setNewPolicyTitle(policy.title);
      setNewPolicyDepartment(policy.category);
      setNewPolicyDescription(policy.description);
      setNewPolicyDocument(null); // Allow uploading new document
      setEditMode(true);
      setShowCreateModal(true);
      setActionMenuOpen(null);
    }
  };

  // Update policy
  const handleUpdatePolicy = async () => {
    if (
      !newPolicyTitle.trim() ||
      !newPolicyDepartment ||
      !newPolicyDescription.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const updateData = {
        title: newPolicyTitle,
        description: newPolicyDescription,
        author: {
          userId: user?.id || "unknown",
          userName: user?.fullName || "Unknown User",
          userEmail: user?.primaryEmailAddress?.emailAddress || "",
          initials: user?.firstName?.[0] + user?.lastName?.[0] || "UN",
        },
      };

      // If new document is uploaded, include it
      if (newPolicyDocument && newPolicyDocument.data) {
        updateData.documentData = newPolicyDocument.data;
        updateData.documentName = newPolicyDocument.name;
        updateData.documentType = newPolicyDocument.type;
        updateData.changes = "Updated document and content";
      } else {
        updateData.changes = "Updated policy details";
      }

      await apiService.patch(`/api/policies/${editingPolicy._id}`, updateData);
      toast.success("Policy updated successfully");
      setShowCreateModal(false);
      setEditMode(false);
      setEditingPolicy(null);
      resetForm();
      fetchPolicies();
    } catch (error) {
      console.error("Error updating policy:", error);
      toast.error("Failed to update policy");
    }
  };

  // Download policy
  const handleDownloadPolicy = (policy) => {
    if (policy.documentUrl) {
      // Create a temporary link to download the base64 file
      const link = document.createElement("a");
      link.href = policy.documentUrl;
      link.download = policy.documentName || `${policy.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${policy.documentName || policy.title}`);
    } else {
      toast.error("Document not available");
    }
    setActionMenuOpen(null);
  };

  // View version history
  const handleViewVersionHistory = (policy) => {
    setVersionHistoryModal(policy);
    setActionMenuOpen(null);
  };

  // Restore previous version
  const handleRestoreVersion = async (policyId, versionToRestore) => {
    try {
      await apiService.patch(`/api/policies/${policyId}/restore-version`, {
        versionToRestore: versionToRestore.version,
        author: {
          userId: user?.id || "unknown",
          userName: user?.fullName || "Unknown User",
          userEmail: user?.primaryEmailAddress?.emailAddress || "",
          initials: user?.firstName?.[0] + user?.lastName?.[0] || "UN",
        },
      });
      toast.success(
        `Version ${versionToRestore.version} restored successfully`
      );
      setVersionHistoryModal(null);
      setActionMenuOpen(null);
      fetchPolicies();
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  };

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.policyId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All Statuses" || policy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      Published: "bg-green-100 text-green-700",
      Draft: "bg-gray-100 text-gray-700",
      "Pending Approval": "bg-blue-100 text-blue-700",
      Review: "bg-yellow-100 text-yellow-700",
      Expiring: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status) => {
    const icons = {
      Published: "fa-circle-check",
      Draft: "fa-file-lines",
      Review: "fa-eye",
      Expiring: "fa-triangle-exclamation",
    };
    return icons[status] || "fa-circle";
  };

  const getCategoryIcon = (category) => {
    const deptData = departments.find((d) => d.name === category);
    return deptData
      ? `fa-${deptData.icon}`.replace("fa-fa-", "fa-")
      : "fa-file";
  };

  const getCategoryColor = (category) => {
    const deptData = departments.find((d) => d.name === category);
    if (!deptData) return "bg-gray-100 text-gray-700";

    const colorMap = {
      blue: "bg-blue-100 text-blue-700",
      purple: "bg-purple-100 text-purple-700",
      green: "bg-green-100 text-green-700",
      red: "bg-red-100 text-red-700",
      orange: "bg-orange-100 text-orange-700",
      gray: "bg-gray-100 text-gray-700",
    };
    return colorMap[deptData.color] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Policy Management", icon: "fa-book" },
        ]}
      />

      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#111418] mb-2"></h1>
          <p className="text-gray-600">
            Create, view, and manage organizational policies. Ensure compliance
            across all departments.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Policies */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Policies</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.totalPolicies}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-file-lines text-blue-600"></i>
              </div>
            </div>
            <p className="text-sm text-green-600 font-medium">
              <i className="fa-solid fa-arrow-up mr-1"></i>
              {stats.totalChange}
            </p>
          </div>

          {/* Published */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Published</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.published}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-circle-check text-green-600"></i>
              </div>
            </div>
            <p className="text-sm text-gray-600">{stats.publishedStatus}</p>
          </div>

          {/* Drafts */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Drafts</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.drafts}
                </p>
              </div>
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-pen-to-square text-gray-600"></i>
              </div>
            </div>
            <p className="text-sm text-orange-600 font-medium">
              {stats.draftsPending}
            </p>
          </div>

          {/* Review Required */}
          <div className="bg-white rounded-lg p-6 border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Review Required</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.reviewRequired}
                </p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-yellow-600"></i>
              </div>
            </div>
            <p className="text-sm text-yellow-700 font-semibold bg-yellow-100 px-2 py-1 rounded w-fit">
              {stats.reviewStatus}
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search by policy title or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-5 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Statuses</option>
              <option>Published</option>
              <option>Draft</option>
              <option>Pending Approval</option>
              <option>Review</option>
              <option>Expiring</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-5 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All Departments</option>
              {departmentsLoading ? (
                <option disabled>Loading departments...</option>
              ) : (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))
              )}
            </select>

            {/* View Mode Toggle */}
            {/* <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1 bg-white">
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded ${
                  viewMode === "list"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <i className="fa-solid fa-list"></i>
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded ${
                  viewMode === "grid"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <i className="fa-solid fa-grid"></i>
              </button>
            </div> */}

            {/* Create Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <i className="fa-solid fa-plus"></i>
              Create New Policy
            </button>
          </div>
        </div>

        {/* Policies Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Policy Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Author
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
              {policiesLoading ? (
                // Loading skeletons
                [...Array(5)].map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-8 bg-gray-200 rounded w-8"></div>
                    </td>
                  </tr>
                ))
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <i className="fa-solid fa-inbox text-gray-300 text-4xl mb-3"></i>
                    <p className="text-gray-500">No policies found</p>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((policy) => (
                  <tr key={policy._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 ${getCategoryColor(
                            policy.category
                          )} rounded-lg flex items-center justify-center`}
                        >
                          <i
                            className={`fa-solid ${getCategoryIcon(
                              policy.category
                            )}`}
                          ></i>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {policy.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {policy.category} • {policy.policyId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        {policy.version}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">
                          {new Date(policy.lastUpdated).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(policy.lastUpdated).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {policy.author?.initials || "??"}
                        </div>
                        <span className="text-sm text-gray-900">
                          {policy.author?.userName || "Unknown"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          policy.status
                        )}`}
                      >
                        <i
                          className={`fa-solid ${getStatusIcon(policy.status)}`}
                        ></i>
                        {policy.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() =>
                          setActionMenuOpen(
                            actionMenuOpen === policy._id ? null : policy._id
                          )
                        }
                        className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>

                      {/* Action Dropdown Menu */}
                      {actionMenuOpen === policy._id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => setViewPolicyModal(policy)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <i className="fa-solid fa-eye"></i>
                              View Policy
                            </button>
                            <button
                              onClick={() => handleDownloadPolicy(policy)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <i className="fa-solid fa-download"></i>
                              Download
                            </button>
                            <button
                              onClick={() => handleViewVersionHistory(policy)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <i className="fa-solid fa-clock-rotate-left"></i>
                              Version History
                            </button>
                            {policy.status === "Draft" && (
                              <button
                                onClick={() =>
                                  handleSubmitForApproval(policy._id)
                                }
                                className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                              >
                                <i className="fa-solid fa-paper-plane"></i>
                                Submit for Approval
                              </button>
                            )}
                            {policy.status === "Pending Approval" && (
                              <button
                                onClick={() => setApprovalModal(policy)}
                                className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                              >
                                <i className="fa-solid fa-check-circle"></i>
                                Review & Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleEditPolicy(policy._id)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <i className="fa-solid fa-pen"></i>
                              Edit
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => handleDeletePolicy(policy._id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-2"
                            >
                              <i className="fa-solid fa-trash"></i>
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing 1 to 5 of {stats.totalPolicies} results
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                3
              </button>
              <span className="px-2 text-gray-500">...</span>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                8
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm">
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? "Edit Policy" : "Create New Policy"}
              </h2>
              <button
                onClick={handleCancelCreate}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Policy Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Remote Work Guidelines"
                  value={newPolicyTitle}
                  onChange={(e) => setNewPolicyTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department/Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={newPolicyDepartment}
                  onChange={handleDepartmentChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Department</option>
                  {departmentsLoading ? (
                    <option disabled>Loading departments...</option>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Auto-Generated Policy ID */}
              {generatedPolicyId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Policy ID (Auto-Generated)
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <i className="fa-solid fa-hashtag text-blue-600"></i>
                    <span className="text-blue-900 font-semibold">
                      {generatedPolicyId}
                    </span>
                    <i className="fa-solid fa-circle-check text-green-600 ml-auto"></i>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Generated based on department and year
                  </p>
                </div>
              )}

              {/* Document Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Policy Document <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="policyDocument"
                    accept=".pdf,.doc,.docx"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="policyDocument"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    {newPolicyDocument ? (
                      <div className="flex items-center gap-3 text-green-600">
                        <i className="fa-solid fa-file-check text-3xl"></i>
                        <div className="text-left">
                          <p className="font-semibold">
                            {newPolicyDocument.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(newPolicyDocument.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up text-4xl text-gray-400 mb-2"></i>
                        <p className="text-sm text-gray-600 font-medium">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PDF, DOC, or DOCX (max 10MB)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brief Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder="Provide a brief description of this policy, its purpose, and key guidelines..."
                  value={newPolicyDescription}
                  onChange={(e) => setNewPolicyDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  {newPolicyDescription.length} / 500 characters
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={handleCancelCreate}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editMode ? handleUpdatePolicy : handleCreatePolicy}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <i
                  className={`fa-solid ${editMode ? "fa-save" : "fa-plus"}`}
                ></i>
                {editMode ? "Update Policy" : "Create Policy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Policy Modal */}
      {viewPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                Policy Details
              </h2>
              <button
                onClick={() => {
                  setViewPolicyModal(null);
                  setActionMenuOpen(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {viewPolicyModal.title}
                  </h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-600">
                      {viewPolicyModal.policyId}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm font-medium text-gray-900">
                      {viewPolicyModal.version}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        viewPolicyModal.status
                      )}`}
                    >
                      <i
                        className={`fa-solid ${getStatusIcon(
                          viewPolicyModal.status
                        )}`}
                      ></i>
                      {viewPolicyModal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-sm font-medium text-gray-900">
                    {viewPolicyModal.category}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Author</p>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-semibold">
                      {viewPolicyModal.authorAvatar}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {viewPolicyModal.author}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="text-sm font-medium text-gray-900">
                    {viewPolicyModal.lastUpdated} at {viewPolicyModal.time}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Document</p>
                  <p className="text-sm font-medium text-gray-900">
                    {viewPolicyModal.document || "Not Available"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {viewPolicyModal.description && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {viewPolicyModal.description}
                  </p>
                </div>
              )}

              {/* Document Preview/Reader */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Document Preview
                </h4>
                <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                  {/* Document Viewer Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <i
                        className={`fa-solid ${
                          viewPolicyModal.documentType?.includes("pdf")
                            ? "fa-file-pdf text-red-500"
                            : viewPolicyModal.documentType?.includes("word")
                            ? "fa-file-word text-blue-500"
                            : "fa-file text-gray-500"
                        } text-lg`}
                      ></i>
                      <span className="text-sm font-medium text-gray-900">
                        {viewPolicyModal.documentName ||
                          `${viewPolicyModal.title}.pdf`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (viewPolicyModal.documentUrl) {
                            window.open(viewPolicyModal.documentUrl, "_blank");
                          } else {
                            toast.error("Document not available");
                          }
                        }}
                        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      >
                        <i className="fa-solid fa-expand mr-1"></i>
                        Full Screen
                      </button>
                    </div>
                  </div>

                  {/* Document Content Area */}
                  <div className="bg-white max-h-96 overflow-y-auto">
                    {viewPolicyModal.documentUrl ? (
                      viewPolicyModal.documentType?.includes("pdf") ? (
                        // PDF Embed
                        <embed
                          src={viewPolicyModal.documentUrl}
                          type="application/pdf"
                          className="w-full h-96"
                        />
                      ) : (
                        // For DOC/DOCX or other formats, show download option
                        <div className="p-12 text-center">
                          <i className="fa-solid fa-file-word text-blue-500 text-6xl mb-4"></i>
                          <p className="text-gray-700 mb-2">Word Document</p>
                          <p className="text-sm text-gray-500 mb-4">
                            This document format cannot be previewed in the
                            browser
                          </p>
                          <button
                            onClick={() =>
                              handleDownloadPolicy(viewPolicyModal)
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                          >
                            <i className="fa-solid fa-download"></i>
                            Download to View
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="p-12 text-center">
                        <i className="fa-solid fa-file-circle-xmark text-gray-300 text-6xl mb-4"></i>
                        <p className="text-gray-500">Document not available</p>
                      </div>
                    )}
                  </div>

                  {/* Document Viewer Footer */}
                  {viewPolicyModal.documentUrl &&
                    viewPolicyModal.documentType?.includes("pdf") && (
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          {viewPolicyModal.documentName}
                        </span>
                      </div>
                    )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDownloadPolicy(viewPolicyModal)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-download"></i>
                  Download Document
                </button>
                {viewPolicyModal.status === "Draft" && (
                  <button
                    onClick={() => {
                      handleSubmitForApproval(viewPolicyModal.id);
                      setViewPolicyModal(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-paper-plane"></i>
                    Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Review & Approve Policy
                </h2>
                <p className="text-sm text-gray-600">{approvalModal.title}</p>
              </div>
              <button
                onClick={() => {
                  setApprovalModal(null);
                  setActionMenuOpen(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Policy Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Policy ID</p>
                    <p className="text-sm font-medium text-gray-900">
                      {approvalModal.policyId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Department</p>
                    <p className="text-sm font-medium text-gray-900">
                      {approvalModal.category}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Version</p>
                    <p className="text-sm font-medium text-gray-900">
                      {approvalModal.version}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Author</p>
                    <p className="text-sm font-medium text-gray-900">
                      {approvalModal.author}
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Preview/Reader */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Document for Review
                </h4>
                <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                  {/* Document Viewer Header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-file-pdf text-red-500 text-lg"></i>
                      <span className="text-sm font-medium text-gray-900">
                        {approvalModal.document || `${approvalModal.title}.pdf`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toast.info("Opening document in full screen...")
                        }
                        className="px-3 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      >
                        <i className="fa-solid fa-expand mr-1"></i>
                        Full Screen
                      </button>
                      <button
                        onClick={() => handleDownloadPolicy(approvalModal)}
                        className="px-3 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        <i className="fa-solid fa-download mr-1"></i>
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Document Content Area */}
                  <div className="p-6 bg-white max-h-96 overflow-y-auto">
                    {/* Simulated document content */}
                    <div className="prose prose-sm max-w-none">
                      <h2 className="text-lg font-bold text-gray-900 mb-4">
                        {approvalModal.title}
                      </h2>

                      <div className="mb-4 text-xs text-gray-500">
                        <p>Policy ID: {approvalModal.policyId}</p>
                        <p>Version: {approvalModal.version}</p>
                        <p>Effective Date: {approvalModal.lastUpdated}</p>
                        <p>Department: {approvalModal.category}</p>
                      </div>

                      <hr className="my-4" />

                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        1. Purpose
                      </h3>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        {approvalModal.description ||
                          "This policy outlines the guidelines, procedures, and requirements for ensuring compliance with organizational standards and regulatory requirements."}
                      </p>

                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        2. Scope
                      </h3>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        This policy applies to all employees, contractors, and
                        third-party personnel who have access to company
                        resources and information systems within the{" "}
                        {approvalModal.category} department.
                      </p>

                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        3. Policy Guidelines
                      </h3>
                      <ul className="list-disc pl-5 text-sm text-gray-700 space-y-2 mb-4">
                        <li>
                          All personnel must adhere to the guidelines outlined
                          in this document
                        </li>
                        <li>
                          Violations of this policy may result in disciplinary
                          action
                        </li>
                        <li>
                          Regular training and awareness programs will be
                          conducted
                        </li>
                        <li>
                          This policy will be reviewed annually and updated as
                          necessary
                        </li>
                      </ul>

                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        4. Responsibilities
                      </h3>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        Department heads are responsible for ensuring compliance
                        with this policy. All employees must report any
                        violations or concerns to their immediate supervisor or
                        the compliance department.
                      </p>

                      <h3 className="text-base font-semibold text-gray-900 mb-2">
                        5. Compliance & Monitoring
                      </h3>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        Regular audits will be conducted to ensure adherence to
                        this policy. Non-compliance will be addressed through
                        appropriate corrective measures.
                      </p>

                      <hr className="my-4" />

                      <div className="text-xs text-gray-500">
                        <p>Document prepared by: {approvalModal.author}</p>
                        <p>
                          Last modified: {approvalModal.lastUpdated} at{" "}
                          {approvalModal.time}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document Viewer Footer */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Page 1 of 1 • 5 sections
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                        <i className="fa-solid fa-magnifying-glass-minus"></i>
                      </button>
                      <span className="text-xs text-gray-600">100%</span>
                      <button className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors">
                        <i className="fa-solid fa-magnifying-glass-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Approval Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">
                  Review the policy document above and choose an action:
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprovePolicy(approvalModal._id)}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-check-circle"></i>
                    Approve & Publish
                  </button>
                  <button
                    onClick={() => handleRejectPolicy(approvalModal._id)}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-times-circle"></i>
                    Reject & Return
                  </button>
                </div>
                <button
                  onClick={() => {
                    setApprovalModal(null);
                    setActionMenuOpen(null);
                  }}
                  className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  Version History
                </h2>
                <p className="text-sm text-gray-600">
                  {versionHistoryModal.title}
                </p>
              </div>
              <button
                onClick={() => {
                  setVersionHistoryModal(null);
                  setActionMenuOpen(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-6">
              {/* Current Version Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-star text-white"></i>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        Current Version: {versionHistoryModal.version}
                      </h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <i className="fa-solid fa-circle-check mr-1"></i>
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Last updated: {versionHistoryModal.lastUpdated} at{" "}
                      {versionHistoryModal.time} by {versionHistoryModal.author}
                    </p>
                  </div>
                </div>
              </div>

              {/* Version Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  Version Timeline
                </h3>

                {versionHistoryModal.versionHistory &&
                versionHistoryModal.versionHistory.length > 0 ? (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                    {versionHistoryModal.versionHistory.map(
                      (version, index) => (
                        <div
                          key={index}
                          className="relative pl-12 pb-8 last:pb-0"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-3 w-4 h-4 rounded-full border-2 ${
                              version.status === "Current"
                                ? "bg-blue-600 border-blue-600"
                                : "bg-white border-gray-300"
                            }`}
                          ></div>

                          {/* Version card */}
                          <div
                            className={`bg-white rounded-lg border ${
                              version.status === "Current"
                                ? "border-blue-300 shadow-md"
                                : "border-gray-200"
                            } p-4`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">
                                    {version.version}
                                  </h4>
                                  {version.status === "Current" && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                  {new Date(version.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "2-digit",
                                      year: "numeric",
                                    }
                                  )}{" "}
                                  at{" "}
                                  {new Date(version.date).toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                              {version.status !== "Current" && (
                                <button
                                  onClick={() =>
                                    handleRestoreVersion(
                                      versionHistoryModal._id,
                                      version
                                    )
                                  }
                                  className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                >
                                  <i className="fa-solid fa-rotate-left mr-1"></i>
                                  Restore
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-xs font-semibold">
                                {version.author?.initials || "??"}
                              </div>
                              <span className="text-sm text-gray-700">
                                {version.author?.userName || "Unknown"}
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                              <i className="fa-solid fa-pen-to-square text-gray-400 mr-2"></i>
                              {version.changes}
                            </p>

                            <div className="flex items-center gap-2 mt-3">
                              <button
                                onClick={() => {
                                  if (version.documentUrl) {
                                    window.open(version.documentUrl, "_blank");
                                  } else {
                                    toast.error("Document not available");
                                  }
                                }}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
                              >
                                <i className="fa-solid fa-eye"></i>
                                View Document
                              </button>
                              <span className="text-gray-300">•</span>
                              <button
                                onClick={() => {
                                  if (version.documentUrl) {
                                    const link = document.createElement("a");
                                    link.href = version.documentUrl;
                                    link.download =
                                      version.documentName ||
                                      `${versionHistoryModal.title}_${version.version}.pdf`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    toast.success(
                                      `Downloading ${version.version}...`
                                    );
                                  } else {
                                    toast.error("Document not available");
                                  }
                                }}
                                className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
                              >
                                <i className="fa-solid fa-download"></i>
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <i className="fa-solid fa-history text-gray-400 text-2xl"></i>
                    </div>
                    <p className="text-gray-600">
                      No version history available
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setVersionHistoryModal(null);
                  setActionMenuOpen(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Policy;
