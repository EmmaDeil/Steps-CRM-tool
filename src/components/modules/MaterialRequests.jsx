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
  const { departments, loading: departmentsLoading } = useDepartments();

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

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLineItem();
    }
  };

  const handleFileChange = (e) => {
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

  const toggleDropdown = (requestId) => {
    setActiveDropdown(activeDropdown === requestId ? null : requestId);
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
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Material Requests", icon: "fa-clipboard-list" },
        ]}
      />
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 mt-2">
          <h2></h2>
          <div className="d-flex gap-2">
            {/* Filter Dropdown - only show when viewing list */}
            {!showForm && (
              <div className="dropdown">
                <button
                  className="btn btn-outline-secondary dropdown-toggle px-4"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="fa-solid fa-filter me-2"></i>
                  Filter:{" "}
                  {filterStatus === "all"
                    ? "All"
                    : filterStatus.charAt(0).toUpperCase() +
                      filterStatus.slice(1)}
                </button>
                <ul className="dropdown-menu">
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "all" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("all")}
                    >
                      All Requests
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "pending" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("pending")}
                    >
                      <span className="badge bg-warning me-2">●</span>Pending
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "approved" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("approved")}
                    >
                      <span className="badge bg-success me-2">●</span>Approved
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "rejected" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("rejected")}
                    >
                      <span className="badge bg-danger me-2">●</span>Rejected
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {/* New Request Button */}
            {!showForm && (
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fa-solid fa-plus-circle me-2"></i>
                New Request
              </button>
            )}
          </div>
        </div>

        {/* Request Form */}
        {showForm && (
          <div
            className="card mb-4 mx-auto"
            style={{ maxWidth: "1000px", width: "100%" }}
          >
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fa-solid fa-file-lines me-2"></i>
                {isEditMode ? "Edit Material Request" : "New Material Request"}
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="row mb-4">
                  {/* First Row: Requested By and Approver */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Requested By <span className="text-muted"></span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={
                        user?.fullName ||
                        user?.primaryEmailAddress?.emailAddress ||
                        "Loading..."
                      }
                      disabled
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Approver <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select underline-select"
                      name="approver"
                      value={formData.approver}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select approver</option>
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
                  </div>

                  {/* Second Row: Date and Request Type */}
                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Date <span className="text-muted"></span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={new Date().toLocaleDateString()}
                      disabled
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">
                      Request Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select underline-select"
                      name="requestType"
                      value={formData.requestType}
                      onChange={handleFormChange}
                      required
                    >
                      <option value="">Select type</option>
                      <option value="rfq">RFQ</option>
                      <option value="po">Purchase Order</option>
                      <option value="material-request">Material Request</option>
                      {/* <option value="bulk-order">Bulk Order</option>
                    <option value="replacement">Replacement</option> */}
                    </select>
                  </div>
                  {/* Third Row: Department (narrower width) */}
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select underline-select"
                      name="department"
                      value={formData.department}
                      onChange={handleFormChange}
                    >
                      <option value="">Select department</option>
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
                </div>

                {/* Line Items Table */}
                <div className="mb-4">
                  <div
                    className="table-responsive"
                    style={{ border: "1px solid #dee2e6", borderRadius: "4px" }}
                  >
                    <table
                      className="table table-hover mb-0"
                      style={{ borderCollapse: "separate", borderSpacing: 0 }}
                    >
                      <thead
                        style={{
                          backgroundColor: "#f8f9fa",
                          borderBottom: "2px solid #dee2e6",
                        }}
                      >
                        <tr>
                          <th
                            style={{
                              width: "2%",
                              padding: "12px 8px",
                              fontWeight: 600,
                            }}
                          >
                            S/N
                          </th>
                          <th
                            style={{
                              width: "23%",
                              padding: "12px 8px",
                              fontWeight: 600,
                            }}
                          >
                            Name *
                          </th>
                          <th
                            style={{
                              width: "27%",
                              padding: "12px 8px",
                              fontWeight: 600,
                            }}
                          >
                            Description
                          </th>
                          <th
                            style={{
                              width: "8%",
                              padding: "12px 8px",
                              fontWeight: 600,
                              textAlign: "center",
                            }}
                          >
                            Qty *
                          </th>
                          <th
                            style={{
                              width: "12%",
                              padding: "12px 8px",
                              fontWeight: 600,
                            }}
                          >
                            Unit *
                          </th>
                          <th
                            style={{
                              width: "15%",
                              padding: "12px 8px",
                              fontWeight: 600,
                              textAlign: "right",
                            }}
                          >
                            Price
                          </th>
                          <th
                            style={{
                              width: "12%",
                              padding: "12px 8px",
                              fontWeight: 600,
                              textAlign: "right",
                            }}
                          >
                            Total
                          </th>
                          <th
                            style={{
                              width: "5%",
                              padding: "12px 8px",
                              fontWeight: 600,
                              textAlign: "center",
                            }}
                          >
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, index) => (
                          <tr
                            key={index}
                            style={{ borderBottom: "1px solid #dee2e6" }}
                          >
                            <td
                              style={{
                                padding: "10px 8px",
                                verticalAlign: "middle",
                                textAlign: "center",
                                fontWeight: 500,
                                color: "#6c757d",
                              }}
                            >
                              {index + 1}
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <select
                                className="form-select form-select-sm underline-select"
                                value={item.itemName}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "itemName",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                required
                                style={{ fontSize: "0.9rem" }}
                              >
                                <option value="">-- Select Item --</option>
                                {itemOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <input
                                type="text"
                                className="form-control form-control-sm underline-input"
                                value={item.description}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "description",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                placeholder="Enter item details..."
                                style={{ fontSize: "0.9rem" }}
                              />
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <input
                                type="number"
                                className="form-control form-control-sm text-center underline-input"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "quantity",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                placeholder="0"
                                min="1"
                                required
                                style={{ fontSize: "0.9rem" }}
                              />
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <select
                                className="form-select form-select-sm underline-select"
                                value={item.quantityType}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "quantityType",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                required
                                style={{ fontSize: "0.9rem" }}
                              >
                                <option value="">-- Unit --</option>
                                {quantityTypeOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "10px 8px" }}>
                              <div className="input-group input-group-sm">
                                <NumericFormat
                                  className="form-control form-control-sm text-end underline-input"
                                  value={item.amount}
                                  thousandSeparator
                                  allowNegative={false}
                                  decimalScale={2}
                                  fixedDecimalScale
                                  placeholder="0.00"
                                  onValueChange={(values) => {
                                    const { value } = values; // numeric string without separators
                                    handleLineItemChange(
                                      index,
                                      "amount",
                                      value
                                    );
                                  }}
                                />
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "right",
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                backgroundColor: "#f8f9fa",
                              }}
                            >
                              {formatCurrency(
                                (parseFloat(item.quantity) || 0) *
                                  (parseFloat(item.amount) || 0)
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px 8px",
                                textAlign: "center",
                              }}
                            >
                              {lineItems.length > 1 && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeLineItem(index)}
                                  title="Remove line"
                                  style={{ padding: "4px 8px" }}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {/* Total Row */}
                        <tr
                          style={{
                            backgroundColor: "#e9ecef",
                            fontWeight: 600,
                            borderTop: "2px solid #dee2e6",
                          }}
                        >
                          <td
                            colSpan="6"
                            style={{ padding: "12px 8px", textAlign: "right" }}
                          >
                            Total Amount:
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              textAlign: "right",
                              fontSize: "1.1rem",
                              color: "#0d6efd",
                            }}
                          >
                            {formatCurrency(
                              lineItems.reduce(
                                (sum, item) =>
                                  sum +
                                  (parseFloat(item.quantity) || 0) *
                                    (parseFloat(item.amount) || 0),
                                0
                              )
                            )}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Message & Attachments Section */}
                <div className="mb-4">
                  <h6 className="mb-3">
                    <i className="fa-solid fa-comment-dots me-2"></i>
                    Comment
                  </h6>
                  <div
                    className="border rounded p-3"
                    style={{ backgroundColor: "#f8f9fa" }}
                  >
                    <div
                      className="position-relative"
                      style={{ display: "inline-block", width: "100%" }}
                    >
                      <textarea
                        className="form-control underline-textarea"
                        rows="4"
                        placeholder="Add a message or note... Type @ to mention someone"
                        value={message}
                        onChange={handleMessageChange}
                        style={{ paddingRight: "50px", paddingBottom: "40px" }}
                      />
                      {/* Attachment Icon Inside Textarea */}
                      <button
                        type="button"
                        onClick={() =>
                          document.getElementById("attachmentInput").click()
                        }
                        className="btn btn-link position-absolute"
                        style={{
                          bottom: "10px",
                          right: "10px",
                          padding: "0",
                          color: "#0d6efd",
                          textDecoration: "none",
                          cursor: "pointer",
                          zIndex: "10",
                          fontSize: "1.25rem",
                          lineHeight: "1",
                        }}
                        title="Attach files"
                      >
                        <i className="fa-solid fa-paperclip"></i>
                      </button>
                      <input
                        type="file"
                        id="attachmentInput"
                        multiple
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.csv,.zip"
                        style={{ display: "none" }}
                      />
                    </div>

                    {/* File Count Info */}
                    {attachments.length > 0 && (
                      <small className="text-muted d-block mt-2">
                        <i className="fa-solid fa-file me-1"></i>
                        {attachments.length} file(s) attached
                      </small>
                    )}

                    {/* @Mention Dropdown */}
                    {showMentionDropdown && (
                      <div
                        className="dropdown-menu show position-absolute mt-1"
                        style={{
                          maxHeight: "200px",
                          overflowY: "auto",
                          zIndex: 1000,
                          width: "300px",
                        }}
                      >
                        {usersLoading ? (
                          <div className="dropdown-item text-center">
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Loading users...
                          </div>
                        ) : filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="dropdown-item"
                              onClick={() => selectMention(user.name)}
                            >
                              <strong>{user.name}</strong>
                              <br />
                              <small className="text-muted">{user.role}</small>
                            </button>
                          ))
                        ) : (
                          <div className="dropdown-item text-muted">
                            No users found
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attached Files List */}
                    {attachments.length > 0 && (
                      <div className="mt-3">
                        <strong className="d-block mb-2">
                          <i className="fa-solid fa-file me-1"></i>
                          Attached Files ({attachments.length}):
                        </strong>
                        <ul className="list-group">
                          {attachments.map((file, index) => (
                            <li
                              key={index}
                              className="list-group-item d-flex justify-content-between align-items-center"
                            >
                              <div>
                                <i className="fa-solid fa-file me-2"></i>
                                {file.name}
                                <small className="text-muted ms-2">
                                  ({(file.size / 1024).toFixed(2)} KB)
                                </small>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeAttachment(index)}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12">
                  <button type="submit" className="btn btn-primary me-2">
                    <i className="fa-solid fa-circle-check me-2"></i>
                    {isEditMode ? "Update Request" : "Submit Request"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowForm(false);
                      setIsEditMode(false);
                      setSelectedRequest(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Material Requests List - only show when form is hidden */}
        {!showForm && (
          <div className="card">
            <div className="card-body">
              <div className="table-responsive" style={{ overflow: "visible" }}>
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Material</th>
                      <th>Quantity</th>
                      <th>Requested By</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-4">
                          No material requests found. Create a new request to
                          get started.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req._id}>
                          <td>
                            <strong>#{req.requestId}</strong>
                          </td>
                          <td>
                            {req.lineItems && req.lineItems.length > 0
                              ? req.lineItems[0].itemName
                              : "N/A"}
                            {req.lineItems && req.lineItems.length > 1 && (
                              <small className="text-muted">
                                {" "}
                                (+{req.lineItems.length - 1} more)
                              </small>
                            )}
                          </td>
                          <td>
                            {req.lineItems && req.lineItems.length > 0
                              ? `${req.lineItems[0].quantity} ${req.lineItems[0].quantityType}`
                              : "N/A"}
                          </td>
                          <td>{req.requestedBy}</td>
                          <td>{req.department}</td>
                          <td>
                            <span
                              className={`badge ${
                                req.status === "approved"
                                  ? "bg-success"
                                  : req.status === "pending"
                                  ? "bg-warning"
                                  : req.status === "rejected"
                                  ? "bg-danger"
                                  : "bg-secondary"
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td>{new Date(req.date).toLocaleDateString()}</td>
                          <td style={{ position: "relative" }}>
                            <div
                              className="dropdown"
                              style={{ position: "static" }}
                            >
                              <button
                                className="btn btn-sm btn-link text-secondary p-0"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDropdown(req._id);
                                }}
                                style={{ border: "none", background: "none" }}
                              >
                                <i className="fa-solid fa-ellipsis-vertical"></i>
                              </button>
                              {activeDropdown === req._id && (
                                <div
                                  className="dropdown-menu dropdown-menu-end show"
                                  style={{
                                    position: "absolute",
                                    right: 0,
                                    top: "100%",
                                    zIndex: 1050,
                                    minWidth: "160px",
                                  }}
                                >
                                  <button
                                    className="dropdown-item"
                                    onClick={() => handleViewRequest(req)}
                                  >
                                    <i className="fa-solid fa-eye me-2"></i>
                                    View
                                  </button>
                                  {canUserEdit(req) && (
                                    <button
                                      className="dropdown-item"
                                      onClick={() => handleEditRequest(req)}
                                    >
                                      <i className="fa-solid fa-pen-to-square me-2"></i>
                                      Edit
                                    </button>
                                  )}
                                  {isUserApprover(req) &&
                                    req.status === "pending" && (
                                      <>
                                        <div className="dropdown-divider"></div>
                                        <button
                                          className="dropdown-item text-success"
                                          onClick={() =>
                                            handleApproveClick(req)
                                          }
                                        >
                                          <i className="fa-solid fa-check me-2"></i>
                                          Approve
                                        </button>
                                        <button
                                          className="dropdown-item text-danger"
                                          onClick={() => handleRejectClick(req)}
                                        >
                                          <i className="fa-solid fa-times me-2"></i>
                                          Reject
                                        </button>
                                      </>
                                    )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                      <strong>Requested By:</strong>{" "}
                      {selectedRequest.requestedBy}
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

        {/* View Modal */}
        {showViewModal && selectedRequest && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">
                    <i className="fa-solid fa-eye me-2"></i>
                    Material Request Details - #{selectedRequest.requestId}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedRequest(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <strong>Request ID:</strong>{" "}
                      {selectedRequest.requestId || selectedRequest._id}
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
                      <strong>Requested By:</strong>{" "}
                      {selectedRequest.requestedBy}
                    </div>
                    <div className="col-md-6">
                      <strong>Department:</strong> {selectedRequest.department}
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <strong>Date:</strong>{" "}
                      {new Date(
                        selectedRequest.date || selectedRequest.createdAt
                      ).toLocaleDateString()}
                    </div>
                    <div className="col-md-6">
                      <strong>Status:</strong>{" "}
                      <span
                        className={`badge ${
                          selectedRequest.status === "approved"
                            ? "bg-success"
                            : selectedRequest.status === "pending"
                            ? "bg-warning"
                            : selectedRequest.status === "rejected"
                            ? "bg-danger"
                            : "bg-secondary"
                        }`}
                      >
                        {selectedRequest.status}
                      </span>
                    </div>
                  </div>

                  <h6 className="mb-3 mt-4">
                    <i className="fa-solid fa-list me-2"></i>
                    Line Items
                  </h6>
                  <div className="table-responsive">
                    <table className="table table-hover table-striped mb-0">
                      <thead className="table-primary">
                        <tr>
                          <th width="5%" className="text-center">
                            #
                          </th>
                          <th width="25%">Item Name</th>
                          <th width="10%" className="text-center">
                            Quantity
                          </th>
                          <th width="10%">Unit</th>
                          <th width="15%" className="text-end">
                            Unit Price
                          </th>
                          <th width="15%" className="text-end">
                            Total
                          </th>
                          <th width="20%">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedRequest.lineItems || []).map((item, idx) => (
                          <tr key={idx}>
                            <td className="text-center fw-bold">{idx + 1}</td>
                            <td className="fw-bold">{item.itemName}</td>
                            <td className="text-center">{item.quantity}</td>
                            <td>{item.quantityType}</td>
                            <td className="text-end">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="text-end fw-bold text-primary">
                              {formatCurrency(item.quantity * item.amount)}
                            </td>
                            <td>
                              <small>{item.description || "-"}</small>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="table-success">
                        <tr>
                          <th colSpan="5" className="text-end fs-6">
                            Grand Total:
                          </th>
                          <th className="text-end fs-5 text-success">
                            {formatCurrency(
                              (selectedRequest.lineItems || []).reduce(
                                (sum, item) =>
                                  sum + item.quantity * item.amount,
                                0
                              )
                            )}
                          </th>
                          <th></th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Additional Information */}
                  {(selectedRequest.message ||
                    (selectedRequest.attachments &&
                      selectedRequest.attachments.length > 0)) && (
                    <div className="card mb-4">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fa-solid fa-comment-dots me-2"></i>
                          Additional Information
                        </h6>
                      </div>
                      <div className="card-body">
                        {selectedRequest.message && (
                          <div className="mb-3">
                            <label className="text-muted small d-block mb-2">
                              Message/Notes
                            </label>
                            <div className="p-3 bg-light rounded border">
                              <i className="fa-solid fa-quote-left text-muted me-2"></i>
                              {selectedRequest.message}
                            </div>
                          </div>
                        )}

                        {selectedRequest.attachments &&
                          selectedRequest.attachments.length > 0 && (
                            <div>
                              <label className="text-muted small d-block mb-2">
                                <i className="fa-solid fa-paperclip me-1"></i>
                                Attachments (
                                {selectedRequest.attachments.length})
                              </label>
                              <div className="d-flex flex-wrap gap-2">
                                {selectedRequest.attachments.map(
                                  (file, idx) => (
                                    <span
                                      key={idx}
                                      className="badge bg-secondary px-3 py-2"
                                    >
                                      <i className="fa-solid fa-file me-2"></i>
                                      {file}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {selectedRequest.rejectionReason && (
                    <div className="card border-danger mb-4">
                      <div className="card-header bg-danger text-white">
                        <h6 className="mb-0">
                          <i className="fa-solid fa-exclamation-triangle me-2"></i>
                          Rejection Reason
                        </h6>
                      </div>
                      <div className="card-body">
                        <p className="mb-0 text-danger fw-bold">
                          {selectedRequest.rejectionReason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary px-4"
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedRequest(null);
                    }}
                  >
                    <i className="fa-solid fa-times me-2"></i>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaterialRequests;
