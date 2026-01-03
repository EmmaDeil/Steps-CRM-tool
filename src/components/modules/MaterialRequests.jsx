import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/useAuth";
import { useLocation, useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { useDepartments } from "../../context/useDepartments";
import "../../assets/components/MaterialRequests.css";
import { NumericFormat } from "react-number-format";
import { formatCurrency } from "../../services/currency";

const MaterialRequests = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("last30");
  const [sortBy, setSortBy] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendors, setVendors] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    requestType: "",
    approver: "",
    department: "",
    requestTitle: "",
    requiredByDate: "",
    budgetCode: "",
    reason: "",
    preferredVendor: "",
  });

  // Line items state
  const [lineItems, setLineItems] = useState([
    {
      itemName: "",
      quantity: "",
      quantityType: "",
      amount: "",
      description: "",
    },
  ]);

  // Attachment state
  const [attachments, setAttachments] = useState([]);
  const [message, setMessage] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [userList, setUserList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Item and quantity type options
  const itemOptions = [
    "Office Supplies",
    "Computer Equipment",
    "Furniture",
    "Cleaning Supplies",
    "Safety Equipment",
    "Tools",
    "Electrical Components",
    "Plumbing Materials",
    "Building Materials",
    "Laboratory Equipment",
  ];

  const quantityTypeOptions = [
    "Pieces",
    "Boxes",
    "Cartons",
    "Pallets",
    "Sets",
    "Units",
    "Kilograms",
    "Liters",
    "Meters",
    "Square Meters",
  ];

  // API integrations
  const { departments: _departments, loading: _departmentsLoading } =
    useDepartments();

  const previousStateRef = useRef(null);

  const fetchVendors = async () => {
    try {
      const response = await apiService.get("/api/vendors");
      setVendors(response.data || []);
    } catch {
      // Silently fail - vendors are optional
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await apiService.get("/api/users", {
        params: { status: "Active" },
      });
      const formattedUsers = (response.data || []).map((user) => ({
        id: user._id,
        name: user.fullName,
        role: user.jobTitle || user.role || "Staff",
        email: user.email,
        department: user.department,
      }));
      setUserList(formattedUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      // Keep empty array on error
      setUserList([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchRequestForApproval = React.useCallback(async (requestId) => {
    try {
      const response = await apiService.get(`/api/material-requests`);
      const request = response.data.find((r) => r._id === requestId);
      if (request) {
        setSelectedRequest(request);
        setShowApprovalModal(true);
        fetchVendors();
      } else {
        toast.error("Request not found");
      }
    } catch {
      toast.error("Failed to load request");
    }
  }, []);

  // Check for approval action from email link
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    const requestId = params.get("id");

    if (action === "approve" && requestId) {
      // Fetch the specific request and show approval modal
      fetchRequestForApproval(requestId);
    }
  }, [location.search, fetchRequestForApproval]);

  const handleApproveRequest = async () => {
    if (!selectedVendor) {
      toast.error("Please select a vendor");
      return;
    }

    try {
      await apiService.post(
        `/api/material-requests/${selectedRequest._id}/approve`,
        {
          vendor: selectedVendor,
        }
      );
      toast.success("Request approved! Purchase order created.");
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setSelectedVendor("");
      navigate("/dashboard/material-requests");
      fetchRequests();
    } catch {
      toast.error("Failed to approve request");
    }
  };

  const handleRejectRequest = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      await apiService.post(
        `/api/material-requests/${selectedRequest._id}/reject`,
        {
          reason: rejectionReason,
        }
      );
      toast.success("Request rejected");
      setShowApprovalModal(false);
      setSelectedRequest(null);
      setRejectionReason("");
      navigate("/dashboard/material-requests");
      fetchRequests();
    } catch {
      toast.error("Failed to reject request");
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchUsers();

    // Restore state from localStorage on mount
    const savedState = localStorage.getItem("materialRequestsState");
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.showForm !== undefined) setShowForm(parsed.showForm);
        if (parsed.filterStatus) setFilterStatus(parsed.filterStatus);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.lineItems) setLineItems(parsed.lineItems);
        if (parsed.message) setMessage(parsed.message);
        // Note: attachments (File objects) cannot be stored in localStorage
      } catch {
        // Ignore parsing errors for localStorage
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest(".dropdown")) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [activeDropdown]);

  // Save state to localStorage only when it actually changes
  useEffect(() => {
    const stateToSave = {
      showForm,
      filterStatus,
      formData,
      lineItems,
      message,
    };

    const stateString = JSON.stringify(stateToSave);

    // Only save if state has actually changed
    if (previousStateRef.current !== stateString) {
      previousStateRef.current = stateString;
      localStorage.setItem("materialRequestsState", stateString);
    }
  }, [showForm, filterStatus, formData, lineItems, message]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/material-requests");
      setRequests(response.data || []);
      setError(null);
    } catch {
      setError("Failed to load material requests");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests =
    filterStatus === "all"
      ? requests
      : requests.filter((req) => req.status === filterStatus);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;
    setLineItems(updatedItems);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemName: "",
        quantity: "",
        quantityType: "",
        amount: "",
        description: "",
      },
    ]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length > 1) {
      const updatedItems = lineItems.filter((_, i) => i !== index);
      setLineItems(updatedItems);
    }
  };

  const _handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLineItem();
    }
  };

  const _handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
    e.target.value = null; // Reset input
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(value);
    setCursorPosition(cursorPos);

    // Check for @ mention
    const lastAtIndex = value.lastIndexOf("@", cursorPos - 1);
    if (lastAtIndex !== -1) {
      const textAfterAt = value.substring(lastAtIndex + 1, cursorPos);
      if (!textAfterAt.includes(" ") && textAfterAt.length <= 20) {
        setMentionSearchTerm(textAfterAt.toLowerCase());
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  const selectMention = (userName) => {
    const lastAtIndex = message.lastIndexOf("@", cursorPosition - 1);
    const beforeMention = message.substring(0, lastAtIndex);
    const afterCursor = message.substring(cursorPosition);
    const newMessage = `${beforeMention}@${userName} ${afterCursor}`;
    setMessage(newMessage);
    setShowMentionDropdown(false);
    setMentionSearchTerm("");
  };

  const filteredUsers = userList.filter((user) =>
    user.name.toLowerCase().includes(mentionSearchTerm)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate that at least one line item has required fields
    const validLineItems = lineItems.filter(
      (item) => item.itemName && item.quantity && item.quantityType
    );

    if (validLineItems.length === 0) {
      toast.error(
        "Please add at least one line item with name, quantity, and type"
      );
      return;
    }

    if (!formData.requestType || !formData.approver) {
      toast.error("Please fill in request type and approver");
      return;
    }

    try {
      const requestData = {
        ...formData,
        lineItems: validLineItems,
        requestedBy:
          user?.fullName ||
          user?.primaryEmailAddress?.emailAddress ||
          "Unknown User",
        date: new Date().toISOString().split("T")[0],
        status: "pending",
        attachments: attachments.map((f) => f.name), // Store file names
        message: message, // Include message with mentions
      };

      if (isEditMode && selectedRequest) {
        // Update existing request
        await apiService.put(
          `/api/material-requests/${selectedRequest._id}`,
          requestData
        );
        toast.success("Material request updated successfully!");
      } else {
        // Create new request
        await apiService.post("/api/material-requests", requestData);
        toast.success("Material request submitted successfully!");
      }

      // Reset form state
      setShowForm(false);
      setIsEditMode(false);
      setSelectedRequest(null);
      setFormData({
        requestType: "",
        approver: "",
        department: "",
      });
      setLineItems([
        {
          itemName: "",
          quantity: "",
          quantityType: "",
          amount: "",
          description: "",
        },
      ]);
      setAttachments([]);
      setMessage("");

      // Clear saved state from localStorage after submission
      localStorage.removeItem("materialRequestsState");

      fetchRequests();
    } catch {
      toast.error("Failed to submit request");
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
    setActiveDropdown(null);
  };

  const handleEditRequest = (request) => {
    setSelectedRequest(request);
    setFormData({
      requestType: request.requestType,
      approver: request.approver,
      department: request.department,
    });
    setLineItems(request.lineItems || []);
    setMessage(request.message || "");
    setIsEditMode(true);
    setShowForm(true);
    setActiveDropdown(null);
  };

  const handleApproveClick = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
    fetchVendors();
    setActiveDropdown(null);
  };

  const handleRejectClick = (request) => {
    setSelectedRequest(request);
    setShowApprovalModal(true);
    setActiveDropdown(null);
  };

  const isUserApprover = (request) => {
    return (
      user?.fullName === request.approver ||
      user?.primaryEmailAddress?.emailAddress === request.approverEmail
    );
  };

  const canUserEdit = (request) => {
    const isRequester = user?.fullName === request.requestedBy;
    const isPending = request.status === "pending";
    return isRequester && isPending;
  };

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="text-center">Loading material requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            {
              label: "Material Requests",
              icon: "fa-box",
              ...(showForm && {
                onClick: (e) => {
                  e.preventDefault();
                  setShowForm(false);
                  setIsEditMode(false);
                  setSelectedRequest(null);
                },
              }),
            },
            ...(showForm
              ? [
                  {
                    label: isEditMode ? "Edit Request" : "Create New",
                    icon: isEditMode ? "fa-pen-to-square" : "fa-plus",
                  },
                ]
              : []),
          ]}
        />

        {!showForm && !showApprovalModal && !showViewModal && (
          <div className="max-w-[1400px] mx-auto px-6 py-6">
            {/* Page Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-2xl font-bold text-[#111418] mb-1">
                  Material Requests
                </h1>
                <p className="text-[#617589] text-sm">
                  Manage and track all material procurement requests
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-[#0d6efd] transition-colors flex items-center gap-2 font-medium"
              >
                <i className="fa-solid fa-plus"></i>
                Create New Request
              </button>
            </div>

            {/* Search & Filters Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Input */}
                <div className="flex-1 min-w-[280px]">
                  <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                    <input
                      type="text"
                      placeholder="Search by request ID, title, requester..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137fec] focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137fec] text-sm appearance-none bg-white cursor-pointer min-w-[140px]"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="fulfilled">Fulfilled</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                </div>

                {/* Date Filter */}
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137fec] text-sm appearance-none bg-white cursor-pointer min-w-[150px]"
                  >
                    <option value="last7">Last 7 days</option>
                    <option value="last30">Last 30 days</option>
                    <option value="last90">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                  <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                </div>

                {/* Sort By */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#137fec] text-sm appearance-none bg-white cursor-pointer min-w-[150px]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="requester">Requester A-Z</option>
                    <option value="status">Status</option>
                  </select>
                  <i className="fa-solid fa-sort absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                </div>

                {/* Clear Filters */}
                {(searchQuery ||
                  filterStatus !== "all" ||
                  dateFilter !== "last30" ||
                  sortBy !== "newest") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                      setDateFilter("last30");
                      setSortBy("newest");
                    }}
                    className="px-3 py-2 text-[#617589] hover:text-[#111418] hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <i className="fa-solid fa-filter-circle-xmark"></i>
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Material Requests Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Request ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Title & Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Requester
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Required By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Approver
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#617589] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <i className="fa-solid fa-box-open text-4xl text-gray-300 mb-2"></i>
                            <p className="text-[#617589] font-medium">
                              No material requests found
                            </p>
                            <p className="text-sm text-[#617589]">
                              {searchQuery || filterStatus !== "all"
                                ? "Try adjusting your filters"
                                : "Create a new request to get started"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests
                        .filter(
                          (req) =>
                            searchQuery === "" ||
                            req.requestId
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            req.requestedBy
                              ?.toLowerCase()
                              .includes(searchQuery.toLowerCase()) ||
                            req.lineItems?.some((item) =>
                              item.itemName
                                ?.toLowerCase()
                                .includes(searchQuery.toLowerCase())
                            )
                        )
                        .map((req) => (
                          <tr
                            key={req._id}
                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => handleViewRequest(req)}
                          >
                            <td className="px-4 py-4">
                              <span className="text-sm font-semibold text-[#137fec]">
                                #{req.requestId}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-[#111418]">
                                  {req.lineItems && req.lineItems.length > 0
                                    ? req.lineItems[0].itemName
                                    : req.requestType || "Material Request"}
                                </span>
                                <span className="text-xs text-[#617589]">
                                  {req.lineItems &&
                                    req.lineItems.length > 1 &&
                                    `+${req.lineItems.length - 1} more items`}
                                  {req.department && ` • ${req.department}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-[#137fec] text-white flex items-center justify-center text-xs font-semibold">
                                  {req.requestedBy?.charAt(0)?.toUpperCase() ||
                                    "?"}
                                </div>
                                <span className="text-sm text-[#111418]">
                                  {req.requestedBy}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-[#617589]">
                                {new Date(
                                  req.date || req.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-[#617589]">
                                {req.requiredBy
                                  ? new Date(
                                      req.requiredBy
                                    ).toLocaleDateString()
                                  : "-"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="text-sm text-[#617589]">
                                {req.approver || "-"}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                                  req.status === "approved"
                                    ? "bg-green-100 text-green-800"
                                    : req.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : req.status === "rejected"
                                    ? "bg-red-100 text-red-800"
                                    : req.status === "fulfilled"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {req.status?.charAt(0).toUpperCase() +
                                  req.status?.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewRequest(req);
                                  }}
                                  className="p-1 text-[#617589] hover:text-[#137fec] transition-colors"
                                  title="View details"
                                >
                                  <i className="fa-solid fa-eye"></i>
                                </button>
                                {canUserEdit(req) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditRequest(req);
                                    }}
                                    className="p-1 text-[#617589] hover:text-[#137fec] transition-colors"
                                    title="Edit request"
                                  >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                  </button>
                                )}
                                {isUserApprover(req) &&
                                  req.status === "pending" && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApproveClick(req);
                                        }}
                                        className="p-1 text-[#617589] hover:text-green-600 transition-colors"
                                        title="Approve request"
                                      >
                                        <i className="fa-solid fa-check"></i>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRejectClick(req);
                                        }}
                                        className="p-1 text-[#617589] hover:text-red-600 transition-colors"
                                        title="Reject request"
                                      >
                                        <i className="fa-solid fa-times"></i>
                                      </button>
                                    </>
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredRequests.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-[#617589]">
                    Showing{" "}
                    <span className="font-medium text-[#111418]">1</span> to{" "}
                    <span className="font-medium text-[#111418]">
                      {Math.min(10, filteredRequests.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-[#111418]">
                      {filteredRequests.length}
                    </span>{" "}
                    requests
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="px-3 py-1 text-sm text-[#617589] hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <button className="px-3 py-1 text-sm bg-[#137fec] text-white rounded">
                      1
                    </button>
                    <button className="px-3 py-1 text-sm text-[#617589] hover:bg-gray-100 rounded transition-colors">
                      2
                    </button>
                    <button className="px-3 py-1 text-sm text-[#617589] hover:bg-gray-100 rounded transition-colors">
                      3
                    </button>
                    <button className="px-3 py-1 text-sm text-[#617589] hover:bg-gray-100 rounded transition-colors">
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Request Form - New Consolidated Design */}
        {showForm && (
          <div className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#111418]">
                  {isEditMode
                    ? "Edit Material Request"
                    : "Create Material Request"}
                </h1>
                <p className="text-[#617589] mt-1">
                  {isEditMode
                    ? "Update the details below to modify your request."
                    : "Fill in the details below to submit a new procurement request."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                  Draft
                </span>
              </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* SECTION 1: General Info & Requester */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Request Details (2 cols wide) */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-bold text-[#111418]">
                      General Information
                    </h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-[#111418]">
                        Request Title <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="text"
                        name="requestTitle"
                        value={formData.requestTitle || ""}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] px-4 py-2.5"
                        placeholder="e.g. Q4 Office Supplies Restock"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-[#111418]">
                        Required By Date <span className="text-red-500">*</span>
                      </span>
                      <input
                        type="date"
                        name="requiredByDate"
                        value={formData.requiredByDate || ""}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] px-4 py-2.5"
                        required
                      />
                    </label>

                    <label className="flex flex-col gap-2 sm:col-span-2">
                      <span className="text-sm font-medium text-[#111418]">
                        Budget Code / Project
                      </span>
                      <input
                        type="text"
                        name="budgetCode"
                        value={formData.budgetCode || ""}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] px-4 py-2.5"
                        placeholder="e.g. P-2023-MARKETING-001"
                      />
                    </label>
                  </div>
                </div>

                {/* Right: Requester Info (Read Only) (1 col wide) */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-bold text-[#111418]">
                      Requester Details
                    </h3>
                  </div>
                  <div className="p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 rounded-full bg-[#137fec] flex items-center justify-center text-white text-lg font-bold border border-gray-200">
                        {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#111418]">
                          {user?.fullName ||
                            user?.primaryEmailAddress?.emailAddress ||
                            "Loading..."}
                        </p>
                        <p className="text-xs text-[#617589]">
                          {user?.jobTitle || "Staff Member"}
                        </p>
                      </div>
                    </div>

                    <label className="flex flex-col gap-1.5 opacity-70">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#617589]">
                        Department
                      </span>
                      <input
                        type="text"
                        className="w-full rounded-lg border-transparent bg-gray-100 text-[#111418] px-3 py-2 text-sm cursor-not-allowed"
                        value={
                          formData.department ||
                          user?.department ||
                          "Not specified"
                        }
                        readOnly
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 opacity-70">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#617589]">
                        Email
                      </span>
                      <input
                        type="email"
                        className="w-full rounded-lg border-transparent bg-gray-100 text-[#111418] px-3 py-2 text-sm cursor-not-allowed"
                        value={
                          user?.primaryEmailAddress?.emailAddress ||
                          user?.email ||
                          ""
                        }
                        readOnly
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Material Details Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h3 className="text-base font-bold text-[#111418]">
                    Material Details
                  </h3>
                  <span className="text-xs font-medium text-[#617589]">
                    Currency: USD ($)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[5%]">
                          S/N
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[20%]">
                          Item Name / SKU
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[25%]">
                          Description
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[10%]">
                          Qty
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[12%]">
                          UoM
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[12%]">
                          Unit Cost
                        </th>
                        <th className="py-3 px-4 text-xs font-semibold text-[#617589] uppercase tracking-wider w-[12%] text-right">
                          Total
                        </th>
                        <th className="py-3 px-4 w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {lineItems.map((item, index) => (
                        <tr
                          key={index}
                          className="group hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-3 text-center font-medium text-[#617589]">
                            {index + 1}
                          </td>
                          <td className="p-3">
                            <select
                              className="w-full rounded border border-gray-300 bg-white text-[#111418] focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] px-3 py-2 text-sm"
                              value={item.itemName}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "itemName",
                                  e.target.value
                                )
                              }
                              required
                            >
                              <option value="">-- Select Item --</option>
                              {itemOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              className="w-full rounded border border-gray-300 bg-white text-[#111418] focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] px-3 py-2 text-sm"
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              className="w-full rounded border border-gray-300 bg-white text-[#111418] focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] px-3 py-2 text-sm text-center"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              required
                            />
                          </td>
                          <td className="p-3">
                            <select
                              className="w-full rounded border border-gray-300 bg-white text-[#111418] focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] px-2 py-2 text-sm"
                              value={item.quantityType}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "quantityType",
                                  e.target.value
                                )
                              }
                              required
                            >
                              <option value="">-- Unit --</option>
                              {quantityTypeOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]">
                                $
                              </span>
                              <NumericFormat
                                className="w-full rounded border border-gray-300 bg-white text-[#111418] focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] pl-6 pr-2 py-2 text-sm text-right"
                                value={item.amount}
                                thousandSeparator
                                allowNegative={false}
                                decimalScale={2}
                                fixedDecimalScale
                                placeholder="0.00"
                                onValueChange={(values) => {
                                  handleLineItemChange(
                                    index,
                                    "amount",
                                    values.value
                                  );
                                }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-[#111418]">
                            {formatCurrency(
                              (parseFloat(item.quantity) || 0) *
                                (parseFloat(item.amount) || 0)
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                className="text-[#617589] hover:text-red-500 transition-colors p-1 rounded"
                                onClick={() => removeLineItem(index)}
                              >
                                <i className="fa-solid fa-trash text-base"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-2 text-[#137fec] hover:text-[#0d6efd] font-semibold text-sm px-2 py-1 rounded hover:bg-[#137fec]/10 transition-colors"
                  >
                    <i className="fa-solid fa-circle-plus text-lg"></i>
                    Add Item
                  </button>
                  <div className="flex items-center gap-4 text-base">
                    <span className="text-[#617589] font-medium">
                      Grand Total:
                    </span>
                    <span className="text-2xl font-bold text-[#111418]">
                      {formatCurrency(
                        lineItems.reduce(
                          (sum, item) =>
                            sum +
                            (parseFloat(item.quantity) || 0) *
                              (parseFloat(item.amount) || 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Reason & Approval */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-bold text-[#111418]">
                    Reason & Approval
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-medium text-[#111418]">
                      Reason for Request <span className="text-red-500">*</span>
                    </span>
                    <textarea
                      name="reason"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] px-4 py-3 min-h-[100px]"
                      placeholder="Please provide a detailed justification for this request..."
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#111418]">
                      Preferred Vendor (Optional)
                    </span>
                    <div className="relative">
                      <i className="fa-solid fa-store absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-sm"></i>
                      <select
                        name="preferredVendor"
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] pl-10 pr-8 py-2.5 appearance-none"
                      >
                        <option value="">Select a vendor...</option>
                        {vendors.map((vendor) => (
                          <option
                            key={vendor.id || vendor._id}
                            value={vendor.name}
                          >
                            {vendor.name}{" "}
                            {vendor.category && `- ${vendor.category}`}
                          </option>
                        ))}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#617589] text-xs"></i>
                    </div>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-[#111418]">
                      Assign Approver <span className="text-red-500">*</span>
                    </span>
                    <div className="relative">
                      <i className="fa-solid fa-user-check absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-sm"></i>
                      <select
                        name="approver"
                        value={formData.approver}
                        onChange={handleFormChange}
                        className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] pl-10 pr-8 py-2.5 appearance-none"
                        required
                      >
                        <option value="">Select Manager</option>
                        {usersLoading ? (
                          <option disabled>Loading users...</option>
                        ) : (
                          userList.map((user) => (
                            <option key={user.id} value={user.name}>
                              {user.name} - {user.role}
                            </option>
                          ))
                        )}
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#617589] text-xs"></i>
                    </div>
                  </label>
                </div>
              </div>

              {/* SECTION 4: Comments & Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-base font-bold text-[#111418]">
                    Comments & Activity
                  </h3>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {selectedRequest?.comments?.length || 0} Comments
                  </span>
                </div>

                <div className="max-h-[400px] overflow-y-auto p-5 flex flex-col gap-5">
                  {selectedRequest?.comments &&
                  selectedRequest.comments.length > 0 ? (
                    selectedRequest.comments.map((comment, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#137fec] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {comment.author?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#111418]">
                              {comment.author}
                            </span>
                            <span className="text-[10px] text-[#617589]">
                              {comment.timestamp}
                            </span>
                          </div>
                          <div className="bg-gray-100 p-3 rounded-lg rounded-tl-none border border-gray-200">
                            <p className="text-sm text-[#111418]">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-[#617589]">
                      <i className="fa-regular fa-comments text-4xl mb-2 opacity-30"></i>
                      <p className="text-sm">No comments yet. Add one below.</p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <label className="block mb-2 text-xs font-medium text-[#617589]">
                    Add a comment
                  </label>
                  <div className="relative group">
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-white text-[#111418] focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] pl-4 pr-4 pb-12 pt-3 text-sm min-h-[120px] resize-none transition-all"
                      placeholder="Type your comment here..."
                      value={message}
                      onChange={handleMessageChange}
                    />

                    {/* @Mention Dropdown */}
                    {showMentionDropdown && (
                      <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[200px] overflow-y-auto w-[300px]">
                        {usersLoading ? (
                          <div className="px-4 py-3 text-center text-[#617589]">
                            <span className="inline-block animate-spin mr-2">
                              ⏳
                            </span>
                            Loading users...
                          </div>
                        ) : filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                              onClick={() => selectMention(user.name)}
                            >
                              <strong className="text-[#111418]">
                                {user.name}
                              </strong>
                              <br />
                              <small className="text-[#617589]">
                                {user.role}
                              </small>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-[#617589]">
                            No users found
                          </div>
                        )}
                      </div>
                    )}

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            document.getElementById("attachmentInput").click()
                          }
                          className="p-1.5 text-[#617589] hover:text-[#137fec] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Attach File"
                        >
                          <i className="fa-solid fa-paperclip text-lg"></i>
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-[#617589] hover:text-[#137fec] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Tag User (@)"
                        >
                          <i className="fa-solid fa-at text-lg"></i>
                        </button>
                      </div>
                      <button
                        type="button"
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#137fec] hover:bg-[#0d6efd] text-white rounded-lg transition-colors shadow-sm text-xs font-bold uppercase tracking-wide"
                      >
                        Send
                        <i className="fa-solid fa-paper-plane text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {/* File attachments section */}
                  {attachments.length > 0 && (
                    <div className="mt-3">
                      <strong className="text-sm text-[#111418] block mb-2">
                        <i className="fa-solid fa-file mr-1"></i>
                        Attached Files ({attachments.length}):
                      </strong>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-sm"
                          >
                            <i className="fa-solid fa-file text-[#617589]"></i>
                            <span className="text-[#111418]">{file.name}</span>
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700 ml-1"
                              onClick={() => removeAttachment(index)}
                            >
                              <i className="fa-solid fa-times text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 bg-white border-t border-gray-200 p-4 sm:px-6 sm:py-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-t-lg">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setIsEditMode(false);
                    setSelectedRequest(null);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold text-[#617589] hover:bg-gray-100 hover:text-[#111418] transition-colors"
                >
                  Cancel
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 bg-white text-[#111418] text-sm font-bold hover:bg-gray-50 transition-colors"
                  >
                    <i className="fa-solid fa-floppy-disk text-base"></i>
                    Save Draft
                  </button>
                  <button
                    type="submit"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg bg-[#137fec] hover:bg-[#0d6efd] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <i className="fa-solid fa-paper-plane text-base"></i>
                    {isEditMode ? "Update Request" : "Submit Request"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fa-solid fa-clipboard-check me-2"></i>
                  Approve Material Request
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setSelectedVendor("");
                    setRejectionReason("");
                    navigate("/dashboard/material-requests");
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Request ID:</strong>{" "}
                    {selectedRequest._id || selectedRequest.requestId}
                  </div>
                  <div className="col-md-6">
                    <strong>Request Type:</strong>{" "}
                    <span className="badge bg-info">
                      {selectedRequest.requestType}
                    </span>
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Requested By:</strong> {selectedRequest.requestedBy}
                  </div>
                  <div className="col-md-6">
                    <strong>Department:</strong> {selectedRequest.department}
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>Date:</strong>{" "}
                    {selectedRequest.requestDate
                      ? new Date(
                          selectedRequest.requestDate
                        ).toLocaleDateString()
                      : new Date(
                          selectedRequest.createdAt
                        ).toLocaleDateString()}
                  </div>
                  <div className="col-md-6">
                    <strong>Approver:</strong> {selectedRequest.approver}
                  </div>
                </div>

                <hr />

                <h6 className="mb-3">
                  <i className="fa-solid fa-list-ul me-2"></i>Line Items
                </h6>
                <div className="table-responsive mb-4">
                  <table className="table table-sm table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th>Amount</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.lineItems?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.itemName}</td>
                          <td>{item.quantity}</td>
                          <td>{item.quantityType}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{item.description || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedRequest.message && (
                  <div className="mb-3">
                    <strong>Message:</strong>
                    <div className="p-2 bg-light rounded mt-2">
                      {selectedRequest.message}
                    </div>
                  </div>
                )}

                {selectedRequest.attachments &&
                  selectedRequest.attachments.length > 0 && (
                    <div className="mb-4">
                      <strong>Attachments:</strong>
                      <div className="mt-2">
                        {selectedRequest.attachments.map((file, idx) => (
                          <span key={idx} className="badge bg-secondary me-2">
                            <i className="fa-solid fa-file me-1"></i>
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <hr />

                <h6 className="mb-3 text-success">
                  <i className="fa-solid fa-circle-check me-2"></i>
                  Approval Action
                </h6>

                <div className="mb-3">
                  <label className="form-label">
                    Select Vendor <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={selectedVendor}
                    onChange={(e) => setSelectedVendor(e.target.value)}
                    required
                  >
                    <option value="">Choose vendor...</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.name}>
                        {vendor.name} - {vendor.category}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted">
                    A Purchase Order will be created with this vendor upon
                    approval
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Rejection Reason (if rejecting)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setSelectedVendor("");
                    setRejectionReason("");
                    navigate("/dashboard/material-requests");
                  }}
                >
                  <i className="fa-solid fa-circle-xmark me-2"></i>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRejectRequest}
                  disabled={!rejectionReason.trim()}
                >
                  <i className="fa-solid fa-xmark me-2"></i>
                  Reject Request
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleApproveRequest}
                  disabled={!selectedVendor}
                >
                  <i className="fa-solid fa-check me-2"></i>
                  Approve & Create PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View/Review Modal - Full Page View */}
      {showViewModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-gray-50 overflow-auto">
          <div className="min-h-screen flex flex-col">
            {/* Header Section */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="max-w-[1200px] mx-auto">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <h1 className="text-[#111418] text-3xl font-bold leading-tight tracking-tight">
                        Request #
                        {selectedRequest.requestId || selectedRequest._id}
                      </h1>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                          selectedRequest.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : selectedRequest.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : selectedRequest.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {selectedRequest.status === "pending"
                          ? "Pending Your Review"
                          : selectedRequest.status === "approved"
                          ? "Approved"
                          : selectedRequest.status === "rejected"
                          ? "Rejected"
                          : selectedRequest.status}
                      </span>
                    </div>
                    <p className="text-[#617589] text-sm font-normal">
                      Created on{" "}
                      {new Date(
                        selectedRequest.date || selectedRequest.createdAt
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedRequest(null);
                    }}
                    className="flex h-10 min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-white border border-gray-300 px-4 text-[#111418] text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                    <span className="truncate">Back to List</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 pb-4 pt-4">
                  <button className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 px-5 text-[#111418] shadow-sm hover:bg-gray-50 transition-colors text-sm font-bold">
                    <i className="fa-solid fa-print"></i>
                    <span className="truncate">Print Details</span>
                  </button>
                  <button className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 px-5 text-[#111418] shadow-sm hover:bg-gray-50 transition-colors text-sm font-bold">
                    <i className="fa-solid fa-share-nodes"></i>
                    <span className="truncate">Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-[1200px] mx-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  {/* Request Overview */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                      <i className="fa-solid fa-info-circle text-gray-500"></i>
                      <h3 className="text-lg font-bold text-[#111418]">
                        Request Overview
                      </h3>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                      <div className="flex flex-col gap-1">
                        <p className="text-[#617589] text-sm">Requester</p>
                        <div className="flex items-center gap-2">
                          <div className="bg-[#137fec]/20 text-[#137fec] h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {selectedRequest.requestedBy
                              ?.charAt(0)
                              ?.toUpperCase() || "U"}
                          </div>
                          <p className="text-[#111418] text-base font-medium">
                            {selectedRequest.requestedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[#617589] text-sm">Department</p>
                        <p className="text-[#111418] text-base font-medium">
                          {selectedRequest.department || "Not specified"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[#617589] text-sm">
                          Required By Date
                        </p>
                        <p className="text-[#111418] text-base font-medium">
                          {selectedRequest.requiredByDate
                            ? new Date(
                                selectedRequest.requiredByDate
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Not specified"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[#617589] text-sm">
                          Budget Code / Project
                        </p>
                        <p className="text-[#111418] text-base font-medium">
                          {selectedRequest.budgetCode || "Not specified"}
                        </p>
                      </div>
                      {selectedRequest.message && (
                        <div className="md:col-span-2 flex flex-col gap-1 pt-2">
                          <p className="text-[#617589] text-sm">
                            Reason for Request
                          </p>
                          <p className="text-[#111418] text-sm leading-relaxed">
                            {selectedRequest.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Material Details Table */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-box text-gray-500"></i>
                        <h3 className="text-lg font-bold text-[#111418]">
                          Material Details
                        </h3>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">
                        {(selectedRequest.lineItems || []).length} Items
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[25%]">
                              Item Name/SKU
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[30%]">
                              Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                              Qty
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                              UoM
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                              Unit Cost
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[13%]">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(selectedRequest.lineItems || []).map(
                            (item, idx) => (
                              <tr key={idx}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#111418]">
                                  {item.itemName}
                                </td>
                                <td className="px-6 py-4 text-sm text-[#617589]">
                                  {item.description || "-"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#111418] font-medium">
                                  {item.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[#617589]">
                                  {item.quantityType}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-[#617589]">
                                  {formatCurrency(item.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-[#111418]">
                                  {formatCurrency(item.quantity * item.amount)}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200">
                          <tr>
                            <td
                              className="px-6 py-4 text-sm font-bold text-right text-[#111418] uppercase"
                              colSpan="5"
                            >
                              Total Estimated Cost
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-right text-[#137fec]">
                              {formatCurrency(
                                (selectedRequest.lineItems || []).reduce(
                                  (sum, item) =>
                                    sum + item.quantity * item.amount,
                                  0
                                )
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Communication Log */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-comments text-gray-500"></i>
                        <h3 className="text-lg font-bold text-[#111418]">
                          Communication Log
                        </h3>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">
                        {selectedRequest.comments?.length || 0} Messages
                      </span>
                    </div>
                    <div className="p-6 flex flex-col gap-6">
                      {selectedRequest.comments &&
                      selectedRequest.comments.length > 0 ? (
                        selectedRequest.comments.map((comment, idx) => (
                          <div key={idx} className="flex gap-4">
                            <div className="bg-[#137fec]/20 text-[#137fec] h-10 w-10 rounded-full flex-none flex items-center justify-center text-sm font-bold">
                              {comment.author?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-[#111418]">
                                  {comment.author}
                                </p>
                                <span className="text-xs text-[#617589]">
                                  {comment.timestamp}
                                </span>
                              </div>
                              <p className="text-sm text-[#111418] leading-relaxed">
                                {comment.text}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-[#617589] text-center py-4">
                          No messages yet
                        </p>
                      )}
                    </div>

                    {/* Add Note Section */}
                    <div className="bg-gray-50 p-6 border-t border-gray-200">
                      <div className="flex gap-4">
                        <div className="hidden sm:flex bg-blue-100 text-blue-700 h-10 w-10 rounded-full flex-none items-center justify-center text-sm font-bold">
                          {user?.fullName?.charAt(0)?.toUpperCase() || "ME"}
                        </div>
                        <div className="flex-1 flex flex-col gap-3 relative">
                          <textarea
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-[#111418] placeholder-[#617589] focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] min-h-[60px] resize-y outline-none transition-all"
                            placeholder="Add a note to the conversation log..."
                          />
                          <div className="flex justify-between items-center">
                            <button className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-[#617589] hover:text-[#111418] transition-colors rounded hover:bg-gray-100">
                              <i className="fa-solid fa-paperclip text-sm"></i>
                              <span>Attach</span>
                            </button>
                            <button className="flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white border border-gray-300 px-4 text-[#111418] shadow-sm hover:bg-gray-50 transition-colors text-xs font-bold">
                              <span>Send Note</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approval Action Section (for approvers) */}
                  {isUserApprover(selectedRequest) &&
                    selectedRequest.status === "pending" && (
                      <div className="rounded-xl border-2 border-[#137fec]/20 bg-white shadow-lg overflow-hidden ring-4 ring-[#137fec]/5">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-blue-50">
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-gavel text-[#137fec]"></i>
                            <h3 className="text-lg font-bold text-[#111418]">
                              Review & Action
                            </h3>
                          </div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#137fec] bg-[#137fec]/10 px-2 py-1 rounded">
                            Action Required
                          </span>
                        </div>
                        <div className="p-6 flex flex-col gap-6">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-[#111418]">
                              Approver Comments{" "}
                              <span className="font-normal text-[#617589]">
                                (Required for rejection)
                              </span>
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) =>
                                setRejectionReason(e.target.value)
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-[#111418] placeholder-[#617589] focus:border-[#137fec] focus:ring-1 focus:ring-[#137fec] min-h-[100px] resize-y outline-none transition-all"
                              placeholder="Enter your review comments, reasons for rejection, or instructions..."
                            />
                          </div>
                          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
                            <button className="w-full sm:w-auto flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 text-[#111418] shadow-sm hover:bg-gray-50 transition-colors text-sm font-bold">
                              <i className="fa-solid fa-share"></i>
                              <span className="truncate">
                                Forward / Delegate
                              </span>
                            </button>
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                              <button
                                onClick={handleRejectRequest}
                                className="w-full sm:w-auto flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors text-sm font-bold shadow-sm px-6"
                              >
                                <i className="fa-solid fa-ban"></i>
                                <span className="truncate">Reject Request</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowViewModal(false);
                                  setShowApprovalModal(true);
                                }}
                                className="w-full sm:w-auto flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-8 text-white shadow-sm hover:bg-green-700 transition-colors text-sm font-bold"
                              >
                                <i className="fa-solid fa-circle-check"></i>
                                <span className="truncate">
                                  Approve Request
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                {/* Right Column - Sidebar */}
                <div className="flex flex-col gap-6">
                  {/* Approval History */}
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-gray-500"></i>
                      <h3 className="text-lg font-bold text-[#111418]">
                        Approval History
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="relative pl-4 border-l-2 border-gray-200 space-y-8">
                        {/* Request Submitted */}
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-white"></div>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-[#111418]">
                              Request Submitted
                            </p>
                            <p className="text-xs text-[#617589]">
                              {new Date(
                                selectedRequest.date ||
                                  selectedRequest.createdAt
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="bg-gray-200 text-gray-600 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold">
                                {selectedRequest.requestedBy
                                  ?.charAt(0)
                                  ?.toUpperCase() || "U"}
                              </div>
                              <span className="text-sm text-[#111418]">
                                {selectedRequest.requestedBy}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Current Status */}
                        {selectedRequest.status === "pending" && (
                          <div className="relative">
                            <div className="absolute -left-[23px] top-0 h-4 w-4 rounded-full border-2 border-[#137fec] bg-white animate-pulse"></div>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-bold text-[#137fec]">
                                Pending Review
                              </p>
                              <p className="text-xs text-[#617589]">
                                Awaiting Action
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-[#617589]">
                                  Assigned to:{" "}
                                  {selectedRequest.approver || "Not assigned"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedRequest.status === "approved" && (
                          <div className="relative">
                            <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-white"></div>
                            <div className="flex flex-col gap-1">
                              <p className="text-sm font-bold text-[#111418]">
                                Approved
                              </p>
                              <p className="text-xs text-[#617589]">
                                {selectedRequest.approvedDate
                                  ? new Date(
                                      selectedRequest.approvedDate
                                    ).toLocaleDateString()
                                  : "Recently"}
                              </p>
                              <span className="ml-auto text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded w-fit">
                                Approved
                              </span>
                            </div>
                          </div>
                        )}

                        {selectedRequest.status === "rejected" &&
                          selectedRequest.rejectionReason && (
                            <div className="relative">
                              <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-red-500 ring-4 ring-white"></div>
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-bold text-[#111418]">
                                  Rejected
                                </p>
                                <p className="text-xs text-[#617589]">
                                  {selectedRequest.rejectedDate
                                    ? new Date(
                                        selectedRequest.rejectedDate
                                      ).toLocaleDateString()
                                    : "Recently"}
                                </p>
                                <div className="mt-2 rounded bg-gray-50 p-2 text-xs italic text-gray-600 border border-gray-100">
                                  "{selectedRequest.rejectionReason}"
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedRequest.attachments &&
                    selectedRequest.attachments.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                          <i className="fa-solid fa-paperclip text-gray-500"></i>
                          <h3 className="text-lg font-bold text-[#111418]">
                            Attachments
                          </h3>
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                          {selectedRequest.attachments.map((file, idx) => (
                            <a
                              key={idx}
                              className="group flex items-center gap-3 rounded-lg border border-transparent p-2 hover:bg-gray-50 hover:border-gray-200 transition-all"
                              href="#"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-red-50 text-red-600">
                                <i className="fa-solid fa-file-pdf"></i>
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <p className="truncate text-sm font-medium text-[#111418] group-hover:text-[#137fec] transition-colors">
                                  {file}
                                </p>
                                <p className="text-xs text-[#617589]">
                                  Attachment
                                </p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Preferred Vendor */}
                  {selectedRequest.preferredVendor && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                        <i className="fa-solid fa-store text-gray-500"></i>
                        <h3 className="text-lg font-bold text-[#111418]">
                          Preferred Vendor
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                            <i className="fa-solid fa-building text-gray-400 text-xl"></i>
                          </div>
                          <div>
                            <p className="text-base font-bold text-[#111418]">
                              {selectedRequest.preferredVendor}
                            </p>
                            <p className="text-sm text-[#617589]">
                              Selected Vendor
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MaterialRequests;
