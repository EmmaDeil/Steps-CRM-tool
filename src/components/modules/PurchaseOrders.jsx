import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { NumericFormat } from "react-number-format";
import { formatCurrency } from "../../services/currency";

const PurchaseOrders = () => {
  const { user } = useUser();
  const [orders, setOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingPO, setReviewingPO] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [formData, setFormData] = useState({
    requester: "",
    approver: "",
    vendor: "",
    orderDate: new Date().toISOString().split("T")[0],
    deliveryDate: "",
    status: "draft",
  });
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  const approverList = [
    "John Doe - Procurement Manager",
    "Jane Smith - Department Head",
    "Bob Johnson - Operations Manager",
    "Alice Brown - Finance Manager",
    "Mike Wilson - General Manager",
    "Sarah Davis - HR Manager",
    "Tom Anderson - IT Manager",
  ];

  const userList = [
    { id: 1, name: "John Doe", role: "Procurement Manager" },
    { id: 2, name: "Jane Smith", role: "Department Head" },
    { id: 3, name: "Bob Johnson", role: "Operations Manager" },
    { id: 4, name: "Alice Brown", role: "Finance Manager" },
    { id: 5, name: "Mike Wilson", role: "General Manager" },
    { id: 6, name: "Sarah Davis", role: "HR Manager" },
    { id: 7, name: "Tom Anderson", role: "IT Manager" },
  ];
  const [lineItems, setLineItems] = useState([
    {
      itemName: "",
      description: "",
      quantity: "",
      unit: "pcs",
      unitPrice: "",
      total: 0,
    },
  ]);

  useEffect(() => {
    fetchOrders();
    fetchVendors();
  }, []);

  const handleReviewPO = (po) => {
    setReviewingPO(po);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    try {
      await apiService.post(`/api/purchase-orders/${reviewingPO._id}/review`, {
        lineItems: reviewingPO.lineItems,
        vendor: reviewingPO.vendor,
        deliveryDate: reviewingPO.deliveryDate,
        reviewNotes: reviewNotes,
      });
      toast.success("Purchase order reviewed and sent to Finance!");
      setShowReviewModal(false);
      setReviewingPO(null);
      setReviewNotes("");
      fetchOrders();
    } catch {
      toast.error("Failed to submit review");
    }
  };

  const handleReviewLineItemChange = (index, field, value) => {
    const updatedItems = [...reviewingPO.lineItems];
    updatedItems[index][field] = value;

    // Calculate total for the line item
    if (field === "quantity" || field === "unitPrice") {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const unitPrice = parseFloat(updatedItems[index].unitPrice) || 0;
      updatedItems[index].total = quantity * unitPrice;
    }

    setReviewingPO({ ...reviewingPO, lineItems: updatedItems });
  };

  const handleAddReviewLineItem = () => {
    setReviewingPO({
      ...reviewingPO,
      lineItems: [
        ...reviewingPO.lineItems,
        {
          itemName: "",
          description: "",
          quantity: "",
          unit: "pcs",
          unitPrice: "",
          total: 0,
        },
      ],
    });
  };

  const handleRemoveReviewLineItem = (index) => {
    if (reviewingPO.lineItems.length > 1) {
      setReviewingPO({
        ...reviewingPO,
        lineItems: reviewingPO.lineItems.filter((_, i) => i !== index),
      });
    }
  };

  const calculateReviewGrandTotal = () => {
    return (
      reviewingPO?.lineItems.reduce(
        (sum, item) => sum + (item.total || 0),
        0
      ) || 0
    );
  };

  const fetchVendors = async () => {
    try {
      const response = await apiService.get("/api/vendors");
      setVendors(response.data || []);
    } catch {
      // Silently fail - vendors are optional
    }
  };

  useEffect(() => {
    if (showForm && user) {
      setFormData((prev) => ({
        ...prev,
        requester: user.fullName || user.firstName || "Current User",
      }));
    }
  }, [showForm, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/purchase-orders");
      setOrders(response.data || []);
      setError(null);
    } catch {
      setError("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  const handleLineItemChange = (index, field, value) => {
    const updatedItems = [...lineItems];
    updatedItems[index][field] = value;

    // Calculate total for the line item
    if (field === "quantity" || field === "unitPrice") {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const unitPrice = parseFloat(updatedItems[index].unitPrice) || 0;
      updatedItems[index].total = quantity * unitPrice;
    }

    setLineItems(updatedItems);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        itemName: "",
        description: "",
        quantity: "",
        unit: "pcs",
        unitPrice: "",
        total: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
      handleAddLineItem();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments([...attachments, ...files]);
    e.target.value = null;
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleMessageChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setMessage(value);
    setCursorPosition(cursorPos);

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

  const calculateGrandTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.requester ||
      !formData.approver ||
      !formData.vendor ||
      !formData.orderDate
    ) {
      alert("Please fill in all required fields");
      return;
    }

    if (lineItems.every((item) => !item.itemName)) {
      alert("Please add at least one line item");
      return;
    }

    const poData = {
      ...formData,
      lineItems: lineItems.filter((item) => item.itemName),
      totalAmount: calculateGrandTotal(),
      message,
      attachments: attachments.map((file) => file.name),
    };

    try {
      await apiService.post("/api/purchase-orders", poData);
      alert("Purchase order created successfully!");
      setShowForm(false);
      resetForm();
      fetchOrders();
    } catch {
      alert("Failed to create purchase order. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      requester: "",
      approver: "",
      vendor: "",
      orderDate: new Date().toISOString().split("T")[0],
      deliveryDate: "",
      status: "draft",
    });
    setLineItems([
      {
        itemName: "",
        description: "",
        quantity: "",
        unit: "pcs",
        unitPrice: "",
        total: 0,
      },
    ]);
    setMessage("");
    setAttachments([]);
  };

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((order) => order.status === filterStatus);

  // Use centralized currency formatter

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="text-center">Loading purchase orders...</div>
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
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Purchase Orders", icon: "fa-file-invoice" },
        ]}
      />
      {showForm ? (
        <div className="card">
          <div className="card-header bg-primary text-white">
            <h4 className="mb-0">Create Purchase Order</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">
                    Requester <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.requester}
                    disabled
                    style={{ backgroundColor: "#e9ecef" }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">
                    Approver <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.approver}
                    onChange={(e) =>
                      setFormData({ ...formData, approver: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Approver</option>
                    {approverList.map((approver, index) => (
                      <option key={index} value={approver}>
                        {approver}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">
                    Vendor <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.name}>
                        {vendor.name} - {vendor.category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">
                    Order Date <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.orderDate}
                    onChange={(e) =>
                      setFormData({ ...formData, orderDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Expected Delivery Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Line Items</label>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "25%" }}>Item Name</th>
                        <th style={{ width: "25%" }}>Description</th>
                        <th style={{ width: "10%" }}>Quantity</th>
                        <th style={{ width: "10%" }}>Unit</th>
                        <th style={{ width: "12%" }}>Unit Price</th>
                        <th style={{ width: "12%" }}>Total</th>
                        <th style={{ width: "6%" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.itemName}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "itemName",
                                  e.target.value
                                )
                              }
                              onKeyDown={handleKeyDown}
                              placeholder="Item name"
                            />
                          </td>
                          <td>
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
                              onKeyDown={handleKeyDown}
                              placeholder="Description"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              onKeyDown={handleKeyDown}
                              placeholder="0"
                              min="0"
                              step="any"
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.unit}
                              onChange={(e) =>
                                handleLineItemChange(
                                  index,
                                  "unit",
                                  e.target.value
                                )
                              }
                            >
                              <option value="pcs">pcs</option>
                              <option value="kg">kg</option>
                              <option value="lbs">lbs</option>
                              <option value="m">m</option>
                              <option value="ft">ft</option>
                              <option value="box">box</option>
                              <option value="carton">carton</option>
                              <option value="dozen">dozen</option>
                            </select>
                          </td>
                          <td>
                            <NumericFormat
                              className="form-control form-control-sm"
                              value={item.unitPrice}
                              thousandSeparator
                              allowNegative={false}
                              decimalScale={2}
                              fixedDecimalScale
                              placeholder="0.00"
                              onValueChange={(values) => {
                                const { value } = values;
                                handleLineItemChange(index, "unitPrice", value);
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={formatCurrency(item.total)}
                              readOnly
                              style={{ backgroundColor: "#f8f9fa" }}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleRemoveLineItem(index)}
                              disabled={lineItems.length === 1}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="5" className="text-end">
                          <strong>Grand Total:</strong>
                        </td>
                        <td colSpan="2">
                          <strong className="text-primary">
                            {formatCurrency(calculateGrandTotal())}
                          </strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleAddLineItem}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Line Item
                </button>
                <small className="text-muted ms-3">
                  Tip: Press Enter to add a new line item
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label">Message & Attachments</label>
                <div className="position-relative">
                  <textarea
                    className="form-control"
                    rows="3"
                    value={message}
                    onChange={handleMessageChange}
                    placeholder="Type your message here. Use @ to mention someone..."
                    style={{ paddingRight: "45px" }}
                  ></textarea>
                  <label
                    htmlFor="file-input"
                    className="btn btn-link position-absolute"
                    style={{
                      top: "10px",
                      right: "10px",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                    title="Attach files"
                  >
                    <i className="bi bi-paperclip"></i>
                  </label>
                  <input
                    id="file-input"
                    type="file"
                    className="d-none"
                    multiple
                    onChange={handleFileChange}
                  />
                  {showMentionDropdown && filteredUsers.length > 0 && (
                    <div
                      className="position-absolute bg-white border rounded shadow-sm"
                      style={{
                        bottom: "100%",
                        left: 0,
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        minWidth: "250px",
                      }}
                    >
                      <div className="list-group list-group-flush">
                        {filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="list-group-item list-group-item-action"
                            onClick={() => selectMention(user.name)}
                          >
                            <div>
                              <strong>{user.name}</strong>
                            </div>
                            <small className="text-muted">{user.role}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="d-flex justify-content-between align-items-center border rounded p-2 mb-2 bg-light"
                      >
                        <div className="d-flex align-items-center">
                          <i className="bi bi-file-earmark me-2 text-primary"></i>
                          <span className="me-2">{file.name}</span>
                          <small className="text-muted">
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-circle me-2"></i>
                  Create Purchase Order
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4 p-4">
            <h2>Purchase Orders</h2>
            <div className="d-flex gap-2">
              {/* Filter Dropdown */}
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
                      All Orders
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "draft" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("draft")}
                    >
                      <span className="badge bg-secondary me-2">●</span>Draft
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "submitted" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("submitted")}
                    >
                      <span className="badge bg-info me-2">●</span>Submitted
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
                        filterStatus === "received" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("received")}
                    >
                      <span className="badge bg-primary me-2">●</span>Received
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item ${
                        filterStatus === "cancelled" ? "active" : ""
                      }`}
                      onClick={() => setFilterStatus("cancelled")}
                    >
                      <span className="badge bg-danger me-2">●</span>Cancelled
                    </button>
                  </li>
                </ul>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create PO
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Vendor</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Status</th>
                      <th>Order Date</th>
                      <th>Delivery Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted py-4">
                          No purchase orders found. Create a new purchase order
                          to get started.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>{order.poNumber}</strong>
                          </td>
                          <td>{order.vendor}</td>
                          <td>{order.items}</td>
                          <td>
                            <strong>
                              {formatCurrency(
                                order.amount || order.totalAmount || 0
                              )}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                order.status === "approved" ||
                                order.status === "received"
                                  ? "bg-success"
                                  : order.status === "submitted"
                                  ? "bg-info"
                                  : order.status === "draft"
                                  ? "bg-secondary"
                                  : order.status === "cancelled"
                                  ? "bg-danger"
                                  : "bg-warning"
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td>{order.orderDate}</td>
                          <td>{order.deliveryDate || "N/A"}</td>
                          <td>
                            <button className="btn btn-sm btn-outline-primary me-2">
                              View
                            </button>
                            {order.status === "draft" && (
                              <>
                                <button
                                  className="btn btn-sm btn-primary me-2"
                                  onClick={() => handleReviewPO(order)}
                                >
                                  <i className="bi bi-pencil-square me-1"></i>
                                  Review
                                </button>
                                <button className="btn btn-sm btn-danger">
                                  Cancel
                                </button>
                              </>
                            )}
                            {order.status === "payment_pending" && (
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-clock me-1"></i>
                                Awaiting Finance
                              </span>
                            )}
                            {order.status === "paid" && (
                              <button className="btn btn-sm btn-success me-2">
                                <i className="bi bi-check-circle me-1"></i>
                                Mark Received
                              </button>
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
        </>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewingPO && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="bi bi-clipboard-check me-2"></i>
                  Review Purchase Order - {reviewingPO.poNumber}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewingPO(null);
                    setReviewNotes("");
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">
                      <strong>PO Number:</strong>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={reviewingPO.poNumber}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      <strong>Requester:</strong>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={reviewingPO.requester}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      <strong>Approver:</strong>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={reviewingPO.approver}
                      disabled
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">
                      <strong>
                        Vendor <span className="text-danger">*</span>
                      </strong>
                    </label>
                    <select
                      className="form-select"
                      value={reviewingPO.vendor}
                      onChange={(e) =>
                        setReviewingPO({
                          ...reviewingPO,
                          vendor: e.target.value,
                        })
                      }
                    >
                      <option value="">Select vendor...</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.name}>
                          {vendor.name} - {vendor.category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      <strong>Order Date:</strong>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={reviewingPO.orderDate}
                      disabled
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">
                      <strong>Delivery Date:</strong>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={reviewingPO.deliveryDate || ""}
                      onChange={(e) =>
                        setReviewingPO({
                          ...reviewingPO,
                          deliveryDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <hr />

                <h6 className="mb-3">
                  <i className="bi bi-list-ul me-2"></i>
                  Line Items
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary float-end"
                    onClick={handleAddReviewLineItem}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Item
                  </button>
                </h6>

                <div className="table-responsive mb-3">
                  <table className="table table-bordered">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "20%" }}>Item Name</th>
                        <th style={{ width: "25%" }}>Description</th>
                        <th style={{ width: "10%" }}>Quantity</th>
                        <th style={{ width: "10%" }}>Unit</th>
                        <th style={{ width: "12%" }}>Unit Price</th>
                        <th style={{ width: "13%" }}>Total</th>
                        <th style={{ width: "10%" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewingPO.lineItems.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.itemName}
                              onChange={(e) =>
                                handleReviewLineItemChange(
                                  index,
                                  "itemName",
                                  e.target.value
                                )
                              }
                              placeholder="Item name"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={item.description}
                              onChange={(e) =>
                                handleReviewLineItemChange(
                                  index,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Description"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={(e) =>
                                handleReviewLineItemChange(
                                  index,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              placeholder="Qty"
                            />
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm"
                              value={item.unit}
                              onChange={(e) =>
                                handleReviewLineItemChange(
                                  index,
                                  "unit",
                                  e.target.value
                                )
                              }
                            >
                              <option value="pcs">pcs</option>
                              <option value="box">box</option>
                              <option value="carton">carton</option>
                              <option value="kg">kg</option>
                              <option value="liter">liter</option>
                              <option value="meter">meter</option>
                            </select>
                          </td>
                          <td>
                            <NumericFormat
                              className="form-control form-control-sm"
                              value={item.unitPrice}
                              thousandSeparator
                              allowNegative={false}
                              decimalScale={2}
                              fixedDecimalScale
                              placeholder="Price"
                              onValueChange={(values) => {
                                const { value } = values;
                                handleReviewLineItemChange(
                                  index,
                                  "unitPrice",
                                  value
                                );
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={formatCurrency(item.total || 0)}
                              disabled
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveReviewLineItem(index)}
                              disabled={reviewingPO.lineItems.length === 1}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-secondary">
                        <td colSpan="5" className="text-end fw-bold">
                          Grand Total:
                        </td>
                        <td className="fw-bold">
                          {formatCurrency(calculateReviewGrandTotal())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    <strong>Review Notes / Corrections:</strong>
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter any corrections, additions, or notes about this review..."
                  ></textarea>
                </div>

                {reviewingPO.message && (
                  <div className="mb-3">
                    <label className="form-label">
                      <strong>Original Message:</strong>
                    </label>
                    <div className="p-2 bg-light rounded">
                      {reviewingPO.message}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewingPO(null);
                    setReviewNotes("");
                  }}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleSubmitReview}
                  disabled={
                    !reviewingPO.vendor ||
                    reviewingPO.lineItems.every((item) => !item.itemName)
                  }
                >
                  <i className="bi bi-send me-2"></i>
                  Submit to Finance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
