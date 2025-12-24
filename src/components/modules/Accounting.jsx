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
    } catch {
      toast.error("Failed to submit request");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-[#111418] dark:text-white mb-2">
          Accounting Module
        </h2>
        <p className="text-[#617589] dark:text-gray-400">
          Manage your retirement and advance expense requests
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advance Expense Request Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#111418] dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-wallet text-blue-600"></i>
              Advance Expense Request
            </h3>
            <button
              onClick={() => setShowAdvanceForm(!showAdvanceForm)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              New
            </button>
          </div>

          {showAdvanceForm && (
            <form
              onSubmit={handleAdvanceSubmit}
              className="mb-4 pb-4 border-b border-[#dbe0e6] dark:border-gray-700"
            >
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                  Amount <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
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
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
                  value={advanceFormData.reason}
                  onChange={(e) =>
                    setAdvanceFormData({
                      ...advanceFormData,
                      reason: e.target.value,
                    })
                  }
                  rows="2"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                  Repayment Period <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
                  value={advanceFormData.repaymentPeriod}
                  onChange={(e) =>
                    setAdvanceFormData({
                      ...advanceFormData,
                      repaymentPeriod: e.target.value,
                    })
                  }
                  placeholder="e.g., 6 months"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                  Approver <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
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
                  <div className="mt-2 bg-white dark:bg-gray-800 border border-[#dbe0e6] dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {approverSuggestions.map((staff, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-[#111418] dark:text-white text-sm"
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <i className="fa-solid fa-check"></i>
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanceForm(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-[#111418] dark:text-white text-sm rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Retirement Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#111418] dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-handshake text-purple-600"></i>
              Retirement
            </h3>
            <button
              onClick={() => setShowRetirementForm(!showRetirementForm)}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              New
            </button>
          </div>

          {showRetirementForm && (
            <form
              onSubmit={handleRetirementSubmit}
              className="mb-4 pb-4 border-b border-[#dbe0e6] dark:border-gray-700"
            >
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                  Employee Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
                  value={retirementFormData.employeeName}
                  onChange={(e) =>
                    setRetirementFormData({
                      ...retirementFormData,
                      employeeName: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                    Retirement Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
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
                <div>
                  <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                    Years of Service <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
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
                <label className="block text-sm font-medium text-[#111418] dark:text-white mb-1">
                  Final Settlement Amount{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[#111418] dark:text-white"
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <i className="fa-solid fa-check"></i>
                  Submit
                </button>
                <button
                  type="button"
                  onClick={() => setShowRetirementForm(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-[#111418] dark:text-white text-sm rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}


        </div>

        {/* History Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-lg border border-[#dbe0e6] dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-4 flex items-center gap-2">
            <i className="fa-solid fa-history text-orange-600"></i>
            History
          </h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
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
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-[#dbe0e6] dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[#111418] dark:text-white text-sm">
                          {record.employeeName ||
                            `Advance Expense - ${record.reason}`}
                        </div>
                        <div className="text-xs text-[#617589] dark:text-gray-400 mt-1">
                          {record.submittedDate || record.requestDate}
                        </div>
                        {record.amount && (
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                            {formatCurrency(record.amount)}
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
    </div>
  );
};

export default Accounting;
