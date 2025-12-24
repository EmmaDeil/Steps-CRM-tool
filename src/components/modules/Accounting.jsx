import React, { useState } from "react";
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
  const [staffList] = useState([
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
    approver: "",
    approverEmail: "",
    currency: "USD",
    purpose: "",
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

  // Get approver suggestions and handle form

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
      approver: advanceFormData.approver,
      approverEmail: advanceFormData.approverEmail,
      currency: advanceFormData.currency,
      purpose: advanceFormData.purpose,
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
        currency: advanceFormData.currency,
        reason: advanceFormData.reason,
        purpose: advanceFormData.purpose,
        approver: advanceFormData.approver,
        requestType: "advance",
      });

      setAdvanceRequests([...advanceRequests, newRequest]);
      setShowAdvanceForm(false);
      setAdvanceFormData({
        amount: "",
        reason: "",
        approver: "",
        approverEmail: "",
        currency: "USD",
        purpose: "",
      });
      toast.success("Request submitted and email sent to approver");
    } catch {
      toast.error("Failed to submit request");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0f172a] dark:to-[#1e293b] p-6 space-y-6">
      {/* Header */}
      <div className="mb-8 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-[#111418] dark:text-white mb-2">
          <i className="fa-solid fa-calculator mr-3 text-blue-600"></i>
          Accounting Module
        </h2>
        <p className="text-[#617589] dark:text-gray-400 text-lg">
          Manage your retirement and advance expense requests with ease
        </p>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <i className="fa-solid fa-wallet text-blue-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Advance Requests
              </p>
              <p className="text-2xl font-bold text-[#111418] dark:text-white">
                {userAdvanceRequests.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <i className="fa-solid fa-handshake text-purple-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Retirement Requests
              </p>
              <p className="text-2xl font-bold text-[#111418] dark:text-white">
                {userRetirementRequests.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <i className="fa-solid fa-history text-orange-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Total Records
              </p>
              <p className="text-2xl font-bold text-[#111418] dark:text-white">
                {userAdvanceRequests.length + userRetirementRequests.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advance Expense Request Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-[#111418] dark:text-white flex items-center gap-2 justify-center mb-2">
                <i className="fa-solid fa-wallet text-blue-600 text-2xl"></i>
                Advance Expense
              </h3>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Request an advance for expenses
              </p>
            </div>
            <button
              onClick={() => setShowAdvanceForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 justify-center w-full"
            >
              <i className="fa-solid fa-plus text-lg"></i>
              New Request
            </button>
          </div>
        </div>

        {/* Retirement Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-[#111418] dark:text-white flex items-center gap-2 mb-1">
                <i className="fa-solid fa-handshake text-purple-600 text-2xl"></i>
                Retirement
              </h3>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Manage retirement requests
              </p>
            </div>
            <button
              onClick={() => setShowRetirementForm(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-sm rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2"
            >
              <i className="fa-solid fa-plus"></i>
              New Request
            </button>
          </div>
          <div className="space-y-2">
            {userRetirementRequests.length === 0 ? (
              <p className="text-center py-8 text-[#617589] dark:text-gray-400">
                No requests yet
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userRetirementRequests.slice(0, 3).map((request) => (
                  <div
                    key={request.id}
                    className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#111418] dark:text-white">
                          {formatCurrency(request.finalSettlement)}
                        </p>
                        <p className="text-xs text-[#617589] dark:text-gray-400">
                          {request.retirementDate}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                          request.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : request.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* History Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-6 hover:shadow-xl transition-shadow">
          <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-6 flex items-center gap-2">
            <i className="fa-solid fa-history text-orange-600 text-2xl"></i>
            History
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...userRetirementRequests, ...userAdvanceRequests].length ===
            0 ? (
              <p className="text-center py-8 text-[#617589] dark:text-gray-400">
                No records found
              </p>
            ) : (
              [...userRetirementRequests, ...userAdvanceRequests]
                .sort(
                  (a, b) =>
                    new Date(b.submittedDate || b.requestDate) -
                    new Date(a.submittedDate || a.requestDate)
                )
                .map((record, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[#111418] dark:text-white text-sm">
                          {record.employeeName ||
                            `${record.purpose || "Advance"}`}
                        </div>
                        <div className="text-xs text-[#617589] dark:text-gray-400 mt-1">
                          {record.submittedDate || record.requestDate}
                        </div>
                        {record.amount && (
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                            {record.currency} {record.amount}
                          </div>
                        )}
                        {record.finalSettlement && (
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">
                            {formatCurrency(record.finalSettlement)}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${
                          record.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : record.status === "rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Advance Expense Modal */}
      {showAdvanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-2xl w-full min-h-screen md:min-h-auto md:max-h-[90vh] my-8 flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-wallet"></i>
                New Advance Expense Request
              </h2>
              <button
                onClick={() => setShowAdvanceForm(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>

            <form
              onSubmit={handleAdvanceSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Amount <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={advanceFormData.reason}
                  onChange={(e) =>
                    setAdvanceFormData({
                      ...advanceFormData,
                      reason: e.target.value,
                    })
                  }
                  rows="4"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Currency <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={advanceFormData.currency}
                    onChange={(e) =>
                      setAdvanceFormData({
                        ...advanceFormData,
                        currency: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="INR">INR</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Purpose <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={advanceFormData.purpose}
                    onChange={(e) =>
                      setAdvanceFormData({
                        ...advanceFormData,
                        purpose: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select purpose...</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Home Repair">Home Repair</option>
                    <option value="Education">Education</option>
                    <option value="Vehicle Purchase">Vehicle Purchase</option>
                    <option value="Family Emergency">Family Emergency</option>
                    <option value="Debt Repayment">Debt Repayment</option>
                    <option value="Business Investment">
                      Business Investment
                    </option>
                    <option value="Travel">Travel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Approver <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={advanceFormData.approver}
                    onChange={(e) => {
                      setAdvanceFormData({
                        ...advanceFormData,
                        approver: e.target.value,
                      });
                      const matches = staffList.filter((staff) =>
                        staff.name
                          .toLowerCase()
                          .includes(e.target.value.toLowerCase())
                      );
                      setApproverSuggestions(matches);
                      setShowSuggestions(true);
                    }}
                    placeholder="Search staff..."
                    required
                  />
                  {showSuggestions && approverSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-[#dbe0e6] dark:border-gray-700 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {approverSuggestions.map((staff, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-[#111418] dark:text-white text-sm border-b border-[#dbe0e6] dark:border-gray-700 last:border-b-0"
                          onClick={() => {
                            setAdvanceFormData({
                              ...advanceFormData,
                              approver: staff.name,
                              approverEmail: staff.email,
                            });
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="font-medium">{staff.name}</div>
                          <div className="text-xs text-[#617589] dark:text-gray-400">
                            {staff.email}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 pb-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanceForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-[#111418] dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retirement Modal */}
      {showRetirementForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl max-w-2xl w-full min-h-screen md:min-h-auto md:max-h-[90vh] my-8 flex flex-col">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-handshake"></i>
                New Retirement Request
              </h2>
              <button
                onClick={() => setShowRetirementForm(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>

            <form
              onSubmit={handleRetirementSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Retirement Date <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Years of Service <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Final Settlement <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              </div>

              <div className="flex gap-3 pt-6 pb-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowRetirementForm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-[#111418] dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
