import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const Accounting = () => {
  const { user } = useUser();
  const [retirementRequests, setRetirementRequests] = useState([
    {
      id: 1,
      employeeName: "John Smith",
      employeeId: "EMP001",
      department: "Finance",
      userId: "user_123",
      retirementDate: "2025-06-30",
      yearsOfService: 25,
      finalSettlement: 125000,
      advanceRequestId: 1,
      status: "pending",
      submittedDate: "2025-12-10",
    },
    {
      id: 2,
      employeeName: "Sarah Johnson",
      employeeId: "EMP023",
      department: "HR",
      userId: "user_456",
      retirementDate: "2025-08-15",
      yearsOfService: 20,
      finalSettlement: 95000,
      advanceRequestId: 2,
      status: "approved",
      submittedDate: "2025-12-05",
    },
  ]);
  const [advanceRequests, setAdvanceRequests] = useState([
    {
      id: 1,
      employeeName: "Mike Wilson",
      employeeId: "EMP045",
      department: "Sales",
      userId: "user_789",
      amount: 5000,
      reason: "Medical Emergency",
      requestDate: "2025-12-18",
      repaymentPeriod: "6 months",
      status: "approved",
      hasRetirement: false,
    },
    {
      id: 2,
      employeeName: "Emily Brown",
      employeeId: "EMP067",
      department: "Marketing",
      userId: "user_101",
      amount: 3500,
      reason: "Home Repair",
      requestDate: "2025-12-15",
      repaymentPeriod: "4 months",
      status: "approved",
      hasRetirement: false,
    },
  ]);
  const [showRetirementForm, setShowRetirementForm] = useState(false);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [staffList, setStaffList] = useState([
    {
      id: 1,
      name: "Alice Brown",
      email: "alice.brown@company.com",
      role: "Finance Manager",
    },
    {
      id: 2,
      name: "Bob Davis",
      email: "bob.davis@company.com",
      role: "HR Manager",
    },
    {
      id: 3,
      name: "Carol Smith",
      email: "carol.smith@company.com",
      role: "Operations Manager",
    },
    {
      id: 4,
      name: "David Wilson",
      email: "david.wilson@company.com",
      role: "Department Head",
    },
    {
      id: 5,
      name: "Emma Johnson",
      email: "emma.johnson@company.com",
      role: "Supervisor",
    },
  ]);
  const [approverSuggestions, setApproverSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [retirementFormData, setRetirementFormData] = useState({
    retirementDate: "",
    yearsOfService: "",
    finalSettlement: "",
    advanceRequestId: "",
  });
  const [advanceFormData, setAdvanceFormData] = useState({
    amount: "",
    reason: "",
    repaymentPeriod: "",
    approver: "",
    approverEmail: "",
  });

  // Get current user's info
  const currentUserName = user?.fullName || "Current User";
  const currentUserId = user?.id || "user_current";
  const currentEmployeeId = user?.publicMetadata?.employeeId || "EMP999";
  const currentDepartment = user?.publicMetadata?.department || "General";

  // Filter requests to show only current user's requests
  const userRetirementRequests = retirementRequests.filter(
    (req) => req.userId === currentUserId
  );
  const userAdvanceRequests = advanceRequests.filter(
    (req) => req.userId === currentUserId
  );

  // Get approved advances that can be retired
  const eligibleAdvances = userAdvanceRequests.filter(
    (req) => req.status === "approved" && !req.hasRetirement
  );

  // Handle approver name input change with suggestions
  const handleApproverInputChange = (value) => {
    setAdvanceFormData({
      ...advanceFormData,
      approver: value,
    });

    if (value.trim().length > 0) {
      const filtered = staffList.filter((staff) =>
        staff.name.toLowerCase().includes(value.toLowerCase())
      );
      setApproverSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setApproverSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle approver selection from suggestions
  const handleSelectApprover = (staff) => {
    setAdvanceFormData({
      ...advanceFormData,
      approver: staff.name,
      approverEmail: staff.email,
    });
    setShowSuggestions(false);
    setApproverSuggestions([]);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleRetirementSubmit = (e) => {
    e.preventDefault();

    // Check if advance request ID is provided
    const advanceRequest = advanceRequests.find(
      (req) => req.id === parseInt(retirementFormData.advanceRequestId)
    );

    if (!advanceRequest) {
      alert("Please select a valid advance request to retire");
      return;
    }

    const newRequest = {
      id: retirementRequests.length + 1,
      employeeName: currentUserName,
      employeeId: currentEmployeeId,
      department: currentDepartment,
      userId: currentUserId,
      ...retirementFormData,
      advanceRequestId: parseInt(retirementFormData.advanceRequestId),
      status: "pending",
      submittedDate: new Date().toISOString().split("T")[0],
      finalSettlement: parseFloat(retirementFormData.finalSettlement),
      yearsOfService: parseInt(retirementFormData.yearsOfService),
    };

    // Mark the advance as having a retirement request
    setAdvanceRequests(
      advanceRequests.map((req) =>
        req.id === parseInt(retirementFormData.advanceRequestId)
          ? { ...req, hasRetirement: true }
          : req
      )
    );

    setRetirementRequests([...retirementRequests, newRequest]);
    setShowRetirementForm(false);
    setRetirementFormData({
      retirementDate: "",
      yearsOfService: "",
      finalSettlement: "",
      advanceRequestId: "",
    });
  };

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();

    // Validate approver is selected
    if (!advanceFormData.approver || !advanceFormData.approverEmail) {
      toast.error("Approver must be selected");
      return;
    }

    const newRequest = {
      id: advanceRequests.length + 1,
      employeeName: currentUserName,
      employeeId: currentEmployeeId,
      department: currentDepartment,
      userId: currentUserId,
      amount: parseFloat(advanceFormData.amount),
      reason: advanceFormData.reason,
      repaymentPeriod: advanceFormData.repaymentPeriod,
      approver: advanceFormData.approver,
      approverEmail: advanceFormData.approverEmail,
      status: "pending",
      requestDate: new Date().toISOString().split("T")[0],
      hasRetirement: false,
    };

    try {
      // Send email to approver
      await apiService.post("/api/send-approval-email", {
        to: advanceFormData.approverEmail,
        employeeName: currentUserName,
        employeeId: currentEmployeeId,
        department: currentDepartment,
        amount: advanceFormData.amount,
        reason: advanceFormData.reason,
        repaymentPeriod: advanceFormData.repaymentPeriod,
        approver: advanceFormData.approver,
        requestType: "advance",
      });

      setAdvanceRequests([...advanceRequests, newRequest]);
      setShowAdvanceForm(false);
      setAdvanceFormData({
        amount: "",
        reason: "",
        repaymentPeriod: "",
        approver: "",
        approverEmail: "",
      });
      toast.success("Request submitted and email sent to approver");
    } catch (err) {
      toast.error("Failed to submit request");
    }
  };

  return (
    <div className="container-fluid p-4">
      <div className="mb-4">
        <h2 className="mb-2">Accounting Module</h2>
        <p className="text-secondary">
          Manage your retirement and advance expense requests
        </p>
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          <strong>Note:</strong> You can only view and manage your own requests.
          Retirement requests can only be made for approved advances.
        </div>
      </div>

      <div className="row g-4">
        {/* Advance Expense Request Card */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">
                  <i className="bi bi-cash-coin me-2"></i>Advance Expense
                  Requests
                </h5>
              </div>
              <button
                className="btn btn-light btn-sm"
                onClick={() => setShowAdvanceForm(!showAdvanceForm)}
              >
                <i className="bi bi-plus-circle me-1"></i>
                {showAdvanceForm ? "Cancel" : "New Request"}
              </button>
            </div>
            <div className="card-body">
              {showAdvanceForm && (
                <div className="border rounded p-3 mb-3 bg-light">
                  <h6 className="mb-3">New Advance Request</h6>
                  <form onSubmit={handleAdvanceSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Employee Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={currentUserName}
                        disabled
                      />
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Employee ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={currentEmployeeId}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Department</label>
                        <input
                          type="text"
                          className="form-control"
                          value={currentDepartment}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Approver <span className="text-danger">*</span>
                      </label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Start typing approver name..."
                          value={advanceFormData.approver}
                          onChange={(e) =>
                            handleApproverInputChange(e.target.value)
                          }
                          onFocus={() => {
                            if (approverSuggestions.length > 0) {
                              setShowSuggestions(true);
                            }
                          }}
                          required
                          autoComplete="off"
                        />
                        {showSuggestions && approverSuggestions.length > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              backgroundColor: "white",
                              border: "1px solid #ddd",
                              borderTop: "none",
                              borderRadius: "0 0 4px 4px",
                              maxHeight: "200px",
                              overflowY: "auto",
                              zIndex: 1000,
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            {approverSuggestions.map((staff) => (
                              <div
                                key={staff.id}
                                onClick={() => handleSelectApprover(staff)}
                                style={{
                                  padding: "10px 12px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #eee",
                                  transition: "background-color 0.2s",
                                }}
                                onMouseEnter={(e) =>
                                  (e.target.style.backgroundColor = "#f8f9fa")
                                }
                                onMouseLeave={(e) =>
                                  (e.target.style.backgroundColor = "white")
                                }
                              >
                                <div style={{ fontWeight: "500" }}>
                                  {staff.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#666",
                                  }}
                                >
                                  {staff.role}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Approver Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="approver@example.com"
                        value={advanceFormData.approverEmail}
                        onChange={(e) =>
                          setAdvanceFormData({
                            ...advanceFormData,
                            approverEmail: e.target.value,
                          })
                        }
                        readOnly={
                          advanceFormData.approverEmail &&
                          staffList.some(
                            (s) =>
                              s.name === advanceFormData.approver &&
                              s.email === advanceFormData.approverEmail
                          )
                        }
                        required
                      />
                      {advanceFormData.approverEmail &&
                        staffList.some(
                          (s) =>
                            s.name === advanceFormData.approver &&
                            s.email === advanceFormData.approverEmail
                        ) && (
                          <small className="text-success d-block mt-1">
                            <i className="bi bi-check-circle me-1"></i>
                            Auto-filled from staff database
                          </small>
                        )}
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Advance Amount <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={advanceFormData.amount}
                          onChange={(e) =>
                            setAdvanceFormData({
                              ...advanceFormData,
                              amount: e.target.value,
                            })
                          }
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Repayment Period{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={advanceFormData.repaymentPeriod}
                          onChange={(e) =>
                            setAdvanceFormData({
                              ...advanceFormData,
                              repaymentPeriod: e.target.value,
                            })
                          }
                          required
                        >
                          <option value="">Select Period</option>
                          <option value="3 months">3 months</option>
                          <option value="6 months">6 months</option>
                          <option value="9 months">9 months</option>
                          <option value="12 months">12 months</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Reason <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={advanceFormData.reason}
                        onChange={(e) =>
                          setAdvanceFormData({
                            ...advanceFormData,
                            reason: e.target.value,
                          })
                        }
                        placeholder="e.g., Medical Emergency, Home Repair"
                        required
                      ></textarea>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-primary btn-sm">
                        <i className="bi bi-check-circle me-1"></i>Submit
                        Request
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowAdvanceForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Period</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAdvanceRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-3">
                          No advance requests found
                        </td>
                      </tr>
                    ) : (
                      userAdvanceRequests.map((request) => (
                        <tr key={request.id}>
                          <td>
                            <strong className="text-primary">
                              {formatCurrency(request.amount)}
                            </strong>
                          </td>
                          <td>{request.reason}</td>
                          <td>
                            <small>{request.repaymentPeriod}</small>
                          </td>
                          <td>
                            <small>{request.requestDate}</small>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                request.status === "approved"
                                  ? "bg-success"
                                  : request.status === "rejected"
                                  ? "bg-danger"
                                  : "bg-warning"
                              }`}
                            >
                              {request.status}
                            </span>
                            {request.hasRetirement && (
                              <span className="badge bg-info ms-1">
                                <i className="bi bi-clock-history"></i> Retiring
                              </span>
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
        </div>

        {/* Retirement Card */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">
                  <i className="bi bi-calendar-check me-2"></i>Retirement
                  Requests
                </h5>
              </div>
              <button
                className="btn btn-light btn-sm"
                onClick={() => setShowRetirementForm(!showRetirementForm)}
                disabled={eligibleAdvances.length === 0}
                title={
                  eligibleAdvances.length === 0
                    ? "No approved advances available to retire"
                    : ""
                }
              >
                <i className="bi bi-plus-circle me-1"></i>
                {showRetirementForm ? "Cancel" : "New Request"}
              </button>
            </div>
            <div className="card-body">
              {eligibleAdvances.length === 0 && !showRetirementForm && (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  You need an approved advance request before creating a
                  retirement request.
                </div>
              )}

              {showRetirementForm && (
                <div className="border rounded p-3 mb-3 bg-light">
                  <h6 className="mb-3">New Retirement Request</h6>
                  <form onSubmit={handleRetirementSubmit}>
                    <div className="mb-3">
                      <label className="form-label">Employee Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={currentUserName}
                        disabled
                      />
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">Employee ID</label>
                        <input
                          type="text"
                          className="form-control"
                          value={currentEmployeeId}
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Department</label>
                        <input
                          type="text"
                          className="form-control"
                          value={currentDepartment}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Select Advance to Retire{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={retirementFormData.advanceRequestId}
                        onChange={(e) =>
                          setRetirementFormData({
                            ...retirementFormData,
                            advanceRequestId: e.target.value,
                          })
                        }
                        required
                      >
                        <option value="">Choose advance request...</option>
                        {eligibleAdvances.map((advance) => (
                          <option key={advance.id} value={advance.id}>
                            {formatCurrency(advance.amount)} - {advance.reason}{" "}
                            ({advance.requestDate})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">
                          Retirement Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={retirementFormData.retirementDate}
                          onChange={(e) =>
                            setRetirementFormData({
                              ...retirementFormData,
                              retirementDate: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          Years of Service{" "}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          value={retirementFormData.yearsOfService}
                          onChange={(e) =>
                            setRetirementFormData({
                              ...retirementFormData,
                              yearsOfService: e.target.value,
                            })
                          }
                          min="0"
                          required
                        />
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">
                        Final Settlement Amount{" "}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={retirementFormData.finalSettlement}
                        onChange={(e) =>
                          setRetirementFormData({
                            ...retirementFormData,
                            finalSettlement: e.target.value,
                          })
                        }
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-success btn-sm">
                        <i className="bi bi-check-circle me-1"></i>Submit
                        Request
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowRetirementForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-sm table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Retirement Date</th>
                      <th>Years</th>
                      <th>Settlement</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRetirementRequests.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center text-muted py-3">
                          No retirement requests found
                        </td>
                      </tr>
                    ) : (
                      userRetirementRequests.map((request) => {
                        const linkedAdvance = advanceRequests.find(
                          (adv) => adv.id === request.advanceRequestId
                        );
                        return (
                          <tr key={request.id}>
                            <td>
                              <small>{request.retirementDate}</small>
                            </td>
                            <td>{request.yearsOfService} yrs</td>
                            <td>
                              <strong className="text-success">
                                {formatCurrency(request.finalSettlement)}
                              </strong>
                            </td>
                            <td>
                              <small>{request.submittedDate}</small>
                            </td>
                            <td>
                              <span
                                className={`badge ${
                                  request.status === "approved"
                                    ? "bg-success"
                                    : request.status === "rejected"
                                    ? "bg-danger"
                                    : "bg-warning"
                                }`}
                              >
                                {request.status}
                              </span>
                              {linkedAdvance && (
                                <div className="small text-muted mt-1">
                                  <i className="bi bi-link-45deg"></i>{" "}
                                  {formatCurrency(linkedAdvance.amount)}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounting;
