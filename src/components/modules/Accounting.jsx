import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";

const Accounting = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [retirementBreakdowns, setRetirementBreakdowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showRetirementHistory, setShowRetirementHistory] = useState(false);
  const [showMonthDetails, setShowMonthDetails] = useState(false);
  const [selectedMonthYear, setSelectedMonthYear] = useState(null);
  const [editingLineItems, setEditingLineItems] = useState({});
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
      const [advanceRes, refundRes, retirementRes] = await Promise.all([
        apiService.get(`/api/advance-requests?userId=${currentUserId}`),
        apiService.get(`/api/refund-requests?userId=${currentUserId}`),
        apiService.get(`/api/retirement-breakdown?userId=${currentUserId}`),
      ]);
      setAdvanceRequests(advanceRes?.data || []);
      setRefundRequests(refundRes?.data || []);
      setRetirementBreakdowns(retirementRes?.data || []);
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

    // Validate amount
    if (!advanceFormData.amount || parseFloat(advanceFormData.amount) <= 0) {
      toast.error("Please enter a valid amount");
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
      const response = await apiService.post(
        "/api/advance-requests",
        newRequest
      );

      if (!response || !response.data) {
        throw new Error("Failed to save request to database");
      }

      // Send email to approver
      try {
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
      } catch (emailError) {
        console.warn("Email notification failed:", emailError);
        toast.warning("Request saved but email notification failed");
      }

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
      toast.error(error.message || "Failed to submit request");
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();

    // Validate approver is selected
    if (!refundFormData.approver || !refundFormData.approverEmail) {
      toast.error("Approver must be selected");
      return;
    }

    // Validate amount
    if (!refundFormData.amount || parseFloat(refundFormData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Validate category
    if (!refundFormData.category) {
      toast.error("Please select a category");
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
      const response = await apiService.post(
        "/api/refund-requests",
        newRequest
      );

      if (!response || !response.data) {
        throw new Error("Failed to save refund request to database");
      }

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
      toast.error(error.message || "Failed to submit refund request");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 space-y-6 p-3">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Accounting", icon: "fa-calculator" },
        ]}
      />
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-[#111418] mb-2">
          <i className="fa-solid fa-calculator mr-3 text-blue-600"></i>
          Accounting
        </h2>
        <p className="text-[#617589] text-lg">
          Manage your advance and refund requests with ease
        </p>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-[#dbe0e6] shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <i className="fa-solid fa-wallet text-blue-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589]">Advance Requests</p>
              <p className="text-2xl font-bold text-[#111418]">
                {advanceRequests.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#dbe0e6] shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <i className="fa-solid fa-money-bill-transfer text-green-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589]">Refund Requests</p>
              <p className="text-2xl font-bold text-[#111418]">
                {refundRequests.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-[#dbe0e6] shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <i className="fa-solid fa-history text-orange-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-[#617589]">Total Records</p>
              <p className="text-2xl font-bold text-[#111418]">
                {advanceRequests.length + refundRequests.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Request Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Advance Expense Request Card */}
        <div className="bg-white rounded-xl border border-[#dbe0e6] shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-wallet text-blue-600 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#111418] mb-2">
              Advance Expense
            </h3>
            <p className="text-sm text-[#617589] mb-6">
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
        <div className="bg-white rounded-xl border border-[#dbe0e6] shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-money-bill-transfer text-green-600 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#111418] mb-2">
              Refund Request
            </h3>
            <p className="text-sm text-[#617589] mb-6">
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
        <div className="bg-white rounded-xl border border-[#dbe0e6] shadow-lg p-6 hover:shadow-xl transition-shadow flex flex-col items-center justify-center min-h-64">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-history text-purple-600 text-3xl"></i>
            </div>
            <h3 className="text-2xl font-bold text-[#111418] mb-2">
              Retirement History
            </h3>
            <p className="text-sm text-[#617589] mb-6">
              View retirement breakdown history
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowRetirementHistory(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center gap-2 mx-auto"
              >
                <i className="fa-solid fa-list text-lg"></i>
                View History
              </button>
              <button
                onClick={() => navigate("/retirement-management")}
                className="px-6 py-2 border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold flex items-center gap-2 mx-auto"
              >
                <i className="fa-solid fa-plus text-sm"></i>
                New Request
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Table - Full Screen */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-[#dbe0e6] shadow-lg">
          <div className="p-6 border-b border-[#dbe0e6]">
            <h3 className="text-2xl font-bold text-[#111418] flex items-center gap-2">
              <i className="fa-solid fa-history text-orange-600 text-2xl"></i>
              Request History
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[#617589]">
              <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
              <p>Loading requests...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Purpose/Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Approver
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[...advanceRequests, ...refundRequests].length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-[#617589]"
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
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                record.purpose
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
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
                          <td className="px-6 py-4 text-sm text-[#111418]">
                            {record.requestDate}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#111418] font-medium">
                            {record.purpose || record.category}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-[#111418]">
                            {record.currency} {record.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#617589]">
                            {record.approver}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                record.status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "rejected"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                <label className="block text-sm font-medium text-[#111418] mb-2">
                  Amount <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-[#111418] mb-2">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#111418] mb-2">
                    Currency <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#111418] mb-2">
                    Purpose <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-[#111418] mb-2">
                  Approver <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dbe0e6] rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {approverSuggestions.map((staff, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-[#111418] text-sm border-b border-[#dbe0e6] last:border-b-0"
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
                          <div className="text-xs text-[#617589]">
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
                  className="flex-1 px-4 py-3 bg-gray-200 text-[#111418] font-semibold rounded-lg hover:bg-gray-300 transition-colors"
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
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
                <label className="block text-sm font-medium text-[#111418] mb-2">
                  Amount <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#111418] mb-2">
                    Currency <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#111418] mb-2">
                    Category <span className="text-red-600">*</span>
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#111418] mb-2">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-[#111418] mb-2">
                    Transaction Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-[#111418] mb-2">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-[#111418] mb-2">
                  Approver <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-[#dbe0e6] rounded-lg bg-white text-[#111418] focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dbe0e6] rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                      {approverSuggestions.map((staff, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 hover:bg-green-50 cursor-pointer text-[#111418] text-sm border-b border-[#dbe0e6] last:border-b-0"
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
                          <div className="text-xs text-[#617589]">
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
                  className="flex-1 px-4 py-3 bg-gray-200 text-[#111418] font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retirement History Modal */}
      {showRetirementHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between rounded-t-xl flex-shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-history"></i>
                Retirement Breakdown History
              </h2>
              <button
                onClick={() => setShowRetirementHistory(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors flex-shrink-0"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {retirementBreakdowns.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-inbox text-6xl text-gray-300 mb-4"></i>
                  <p className="text-lg text-[#617589] mb-2">
                    No retirement breakdowns found
                  </p>
                  <p className="text-sm text-[#617589] mb-6">
                    Create a new retirement breakdown to get started
                  </p>
                  <button
                    onClick={() => {
                      setShowRetirementHistory(false);
                      navigate("/retirement-management");
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold inline-flex items-center gap-2"
                  >
                    <i className="fa-solid fa-plus"></i>
                    Create New Breakdown
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Month
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Previous Balance
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Inflow
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Expenses
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Closing Balance
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Total Items
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Submissions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(() => {
                        // Group breakdowns by month
                        const monthlyData = {};
                        retirementBreakdowns.forEach((breakdown) => {
                          const monthKey = breakdown.monthYear;
                          if (!monthlyData[monthKey]) {
                            monthlyData[monthKey] = {
                              monthYear: monthKey,
                              previousClosingBalance:
                                breakdown.previousClosingBalance || 0,
                              totalInflow: 0,
                              totalExpenses: 0,
                              totalItems: 0,
                              submissions: 0,
                              latestBalance: 0,
                            };
                          }
                          monthlyData[monthKey].totalInflow +=
                            breakdown.inflowAmount || 0;
                          monthlyData[monthKey].totalExpenses +=
                            breakdown.totalExpenses || 0;
                          monthlyData[monthKey].totalItems +=
                            breakdown.lineItems?.length || 0;
                          monthlyData[monthKey].submissions += 1;
                          monthlyData[monthKey].latestBalance =
                            breakdown.newOpeningBalance || 0;
                        });

                        // Convert to array and sort by month (most recent first)
                        const monthlyArray = Object.values(monthlyData).sort(
                          (a, b) => {
                            return b.monthYear.localeCompare(a.monthYear);
                          }
                        );

                        return monthlyArray.map((monthData, idx) => {
                          const [year, month] = (
                            monthData.monthYear || ""
                          ).split("-");
                          const monthName = month
                            ? new Date(
                                year,
                                parseInt(month) - 1,
                                1
                              ).toLocaleString("en-US", {
                                month: "long",
                                year: "numeric",
                              })
                            : monthData.monthYear;

                          return (
                            <tr
                              key={idx}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td
                                className="px-6 py-4 text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                                onClick={() => {
                                  setSelectedMonthYear(monthData.monthYear);
                                  setShowMonthDetails(true);
                                }}
                              >
                                {monthName}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-gray-600">
                                $
                                {monthData.previousClosingBalance?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-green-600">
                                ${monthData.totalInflow?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-red-600">
                                ${monthData.totalExpenses?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm font-semibold text-blue-600">
                                ${monthData.latestBalance?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-sm text-[#617589]">
                                {monthData.totalItems} items
                              </td>
                              <td className="px-6 py-4 text-sm text-[#617589]">
                                {monthData.submissions} submission
                                {monthData.submissions > 1 ? "s" : ""}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between items-center flex-shrink-0">
              <button
                onClick={() => setShowRetirementHistory(false)}
                className="px-4 py-2 bg-gray-200 text-[#111418] font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Prepare monthly aggregated data for export
                  const monthlyData = {};
                  retirementBreakdowns.forEach((breakdown) => {
                    const monthKey = breakdown.monthYear;
                    if (!monthlyData[monthKey]) {
                      monthlyData[monthKey] = {
                        monthYear: monthKey,
                        previousClosingBalance:
                          breakdown.previousClosingBalance || 0,
                        totalInflow: 0,
                        totalExpenses: 0,
                        totalItems: 0,
                        submissions: 0,
                        latestBalance: 0,
                      };
                    }
                    monthlyData[monthKey].totalInflow +=
                      breakdown.inflowAmount || 0;
                    monthlyData[monthKey].totalExpenses +=
                      breakdown.totalExpenses || 0;
                    monthlyData[monthKey].totalItems +=
                      breakdown.lineItems?.length || 0;
                    monthlyData[monthKey].submissions += 1;
                    monthlyData[monthKey].latestBalance =
                      breakdown.newOpeningBalance || 0;
                  });

                  // Convert to CSV
                  const monthlyArray = Object.values(monthlyData).sort(
                    (a, b) => {
                      return b.monthYear.localeCompare(a.monthYear);
                    }
                  );

                  const headers = [
                    "Month",
                    "Previous Balance",
                    "Total Inflow",
                    "Total Expenses",
                    "Closing Balance",
                    "Total Items",
                    "Submissions",
                  ];

                  const rows = monthlyArray.map((monthData) => {
                    const [year, month] = (monthData.monthYear || "").split(
                      "-"
                    );
                    const monthName = month
                      ? new Date(year, parseInt(month) - 1, 1).toLocaleString(
                          "en-US",
                          {
                            month: "long",
                            year: "numeric",
                          }
                        )
                      : monthData.monthYear;

                    return [
                      monthName,
                      monthData.previousClosingBalance,
                      monthData.totalInflow,
                      monthData.totalExpenses,
                      monthData.latestBalance,
                      monthData.totalItems,
                      monthData.submissions,
                    ];
                  });

                  // Create CSV content
                  const csvContent = [
                    headers.join(","),
                    ...rows.map((row) => row.join(",")),
                  ].join("\n");

                  // Download CSV
                  const blob = new Blob([csvContent], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute(
                    "download",
                    `retirement_history_${
                      new Date().toISOString().split("T")[0]
                    }.csv`
                  );
                  link.style.visibility = "hidden";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success("Data exported successfully");
                }}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Month Details Modal */}
      {showMonthDetails && selectedMonthYear && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowMonthDetails(false);
                      setSelectedMonthYear(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <i className="fa-solid fa-arrow-left text-gray-600"></i>
                  </button>
                  <div>
                    <h2 className="text-2xl font-bold text-[#111418]">
                      {(() => {
                        const [year, month] = (selectedMonthYear || "").split(
                          "-"
                        );
                        const monthName = month
                          ? new Date(
                              year,
                              parseInt(month) - 1,
                              1
                            ).toLocaleString("en-US", {
                              month: "long",
                              year: "numeric",
                            })
                          : selectedMonthYear;
                        return `${monthName} - Detailed Breakdown`;
                      })()}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      All submissions and line items for this month
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const monthBreakdowns = retirementBreakdowns.filter(
                      (breakdown) => breakdown.monthYear === selectedMonthYear
                    );

                    const openingBalance =
                      monthBreakdowns[0]?.previousClosingBalance || 0;
                    const closingBalance =
                      monthBreakdowns[monthBreakdowns.length - 1]
                        ?.newOpeningBalance || 0;
                    const totalInflow = monthBreakdowns.reduce(
                      (sum, breakdown) => sum + (breakdown.inflowAmount || 0),
                      0
                    );
                    const totalExpenses = monthBreakdowns.reduce(
                      (sum, breakdown) => sum + (breakdown.totalExpenses || 0),
                      0
                    );

                    const allLineItems = [];
                    monthBreakdowns.forEach((breakdown) => {
                      if (
                        breakdown.lineItems &&
                        breakdown.lineItems.length > 0
                      ) {
                        allLineItems.push(...breakdown.lineItems);
                      }
                    });

                    const [year, month] = (selectedMonthYear || "").split("-");
                    const monthName = month
                      ? new Date(year, parseInt(month) - 1, 1).toLocaleString(
                          "en-US",
                          { month: "long", year: "numeric" }
                        )
                      : selectedMonthYear;

                    // Create CSV content
                    const headers = [
                      "Date",
                      "Description",
                      "Quantity",
                      "Amount",
                    ];
                    const rows = allLineItems.map((item) => [
                      item.date || "N/A",
                      item.description || "No description",
                      item.quantity || 0,
                      item.amount || 0,
                    ]);

                    const csvContent = [
                      `Retirement Breakdown - ${monthName}`,
                      "",
                      "Financial Summary",
                      `Opening Balance,$${openingBalance.toLocaleString()}`,
                      `Total Inflow,$${totalInflow.toLocaleString()}`,
                      `Total Expenses,$${totalExpenses.toLocaleString()}`,
                      `Closing Balance,$${closingBalance.toLocaleString()}`,
                      "",
                      "Line Items",
                      headers.join(","),
                      ...rows.map((row) => row.join(",")),
                      "",
                      `Total,$${totalExpenses.toLocaleString()}`,
                    ].join("\n");

                    const blob = new Blob([csvContent], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const link = document.createElement("a");
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute(
                      "download",
                      `retirement_${monthName.replace(/ /g, "_")}_${
                        new Date().toISOString().split("T")[0]
                      }.csv`
                    );
                    link.style.visibility = "hidden";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast.success("Data exported successfully");
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-download"></i>
                  Export
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {(() => {
                const monthBreakdowns = retirementBreakdowns.filter(
                  (breakdown) => breakdown.monthYear === selectedMonthYear
                );

                if (monthBreakdowns.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <i className="fa-solid fa-inbox text-4xl text-gray-400"></i>
                      </div>
                      <p className="text-lg font-semibold text-gray-600">
                        No submissions found for this month
                      </p>
                    </div>
                  );
                }

                // Calculate aggregated financial data
                const openingBalance =
                  monthBreakdowns[0]?.previousClosingBalance || 0;
                const closingBalance =
                  monthBreakdowns[monthBreakdowns.length - 1]
                    ?.newOpeningBalance || 0;
                const totalInflow = monthBreakdowns.reduce(
                  (sum, breakdown) => sum + (breakdown.inflowAmount || 0),
                  0
                );
                const totalExpenses = monthBreakdowns.reduce(
                  (sum, breakdown) => sum + (breakdown.totalExpenses || 0),
                  0
                );

                // Combine all line items from all submissions
                const allLineItems = [];
                monthBreakdowns.forEach((breakdown) => {
                  if (breakdown.lineItems && breakdown.lineItems.length > 0) {
                    allLineItems.push(...breakdown.lineItems);
                  }
                });

                return (
                  <div className="space-y-6">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-wallet text-gray-600"></i>
                          </div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Opening Balance
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-[#111418]">
                          ${openingBalance.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-arrow-trend-up text-green-700"></i>
                          </div>
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                            Total Inflow
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                          ${totalInflow.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-red-200 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-arrow-trend-down text-red-700"></i>
                          </div>
                          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                            Total Expenses
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-red-700">
                          ${totalExpenses.toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
                            <i className="fa-solid fa-coins text-blue-700"></i>
                          </div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            Closing Balance
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">
                          ${closingBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* All Line Items Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <i className="fa-solid fa-list-check"></i>
                          All Expense Line Items ({allLineItems.length} total
                          items)
                        </h3>
                      </div>

                      {allLineItems.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  #
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Date
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Quantity
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Total
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {allLineItems.map((item, itemIdx) => {
                                const itemKey = `${itemIdx}`;
                                const isEditing = editingLineItems[itemKey];
                                const editedItem =
                                  editingLineItems[itemKey] || item;
                                const itemQuantity =
                                  parseFloat(editedItem.quantity) || 0;
                                const itemAmount =
                                  parseFloat(editedItem.amount) || 0;
                                const itemTotal = itemQuantity * itemAmount;

                                return (
                                  <tr
                                    key={itemIdx}
                                    className="hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">
                                      {itemIdx + 1}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#111418] whitespace-nowrap">
                                      {isEditing ? (
                                        <input
                                          type="date"
                                          value={editedItem.date || ""}
                                          onChange={(e) =>
                                            setEditingLineItems({
                                              ...editingLineItems,
                                              [itemKey]: {
                                                ...editedItem,
                                                date: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-[#111418] text-sm"
                                        />
                                      ) : (
                                        item.date || "N/A"
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[#111418]">
                                      {isEditing ? (
                                        <input
                                          type="text"
                                          value={editedItem.description || ""}
                                          onChange={(e) =>
                                            setEditingLineItems({
                                              ...editingLineItems,
                                              [itemKey]: {
                                                ...editedItem,
                                                description: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-[#111418] text-sm"
                                        />
                                      ) : (
                                        editedItem.description ||
                                        "No description"
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editedItem.quantity || ""}
                                          onChange={(e) =>
                                            setEditingLineItems({
                                              ...editingLineItems,
                                              [itemKey]: {
                                                ...editedItem,
                                                quantity: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-[#111418] text-sm"
                                          step="0.01"
                                          min="0"
                                        />
                                      ) : (
                                        itemQuantity
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#111418] text-right">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editedItem.amount || ""}
                                          onChange={(e) =>
                                            setEditingLineItems({
                                              ...editingLineItems,
                                              [itemKey]: {
                                                ...editedItem,
                                                amount: e.target.value,
                                              },
                                            })
                                          }
                                          className="w-full px-2 py-1 border border-gray-300 rounded bg-white text-[#111418] text-sm text-right"
                                          step="0.01"
                                          min="0"
                                        />
                                      ) : (
                                        `$${itemAmount.toLocaleString()}`
                                      )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-blue-600 text-right">
                                      $
                                      {itemTotal.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                      {isEditing ? (
                                        <div className="flex gap-2 justify-center">
                                          <button
                                            onClick={() => {
                                              const updated = [...allLineItems];
                                              updated[itemIdx] = editedItem;
                                              setEditingLineItems({
                                                ...editingLineItems,
                                                [itemKey]: null,
                                              });
                                              toast.success("Item updated");
                                            }}
                                            className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                                          >
                                            <i className="fa-solid fa-check"></i>
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingLineItems({
                                                ...editingLineItems,
                                                [itemKey]: null,
                                              });
                                            }}
                                            className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                          >
                                            <i className="fa-solid fa-times"></i>
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingLineItems({
                                              ...editingLineItems,
                                              [itemKey]: { ...item },
                                            });
                                          }}
                                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                                        >
                                          <i className="fa-solid fa-pen"></i>
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-gray-100 font-bold">
                                <td
                                  colSpan="5"
                                  className="px-6 py-4 text-right text-sm text-gray-700 uppercase tracking-wide"
                                >
                                  Grand Total:
                                </td>
                                <td className="px-6 py-4 text-right text-lg font-bold text-[#111418]">
                                  $
                                  {allLineItems
                                    .reduce((sum, item) => {
                                      const qty =
                                        parseFloat(item.quantity) || 0;
                                      const amt = parseFloat(item.amount) || 0;
                                      return sum + qty * amt;
                                    }, 0)
                                    .toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                </td>
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-12 text-center">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i className="fa-solid fa-receipt text-4xl text-gray-300"></i>
                          </div>
                          <p className="text-lg font-semibold text-gray-500">
                            No line items found
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            There are no expense items recorded for this month
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounting;
