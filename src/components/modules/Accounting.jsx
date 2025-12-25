import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const Accounting = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
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
  const [advanceFormData, setAdvanceFormData] = useState({
    amount: "",
    reason: "",
    approver: "",
    approverEmail: "",
    currency: "USD",
    purpose: "",
  });
  const [refundFormData, setRefundFormData] = useState({
    amount: "",
    reason: "",
    category: "",
    receiptNumber: "",
    transactionDate: "",
    approver: "",
    approverEmail: "",
    currency: "USD",
  });

  // Get current user's info
  const currentUserName = user?.fullName || "Current User";
  const currentUserId = user?.id || "user_current";
  const currentEmployeeId = user?.publicMetadata?.employeeId || "EMP999";
  const currentDepartment = user?.publicMetadata?.department || "General";

  // Fetch data from MongoDB
  const fetchData = async () => {
    setLoading(true);
    try {
      const [advanceRes, refundRes] = await Promise.all([
        apiService.get(`/api/advance-requests?userId=${currentUserId}`),
        apiService.get(`/api/refund-requests?userId=${currentUserId}`),
      ]);
      setAdvanceRequests(advanceRes?.data || []);
      setRefundRequests(refundRes?.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();

    // Validate approver is selected
    if (!advanceFormData.approver || !advanceFormData.approverEmail) {
      toast.error("Approver must be selected");
      return;
    }

    const newRequest = {
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
      // Save to database
      await apiService.post("/api/advance-requests", newRequest);

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
        repaymentPeriod: "N/A",
      });

      setShowAdvanceForm(false);
      setAdvanceFormData({
        amount: "",
        reason: "",
        approver: "",
        approverEmail: "",
        currency: "USD",
        purpose: "",
      });
      toast.success("Request submitted successfully");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error submitting advance request:", error);
      toast.error("Failed to submit request");
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();

    // Validate approver is selected
    if (!refundFormData.approver || !refundFormData.approverEmail) {
      toast.error("Approver must be selected");
      return;
    }

    const newRequest = {
      employeeName: currentUserName,
      employeeId: currentEmployeeId,
      department: currentDepartment,
      userId: currentUserId,
      amount: parseFloat(refundFormData.amount),
      reason: refundFormData.reason,
      category: refundFormData.category,
      receiptNumber: refundFormData.receiptNumber,
      transactionDate: refundFormData.transactionDate,
      approver: refundFormData.approver,
      approverEmail: refundFormData.approverEmail,
      currency: refundFormData.currency,
      status: "pending",
      requestDate: new Date().toISOString().split("T")[0],
    };

    try {
      // Save to database
      await apiService.post("/api/refund-requests", newRequest);

      setShowRefundForm(false);
      setRefundFormData({
        amount: "",
        reason: "",
        category: "",
        receiptNumber: "",
        transactionDate: "",
        approver: "",
        approverEmail: "",
        currency: "USD",
      });
      toast.success("Refund request submitted successfully");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Error submitting refund request:", error);
      toast.error("Failed to submit refund request");
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
          Manage your advance and refund requests with ease
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
                {advanceRequests.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <i className="fa-solid fa-money-bill-transfer text-green-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Refund Requests
              </p>
              <p className="text-2xl font-bold text-[#111418] dark:text-white">
                {refundRequests.length}
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
                {advanceRequests.length + refundRequests.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Advance Expense Request Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-wallet text-blue-600 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-2">
              Advance Expense
            </h3>
            <p className="text-sm text-[#617589] dark:text-gray-400 mb-6">
              Request an advance for expenses
            </p>
            <button
              onClick={() => setShowAdvanceForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
            >
              <i className="fa-solid fa-plus text-lg"></i>
              New Request
            </button>
          </div>
        </div>

        {/* Refund Request Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-money-bill-transfer text-green-600 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-2">
              Refund Request
            </h3>
            <p className="text-sm text-[#617589] dark:text-gray-400 mb-6">
              Request a refund for expenses
            </p>
            <button
              onClick={() => setShowRefundForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
            >
              <i className="fa-solid fa-plus text-lg"></i>
              New Request
            </button>
          </div>
        </div>

        {/* Retirement Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-handshake text-purple-600 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#111418] dark:text-white mb-2">
              Retirement
            </h3>
            <p className="text-sm text-[#617589] dark:text-gray-400 mb-6">
              Manage retirement requests
            </p>
            <button
              onClick={() => navigate("/retirement-management")}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
            >
              <i className="fa-solid fa-plus text-lg"></i>
              New Request
            </button>
          </div>
        </div>
      </div>

      {/* History Table - Full Screen */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg">
          <div className="p-6 border-b border-[#dbe0e6] dark:border-gray-700">
            <h3 className="text-2xl font-bold text-[#111418] dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-history text-orange-600 text-2xl"></i>
              Request History
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#617589] dark:text-gray-400">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
              <p>Loading requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Purpose/Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Approver
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[...advanceRequests, ...refundRequests].length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-[#617589] dark:text-gray-400"
                      >
                        <i className="fa-solid fa-inbox text-4xl mb-3 opacity-50"></i>
                        <p className="text-lg">No requests found</p>
                        <p className="text-sm mt-1">
                          Create a new advance or refund request to get started
                        </p>
                      </td>
                    </tr>
                  ) : (
                    [...advanceRequests, ...refundRequests]
                      .sort(
                        (a, b) =>
                          new Date(b.requestDate) - new Date(a.requestDate)
                      )
                      .map((record, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                record.purpose
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              <i
                                className={`fa-solid ${
                                  record.purpose
                                    ? "fa-wallet"
                                    : "fa-money-bill-transfer"
                                }`}
                              ></i>
                              {record.purpose ? "Advance" : "Refund"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#111418] dark:text-white">
                            {record.requestDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#111418] dark:text-white font-medium">
                            {record.purpose || record.category}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-[#111418] dark:text-white">
                            {record.currency} {record.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#617589] dark:text-gray-400">
                            {record.approver}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                record.status === "approved"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                  : record.status === "rejected"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}
                            >
                              {record.status.charAt(0).toUpperCase() +
                                record.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {/* Advance Expense Modal */}
      {showAdvanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-wallet"></i>
                New Advance Request
              </h2>
              <button
                onClick={() => setShowAdvanceForm(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
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

              <div className="flex gap-3 pt-6">
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

      {/* Refund Request Modal */}
      {showRefundForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-money-bill-transfer"></i>
                New Refund Request
              </h2>
              <button
                onClick={() => setShowRefundForm(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>

            <form
              onSubmit={handleRefundSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Amount <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={refundFormData.amount}
                  onChange={(e) =>
                    setRefundFormData({
                      ...refundFormData,
                      amount: e.target.value,
                    })
                  }
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Currency <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={refundFormData.currency}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
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
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={refundFormData.category}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        category: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select category...</option>
                    <option value="Travel">Travel</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Training">Training</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Meals">Meals</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={refundFormData.receiptNumber}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        receiptNumber: e.target.value,
                      })
                    }
                    placeholder="e.g., RCP-12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                    Transaction Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={refundFormData.transactionDate}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        transactionDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={refundFormData.reason}
                  onChange={(e) =>
                    setRefundFormData({
                      ...refundFormData,
                      reason: e.target.value,
                    })
                  }
                  rows="4"
                  placeholder="Describe the expense and why refund is needed..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                  Approver <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={refundFormData.approver}
                    onChange={(e) => {
                      setRefundFormData({
                        ...refundFormData,
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
                          className="px-4 py-2 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer text-[#111418] dark:text-white text-sm border-b border-[#dbe0e6] dark:border-gray-700 last:border-b-0"
                          onClick={() => {
                            setRefundFormData({
                              ...refundFormData,
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

              <div className="flex gap-3 pt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>
                  Submit Request
                </button>
                <button
                  type="button"
                  onClick={() => setShowRefundForm(false)}
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
