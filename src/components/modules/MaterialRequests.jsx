import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const MaterialRequests = () => {
  const { user } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [vendors, setVendors] = useState([]);

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

  // User list for mentions (can be fetched from backend)
  const userList = [
    { id: 1, name: "John Doe", role: "Procurement Manager" },
    { id: 2, name: "Jane Smith", role: "Department Head" },
    { id: 3, name: "Bob Johnson", role: "Operations Manager" },
    { id: 4, name: "Alice Brown", role: "Finance Manager" },
    { id: 5, name: "Mike Wilson", role: "General Manager" },
    { id: 6, name: "Sarah Davis", role: "HR Manager" },
    { id: 7, name: "Tom Anderson", role: "IT Manager" },
  ];

  // Item and quantity type options (can be fetched from backend)
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

  const departmentOptions = [
    "Administration",
    "Human Resources",
    "Finance",
    "Operations",
    "Procurement",
    "IT Department",
    "Sales & Marketing",
    "Customer Service",
    "Research & Development",
    "Maintenance",
  ];

  const previousStateRef = useRef(null);

  const fetchVendors = async () => {
    try {
      const response = await apiService.get("/api/vendors");
      setVendors(response.data || []);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    }
  };

  const fetchRequestForApproval = async (requestId) => {
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
    } catch (err) {
      console.error("Failed to fetch request:", err);
      toast.error("Failed to load request");
    }
  };

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
    } catch (err) {
      console.error("Failed to approve request:", err);
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
    } catch (err) {
      console.error("Failed to reject request:", err);
      toast.error("Failed to reject request");
    }
  };

  useEffect(() => {
    fetchRequests();

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
      } catch (err) {
        console.error("Failed to restore state:", err);
      }
    }
  }, []);

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
    } catch (err) {
      console.error("Failed to fetch material requests:", err);
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

      await apiService.post("/api/material-requests", requestData);
      toast.success("Material request submitted successfully!");

      // Reset form state
      setShowForm(false);
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
    } catch (err) {
      console.error("Failed to submit request:", err);
      toast.error("Failed to submit request");
    }
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
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2></h2>
        <div className="d-flex gap-2">
          {/* Filter Dropdown - only show when viewing list */}
          {!showForm && (
            <div className="dropdown">
              <button
                className="btn btn-outline-secondary dropdown-toggle"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <i className="bi bi-funnel me-2"></i>
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
              <i className="bi bi-plus-circle me-2"></i>
              New Request
            </button>
          )}
        </div>
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-file-earmark-text me-2"></i>
              New Material Request
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
                    className="form-select"
                    name="approver"
                    value={formData.approver}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select approver</option>
                    <option value="John Doe">
                      John Doe - Procurement Manager
                    </option>
                    <option value="Jane Smith">
                      Jane Smith - Department Head
                    </option>
                    <option value="Bob Johnson">
                      Bob Johnson - Operations Manager
                    </option>
                    <option value="Alice Brown">
                      Alice Brown - Finance Manager
                    </option>
                    <option value="Mike Wilson">
                      Mike Wilson - General Manager
                    </option>
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
                    className="form-select"
                    name="requestType"
                    value={formData.requestType}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="urgent">Urgent</option>
                    <option value="normal">Normal</option>
                    <option value="low-priority">Low Priority</option>
                    <option value="bulk-order">Bulk Order</option>
                    <option value="replacement">Replacement</option>
                  </select>
                </div>

                {/* Third Row: Department */}
                <div className="col-md-12 mb-3">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                  >
                    <option value="">Select department</option>
                    {departmentOptions.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mb-4">
                <h6 className="mb-3">
                  <i className="bi bi-list-ul me-2"></i>
                  Line Items
                </h6>
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
                        {/* <th
                          style={{
                            width: "5%",
                            padding: "12px 8px",
                            fontWeight: 600,
                          }}
                        >
                          #
                        </th> */}
                        <th
                          style={{
                            width: "23%",
                            padding: "12px 8px",
                            fontWeight: 600,
                          }}
                        >
                          Item Name *
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
                            width: "10%",
                            padding: "12px 8px",
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          Qty *
                        </th>
                        <th
                          style={{
                            width: "13%",
                            padding: "12px 8px",
                            fontWeight: 600,
                          }}
                        >
                          Unit *
                        </th>
                        <th
                          style={{
                            width: "12%",
                            padding: "12px 8px",
                            fontWeight: 600,
                            textAlign: "right",
                          }}
                        >
                          Price ($)
                        </th>
                        <th
                          style={{
                            width: "12%",
                            padding: "12px 8px",
                            fontWeight: 600,
                            textAlign: "right",
                          }}
                        >
                          Total ($)
                        </th>
                        <th
                          style={{
                            width: "7%",
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
                          {/* <td
                            style={{
                              padding: "10px 8px",
                              verticalAlign: "middle",
                              textAlign: "center",
                              fontWeight: 500,
                              color: "#6c757d",
                            }}
                          >
                            {index + 1}
                          </td> */}
                          <td style={{ padding: "10px 8px" }}>
                            <select
                              className="form-select form-select-sm"
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
                              className="form-control form-control-sm"
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
                              className="form-control form-control-sm text-center"
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
                              className="form-select form-select-sm"
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
                              <span
                                className="input-group-text"
                                style={{ fontSize: "0.85rem" }}
                              >
                                $
                              </span>
                              <input
                                type="number"
                                className="form-control form-control-sm text-end"
                                value={item.amount}
                                onChange={(e) =>
                                  handleLineItemChange(
                                    index,
                                    "amount",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                style={{ fontSize: "0.9rem" }}
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
                            $
                            {(
                              (parseFloat(item.quantity) || 0) *
                              (parseFloat(item.amount) || 0)
                            ).toFixed(2)}
                          </td>
                          <td
                            style={{ padding: "10px 8px", textAlign: "center" }}
                          >
                            {lineItems.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removeLineItem(index)}
                                title="Remove line"
                                style={{ padding: "4px 8px" }}
                              >
                                <i className="bi bi-trash"></i>
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
                          $
                          {lineItems
                            .reduce(
                              (sum, item) =>
                                sum +
                                (parseFloat(item.quantity) || 0) *
                                  (parseFloat(item.amount) || 0),
                              0
                            )
                            .toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Press <kbd>Enter</kbd> in any field to add a new line item
                  </small>
                </div>
              </div>

              {/* Message & Attachments Section */}
              <div className="mb-4">
                <h6 className="mb-3">
                  <i className="bi bi-chat-left-text me-2"></i>
                  Message & Attachments
                </h6>
                <div
                  className="border rounded p-3"
                  style={{ backgroundColor: "#f8f9fa", position: "relative" }}
                >
                  <div className="position-relative">
                    <textarea
                      className="form-control"
                      rows="4"
                      placeholder="Add a message or note... Type @ to mention someone"
                      value={message}
                      onChange={handleMessageChange}
                      style={{ paddingRight: "50px" }}
                    />
                    <label
                      htmlFor="attachmentInput"
                      className="position-absolute"
                      style={{
                        top: "10px",
                        right: "10px",
                        cursor: "pointer",
                        padding: "5px",
                        backgroundColor: "#ffffff",
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                      }}
                      title="Attach files"
                    >
                      <i className="bi bi-paperclip fs-5 text-primary"></i>
                    </label>
                    <input
                      type="file"
                      id="attachmentInput"
                      multiple
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      style={{ display: "none" }}
                    />
                  </div>

                  {/* @Mention Dropdown */}
                  {showMentionDropdown && filteredUsers.length > 0 && (
                    <div
                      className="dropdown-menu show position-absolute mt-1"
                      style={{
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        width: "300px",
                      }}
                    >
                      {filteredUsers.map((user) => (
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
                      ))}
                    </div>
                  )}

                  {/* Attached Files List */}
                  {attachments.length > 0 && (
                    <div className="mt-3">
                      <strong className="d-block mb-2">Attached Files:</strong>
                      <ul className="list-group">
                        {attachments.map((file, index) => (
                          <li
                            key={index}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <i className="bi bi-file-earmark me-2"></i>
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
                              <i className="bi bi-x-lg"></i>
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
                  <i className="bi bi-check-circle me-2"></i>
                  Submit Request
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForm(false)}
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
            <div className="table-responsive">
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
                        No material requests found. Create a new request to get
                        started.
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
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-2">
                            View
                          </button>
                          {req.status === "pending" && (
                            <>
                              <button className="btn btn-sm btn-success me-2">
                                Approve
                              </button>
                              <button className="btn btn-sm btn-danger">
                                Reject
                              </button>
                            </>
                          )}
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
                  <i className="bi bi-clipboard-check me-2"></i>
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
                  <i className="bi bi-list-ul me-2"></i>Line Items
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
                          <td>₦{item.amount?.toLocaleString() || 0}</td>
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
                            <i className="bi bi-file-earmark me-1"></i>
                            {file}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <hr />

                <h6 className="mb-3 text-success">
                  <i className="bi bi-check-circle me-2"></i>
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
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRejectRequest}
                  disabled={!rejectionReason.trim()}
                >
                  <i className="bi bi-x-lg me-2"></i>
                  Reject Request
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleApproveRequest}
                  disabled={!selectedVendor}
                >
                  <i className="bi bi-check-lg me-2"></i>
                  Approve & Create PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialRequests;
