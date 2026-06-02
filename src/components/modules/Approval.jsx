import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { apiService } from "../../services/api";
import Breadcrumb from "../Breadcrumb";
import ModuleLoader from "../common/ModuleLoader";
import { toast } from "react-hot-toast";

const initialAdvanceForm = {
  amount: "",
  reason: "",
  currency: "USD",
  purpose: "",
  attachment: "",
  attachmentName: "",
};

const initialRefundForm = {
  amount: "",
  reason: "",
  category: "",
  receiptNumber: "",
  transactionDate: "",
  currency: "NGN",
};

const initialLeaveForm = {
  leaveType: "",
  fromDate: "",
  toDate: "",
  reason: "",
  managerId: "",
  managerName: "",
  managerEmail: "",
  attachment: "",
  attachmentName: "",
};

const initialTravelForm = {
  currentLocation: "",
  destination: "",
  purpose: "",
  fromDate: "",
  toDate: "",
  accommodationRequired: false,
  budget: "",
  description: "",
  managerId: "",
  managerName: "",
  managerEmail: "",
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
};

const getStatusClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("approved")) return "bg-green-100 text-green-800";
  if (normalized.includes("rejected")) return "bg-red-100 text-red-800";
  if (normalized.includes("pending")) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
};

const Approval = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [advanceRequests, setAdvanceRequests] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [travelRequests, setTravelRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [activeTab, setActiveTab] = useState("my-requests");
  const [selectedPendingRequest, setSelectedPendingRequest] = useState(null);
  const [approvalActionType, setApprovalActionType] = useState("");
  const [actionComments, setActionComments] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showTravelForm, setShowTravelForm] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeHistoryPill, setActiveHistoryPill] = useState("all");

  const [advanceFormData, setAdvanceFormData] = useState(initialAdvanceForm);
  const [refundFormData, setRefundFormData] = useState(initialRefundForm);
  const [leaveFormData, setLeaveFormData] = useState(initialLeaveForm);
  const [travelFormData, setTravelFormData] = useState(initialTravelForm);
  const [travelFormLoading, setTravelFormLoading] = useState(false);

  const [leaveAllocation, setLeaveAllocation] = useState(null);
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [remainingLeave, setRemainingLeave] = useState(null);

  const currentUserName = user?.fullName || "Current User";
  const currentUserId = user?.id || user?._id || user?.userId || "";
  const currentEmployeeId = user?.publicMetadata?.employeeId || "EMP999";
  const currentDepartment = user?.publicMetadata?.department || "General";

  const extractList = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.employees)) return response.employees;
    return [];
  };

  const fetchData = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [advanceRes, refundRes, leaveRes, travelRes, pendingRes] =
        await Promise.allSettled([
          apiService.get(`/api/advance-requests?userId=${currentUserId}`, {
            timeout: 20000,
          }),
          apiService.get(`/api/refund-requests?userId=${currentUserId}`, {
            timeout: 20000,
          }),
          apiService.get(
            `/api/approval/leave-requests?employeeId=${currentEmployeeId}`,
            { timeout: 20000 },
          ),
          apiService.get(
            `/api/approval/travel-requests?employeeId=${currentEmployeeId}`,
            { timeout: 20000 },
          ),
          apiService.get(
            `/api/approval/pending`,
            { timeout: 20000 },
          ),
        ]);

      setAdvanceRequests(
        advanceRes.status === "fulfilled" ? extractList(advanceRes.value) : [],
      );
      setRefundRequests(
        refundRes.status === "fulfilled" ? extractList(refundRes.value) : [],
      );
      setLeaveRequests(
        leaveRes.status === "fulfilled" ? extractList(leaveRes.value) : [],
      );
      setTravelRequests(
        travelRes.status === "fulfilled" ? extractList(travelRes.value) : [],
      );
      setPendingApprovals(
        pendingRes.status === "fulfilled" ? extractList(pendingRes.value) : [],
      );

      if (
        advanceRes.status === "rejected" ||
        refundRes.status === "rejected" ||
        leaveRes.status === "rejected" ||
        travelRes.status === "rejected" ||
        pendingRes.status === "rejected"
      ) {
        console.error("One or more approval lists failed to load.", {
          advanceRes,
          refundRes,
          leaveRes,
          travelRes,
          pendingRes,
        });
      }
    } catch (error) {
      console.error("Error loading approval data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (e) => {
    e.preventDefault();
    if (!selectedPendingRequest || !approvalActionType) return;

    setIsSubmittingAction(true);
    try {
      const response = await apiService.post(
        `/api/approval/${selectedPendingRequest.type}/${selectedPendingRequest.id}/${approvalActionType}`,
        { comments: actionComments }
      );

      if (response?.success) {
        toast.success(`Request ${approvalActionType === "approve" ? "approved" : "rejected"} successfully!`);
      } else {
        toast.success("Action submitted successfully");
      }

      setSelectedPendingRequest(null);
      setActionComments("");
      await fetchData();
    } catch (error) {
      console.error(`Error processing approval action:`, error);
      const errMsg = error?.response?.data?.message || error?.message || "Failed to submit action";
      toast.error(errMsg);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  useEffect(() => {
    const fetchLeaveAllocation = async () => {
      try {
        const response = await apiService.get(
          `/api/hr/leave-allocations?employeeId=${currentEmployeeId}&year=${new Date().getFullYear()}`,
        );

        if (Array.isArray(response) && response.length > 0) {
          const allocation = response[0];
          setLeaveAllocation(allocation);

          const managerInfo = {
            managerId: allocation.managerId || "",
            managerName: allocation.managerName || "",
            managerEmail: allocation.managerEmail || "",
          };

          setLeaveFormData((prev) => ({ ...prev, ...managerInfo }));
          setTravelFormData((prev) => ({ ...prev, ...managerInfo }));
        }
      } catch (error) {
        console.error("Error fetching leave allocation:", error);
      }
    };

    if (currentEmployeeId) {
      fetchLeaveAllocation();
    }
  }, [currentEmployeeId]);

  useEffect(() => {
    if (!leaveFormData.fromDate || !leaveFormData.toDate) {
      setCalculatedDays(0);
      setRemainingLeave(null);
      return;
    }

    const from = new Date(leaveFormData.fromDate);
    const to = new Date(leaveFormData.toDate);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      to < from
    ) {
      setCalculatedDays(0);
      setRemainingLeave(null);
      return;
    }

    let days = 0;
    const current = new Date(from);
    while (current <= to) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days += 1;
      }
      current.setDate(current.getDate() + 1);
    }

    setCalculatedDays(days);

    if (!leaveFormData.leaveType || !leaveAllocation) {
      setRemainingLeave(null);
      return;
    }

    let allocated = 0;
    let used = 0;
    switch (leaveFormData.leaveType) {
      case "annual":
        allocated = leaveAllocation.annualLeave || 0;
        used = leaveAllocation.annualLeaveUsed || 0;
        break;
      case "sick":
        allocated = leaveAllocation.sickLeave || 0;
        used = leaveAllocation.sickLeaveUsed || 0;
        break;
      case "personal":
        allocated = leaveAllocation.personalLeave || 0;
        used = leaveAllocation.personalLeaveUsed || 0;
        break;
      case "unpaid":
        allocated = 999;
        used = 0;
        break;
      default:
        allocated = 0;
        used = 0;
    }

    setRemainingLeave({
      allocated,
      used,
      requested: days,
      remaining: allocated - used - days,
    });
  }, [
    leaveFormData.fromDate,
    leaveFormData.toDate,
    leaveFormData.leaveType,
    leaveAllocation,
  ]);

  useEffect(() => {
    if (!travelFormData.fromDate || !travelFormData.toDate) {
      return;
    }

    const from = new Date(travelFormData.fromDate);
    const to = new Date(travelFormData.toDate);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      to < from
    ) {
      setTravelFormData((prev) => ({
        ...prev,
        numberOfDays: 0,
        numberOfNights: 0,
      }));
      return;
    }

    const timeDiff = to.getTime() - from.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    const nights = Math.max(0, days - 1);

    setTravelFormData((prev) => ({
      ...prev,
      numberOfDays: days,
      numberOfNights: nights,
    }));
  }, [travelFormData.fromDate, travelFormData.toDate]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentEmployeeId]);

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();

    if (!advanceFormData.amount || Number(advanceFormData.amount) <= 0) {
      toast.error("Invalid advance amount");
      return;
    }

    try {
      const response = await apiService.post("/api/advance-requests", {
        employeeName: currentUserName,
        employeeId: currentEmployeeId,
        department: currentDepartment,
        userId: currentUserId,
        amount: Number(advanceFormData.amount),
        reason: advanceFormData.reason,
        currency: advanceFormData.currency,
        purpose: advanceFormData.purpose,
        attachment: advanceFormData.attachment || null,
        attachmentName: advanceFormData.attachmentName || null,
        status: "pending",
        requestDate: new Date().toISOString().split("T")[0],
        hasRetirement: false,
      });

      if (!response) {
        throw new Error("Failed to save advance request");
      }

      setAdvanceFormData(initialAdvanceForm);
      setShowAdvanceForm(false);
      toast.success("Advance request submitted successfully!");
      await fetchData();
    } catch (error) {
      console.error("Error submitting advance request:", error);
      toast.error("Failed to submit advance request");
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();

    if (!refundFormData.amount || Number(refundFormData.amount) <= 0) {
      console.warn("Validation failed: invalid refund amount");
      return;
    }

    if (!refundFormData.category) {
      console.warn("Validation failed: refund category is required");
      return;
    }

    try {
      const response = await apiService.post("/api/refund-requests", {
        employeeName: currentUserName,
        employeeId: currentEmployeeId,
        department: currentDepartment,
        userId: currentUserId,
        amount: Number(refundFormData.amount),
        reason: refundFormData.reason,
        category: refundFormData.category,
        receiptNumber: refundFormData.receiptNumber,
        transactionDate: refundFormData.transactionDate,
        currency: refundFormData.currency,
        status: "pending",
        requestDate: new Date().toISOString().split("T")[0],
      });

      if (!response) {
        throw new Error("Failed to save refund request");
      }

      setRefundFormData(initialRefundForm);
      setShowRefundForm(false);
      await fetchData();
    } catch (error) {
      console.error("Error submitting refund request:", error);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();

    if (
      !leaveFormData.leaveType ||
      !leaveFormData.fromDate ||
      !leaveFormData.toDate
    ) {
      toast.error("Leave type and dates are required");
      return;
    }

    if (!leaveFormData.attachment) {
      toast.error("An attachment is required to submit a leave request");
      return;
    }

    if (
      remainingLeave &&
      remainingLeave.remaining < 0 &&
      leaveFormData.leaveType !== "unpaid"
    ) {
      toast.error("Insufficient leave balance");
      return;
    }

    try {
      const response = await apiService.post("/api/approval/leave-requests", {
        employeeName: currentUserName,
        employeeId: currentEmployeeId,
        department: currentDepartment,
        userId: currentUserId,
        leaveType: leaveFormData.leaveType,
        fromDate: leaveFormData.fromDate,
        toDate: leaveFormData.toDate,
        days: calculatedDays,
        reason: leaveFormData.reason,
        attachment: leaveFormData.attachment,
        attachmentName: leaveFormData.attachmentName,
        managerId: leaveFormData.managerId,
        managerName: leaveFormData.managerName,
        managerEmail: leaveFormData.managerEmail,
        status: "pending_manager",
        requestDate: new Date().toISOString().split("T")[0],
      });

      if (!response) {
        throw new Error("Failed to save leave request");
      }

      try {
        await apiService.post("/api/send-leave-approval-email", {
          to: leaveFormData.managerEmail,
          employeeName: currentUserName,
          employeeId: currentEmployeeId,
          leaveType: leaveFormData.leaveType,
          fromDate: leaveFormData.fromDate,
          toDate: leaveFormData.toDate,
          days: calculatedDays,
          reason: leaveFormData.reason,
          managerName: leaveFormData.managerName,
          approvalStage: "manager",
        });
      } catch (emailError) {
        console.error("Leave approval email failed:", emailError);
      }

      setLeaveFormData((prev) => ({
        ...initialLeaveForm,
        managerId: prev.managerId,
        managerName: prev.managerName,
        managerEmail: prev.managerEmail,
      }));
      setShowLeaveForm(false);
      toast.success("Leave request submitted successfully!");
      await fetchData();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast.error("Failed to submit leave request");
    }
  };

  const handleTravelSubmit = async (e) => {
    e.preventDefault();

    if (
      !travelFormData.currentLocation ||
      !travelFormData.destination ||
      !travelFormData.purpose ||
      !travelFormData.fromDate ||
      !travelFormData.toDate ||
      !travelFormData.managerId ||
      !travelFormData.managerEmail ||
      !travelFormData.budget ||
      Number(travelFormData.budget) <= 0
    ) {
      console.warn("Validation failed: travel request is incomplete");
      return;
    }

    try {
      setTravelFormLoading(true);

      const response = await apiService.post("/api/approval/travel-requests", {
        employeeName: currentUserName,
        employeeId: currentEmployeeId,
        department: currentDepartment,
        userId: currentUserId,
        currentLocation: travelFormData.currentLocation,
        destination: travelFormData.destination,
        purpose: travelFormData.purpose,
        fromDate: travelFormData.fromDate,
        toDate: travelFormData.toDate,
        numberOfDays: travelFormData.numberOfDays,
        numberOfNights: travelFormData.numberOfNights,
        accommodationRequired: travelFormData.accommodationRequired,
        budget: Number(travelFormData.budget),
        description: travelFormData.description,
        managerId: travelFormData.managerId,
        managerName: travelFormData.managerName,
        managerEmail: travelFormData.managerEmail,
        status: "pending_manager",
        requestDate: new Date().toISOString().split("T")[0],
      });

      if (!response) {
        throw new Error("Failed to save travel request");
      }

      try {
        await apiService.post("/api/send-travel-approval-email", {
          to: travelFormData.managerEmail,
          employeeName: currentUserName,
          employeeId: currentEmployeeId,
          currentLocation: travelFormData.currentLocation,
          destination: travelFormData.destination,
          purpose: travelFormData.purpose,
          fromDate: travelFormData.fromDate,
          toDate: travelFormData.toDate,
          numberOfDays: travelFormData.numberOfDays,
          numberOfNights: travelFormData.numberOfNights,
          accommodationRequired: travelFormData.accommodationRequired,
          budget: travelFormData.budget,
          managerName: travelFormData.managerName,
          approvalStage: "manager",
        });
      } catch (emailError) {
        console.error("Travel approval email failed:", emailError);
      }

      setTravelFormData((prev) => ({
        ...initialTravelForm,
        managerId: prev.managerId,
        managerName: prev.managerName,
        managerEmail: prev.managerEmail,
      }));
      setShowTravelForm(false);
      await fetchData();
    } catch (error) {
      console.error("Error submitting travel request:", error);
    } finally {
      setTravelFormLoading(false);
    }
  };

  const requestSummary = [
    {
      title: "Advance Requests",
      count: advanceRequests.length,
      icon: "fa-wallet",
      accent: "blue",
      onNew: () => setShowAdvanceForm(true),
    },
    {
      title: "Refund Requests",
      count: refundRequests.length,
      icon: "fa-money-bill-transfer",
      accent: "green",
      onNew: () => setShowRefundForm(true),
    },
    {
      title: "Leave Requests",
      count: leaveRequests.length,
      icon: "fa-calendar-days",
      accent: "orange",
      onNew: () => setShowLeaveForm(true),
    },
    {
      title: "Travel Requests",
      count: travelRequests.length,
      icon: "fa-plane",
      accent: "indigo",
      onNew: () => setShowTravelForm(true),
    },
  ];

  const summaryTheme = {
    blue: {
      iconBg: "bg-blue-100",
      iconText: "text-blue-600",
      button: "bg-blue-600 hover:bg-blue-700",
    },
    green: {
      iconBg: "bg-emerald-100",
      iconText: "text-emerald-600",
      button: "bg-emerald-600 hover:bg-emerald-700",
    },
    orange: {
      iconBg: "bg-orange-100",
      iconText: "text-orange-600",
      button: "bg-orange-600 hover:bg-orange-700",
    },
    indigo: {
      iconBg: "bg-indigo-100",
      iconText: "text-indigo-600",
      button: "bg-indigo-600 hover:bg-indigo-700",
    },
  };

  const renderTable = (title, rows, columns, emptyText) => (
    <div className="rounded-xl border border-[#dbe0e6] bg-white shadow-sm">
      <div className="border-b border-[#dbe0e6] px-6 py-4">
        <h3 className="text-lg font-bold text-[#111418]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td
                  className="px-6 py-10 text-center text-slate-500"
                  colSpan={columns.length}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.id || `${title}-${index}`}
                  className="hover:bg-slate-50"
                >
                  {row.cells.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 text-sm text-[#111418]"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const getLeaveTypeAllocationInfo = () => {
    if (!leaveFormData.leaveType || !leaveAllocation) return { allocated: 0, used: 0, available: 0 };
    
    let allocated = 0;
    let used = 0;
    switch (leaveFormData.leaveType) {
      case "annual":
        allocated = leaveAllocation.annualLeave || 0;
        used = leaveAllocation.annualLeaveUsed || 0;
        break;
      case "sick":
        allocated = leaveAllocation.sickLeave || 0;
        used = leaveAllocation.sickLeaveUsed || 0;
        break;
      case "personal":
        allocated = leaveAllocation.personalLeave || 0;
        used = leaveAllocation.personalLeaveUsed || 0;
        break;
      case "unpaid":
        allocated = 999;
        used = 0;
        break;
      default:
        allocated = 0;
        used = 0;
    }
    return {
      allocated,
      used,
      available: allocated === 999 ? "Unlimited" : allocated - used
    };
  };

  const allocationInfo = getLeaveTypeAllocationInfo();

  const historyPills = [
    { id: "all", label: "All History", icon: "fa-list-ul", count: advanceRequests.length + refundRequests.length + leaveRequests.length + travelRequests.length },
    { id: "leave", label: "Leaves", icon: "fa-calendar-days", count: leaveRequests.length },
    { id: "travel", label: "Travels", icon: "fa-plane", count: travelRequests.length },
    { id: "advance", label: "Advances", icon: "fa-wallet", count: advanceRequests.length },
    { id: "refund", label: "Refunds", icon: "fa-money-bill-transfer", count: refundRequests.length },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Approval", icon: "fa-clipboard-check" },
        ]}
      />

      {/* Dynamic Action Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between px-6 pt-6 pb-2 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#111418] tracking-tight">Approvals & Requests</h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit advance, refund, leave, and travel requests, and approve team submissions.
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>New Request</span>
            <i className="fa-solid fa-chevron-down text-xs ml-1" />
          </button>
          
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-20">
                <button
                  onClick={() => {
                    setShowAdvanceForm(true);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                    <i className="fa-solid fa-wallet text-xs" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Advance Expense</p>
                    <p className="text-xs text-slate-500">Request cash or prepayment</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowRefundForm(true);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                    <i className="fa-solid fa-money-bill-transfer text-xs" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Refund</p>
                    <p className="text-xs text-slate-500">Expense reimbursements</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowLeaveForm(true);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100 text-orange-600">
                    <i className="fa-solid fa-calendar-days text-xs" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Leave Request</p>
                    <p className="text-xs text-slate-500">Annual or sick leave</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setShowTravelForm(true);
                    setDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                    <i className="fa-solid fa-plane text-xs" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Travel Request</p>
                    <p className="text-xs text-slate-500">Plan business travel</p>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 p-4 md:p-6">
        {loading ? <ModuleLoader moduleName="Approvals" /> : null}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {requestSummary.map((item) => {
            const theme = summaryTheme[item.accent];

            return (
              <div
                key={item.title}
                className="rounded-xl border border-[#dbe0e6] bg-white p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[#617589] font-medium">{item.title}</p>
                    <p className="mt-1 text-3xl font-bold text-[#111418]">
                      {item.count}
                    </p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.iconBg}`}
                  >
                    <i
                      className={`fa-solid ${item.icon} ${theme.iconText} text-xl`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab("my-requests")}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
              activeTab === "my-requests"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab("pending-approvals")}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-2 ${
              activeTab === "pending-approvals"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "my-requests" ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            {/* Left Column: History filter and tables */}
            <div className="lg:col-span-3 space-y-6">
              {/* Pills Filter */}
              <div className="flex flex-wrap gap-2 pb-2">
                {historyPills.map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setActiveHistoryPill(pill.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                      activeHistoryPill === pill.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <i className={`fa-solid ${pill.icon} text-xs`} />
                    <span>{pill.label}</span>
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      activeHistoryPill === pill.id
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Dynamic Tables rendering based on pill selection */}
              {activeHistoryPill === "all" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {renderTable(
                      "Advance History",
                      advanceRequests.map((request) => ({
                        id: request._id || request.id,
                        cells: [
                          request.requestDate
                            ? formatDate(request.requestDate)
                            : formatDate(request.createdAt),
                          request.purpose || "N/A",
                          formatMoney(request.amount, request.currency),
                          request.approver || "Auto-assigned",
                          request.attachment ? (
                            <a
                              href={request.attachment}
                              download={request.attachmentName || "attachment"}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                              title={request.attachmentName}
                            >
                              <i className="fa-solid fa-paperclip text-xs" />
                              <span className="max-w-[80px] truncate text-xs">{request.attachmentName || "View"}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">None</span>
                          ),
                          <span
                            key={`${request._id || request.id}-status`}
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                          >
                            {request.status || "pending"}
                          </span>,
                        ],
                      })),
                      ["Date", "Purpose", "Amount", "Approver", "Attachment", "Status"],
                      "No advance requests found.",
                    )}

                    {renderTable(
                      "Refund History",
                      refundRequests.map((request) => ({
                        id: request._id || request.id,
                        cells: [
                          request.requestDate
                            ? formatDate(request.requestDate)
                            : formatDate(request.createdAt),
                          request.category || "N/A",
                          formatMoney(request.amount, request.currency),
                          request.approver || "Auto-assigned",
                          <span
                            key={`${request._id || request.id}-status`}
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                          >
                            {request.status || "pending"}
                          </span>,
                        ],
                      })),
                      ["Date", "Category", "Amount", "Approver", "Status"],
                      "No refund requests found.",
                    )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {renderTable(
                      "Leave History",
                      leaveRequests.map((request) => ({
                        id: request._id || request.id,
                        cells: [
                          `${formatDate(request.fromDate)} - ${formatDate(request.toDate)}`,
                          request.leaveType || "Leave",
                          `${request.days || 0} day(s)`,
                          request.managerName || "Manager",
                          request.attachment ? (
                            <a
                              href={request.attachment}
                              download={request.attachmentName || "attachment"}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                              title={request.attachmentName}
                            >
                              <i className="fa-solid fa-paperclip text-xs" />
                              <span className="max-w-[80px] truncate text-xs">{request.attachmentName || "View"}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">None</span>
                          ),
                          <span
                            key={`${request._id || request.id}-status`}
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                          >
                            {request.status || "pending"}
                          </span>,
                        ],
                      })),
                      ["Dates", "Type", "Days", "Approver", "Attachment", "Status"],
                      "No leave requests found.",
                    )}

                    {renderTable(
                      "Travel History",
                      travelRequests.map((request) => ({
                        id: request._id || request.id,
                        cells: [
                          `${formatDate(request.fromDate)} - ${formatDate(request.toDate)}`,
                          request.destination || "N/A",
                          request.budget ? formatMoney(request.budget) : "N/A",
                          request.managerName || "Manager",
                          <span
                            key={`${request._id || request.id}-status`}
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                          >
                            {request.status || "pending"}
                          </span>,
                        ],
                      })),
                      ["Dates", "Destination", "Budget", "Approver", "Status"],
                      "No travel requests found.",
                    )}
                  </div>
                </div>
              )}

              {activeHistoryPill === "advance" && (
                renderTable(
                  "Advance History",
                  advanceRequests.map((request) => ({
                    id: request._id || request.id,
                    cells: [
                      request.requestDate
                        ? formatDate(request.requestDate)
                        : formatDate(request.createdAt),
                      request.purpose || "N/A",
                      formatMoney(request.amount, request.currency),
                      request.approver || "Auto-assigned",
                      request.attachment ? (
                        <a
                          href={request.attachment}
                          download={request.attachmentName || "attachment"}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                          title={request.attachmentName}
                        >
                          <i className="fa-solid fa-paperclip text-xs" />
                          <span className="max-w-[80px] truncate text-xs">{request.attachmentName || "View"}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      ),
                      <span
                        key={`${request._id || request.id}-status`}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                      >
                        {request.status || "pending"}
                      </span>,
                    ],
                  })),
                  ["Date", "Purpose", "Amount", "Approver", "Attachment", "Status"],
                  "No advance requests found.",
                )
              )}

              {activeHistoryPill === "refund" && (
                renderTable(
                  "Refund History",
                  refundRequests.map((request) => ({
                    id: request._id || request.id,
                    cells: [
                      request.requestDate
                        ? formatDate(request.requestDate)
                        : formatDate(request.createdAt),
                      request.category || "N/A",
                      formatMoney(request.amount, request.currency),
                      request.approver || "Auto-assigned",
                      <span
                        key={`${request._id || request.id}-status`}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                      >
                        {request.status || "pending"}
                      </span>,
                    ],
                  })),
                  ["Date", "Category", "Amount", "Approver", "Status"],
                  "No refund requests found.",
                )
              )}

              {activeHistoryPill === "leave" && (
                renderTable(
                  "Leave History",
                  leaveRequests.map((request) => ({
                    id: request._id || request.id,
                    cells: [
                      `${formatDate(request.fromDate)} - ${formatDate(request.toDate)}`,
                      request.leaveType || "Leave",
                      `${request.days || 0} day(s)`,
                      request.managerName || "Manager",
                      request.attachment ? (
                        <a
                          href={request.attachment}
                          download={request.attachmentName || "attachment"}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold"
                          title={request.attachmentName}
                        >
                          <i className="fa-solid fa-paperclip text-xs" />
                          <span className="max-w-[80px] truncate text-xs">{request.attachmentName || "View"}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      ),
                      <span
                        key={`${request._id || request.id}-status`}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                      >
                        {request.status || "pending"}
                      </span>,
                    ],
                  })),
                  ["Dates", "Type", "Days", "Approver", "Attachment", "Status"],
                  "No leave requests found.",
                )
              )}

              {activeHistoryPill === "travel" && (
                renderTable(
                  "Travel History",
                  travelRequests.map((request) => ({
                    id: request._id || request.id,
                    cells: [
                      `${formatDate(request.fromDate)} - ${formatDate(request.toDate)}`,
                      request.destination || "N/A",
                      request.budget ? formatMoney(request.budget) : "N/A",
                      request.managerName || "Manager",
                      <span
                        key={`${request._id || request.id}-status`}
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(request.status)}`}
                      >
                        {request.status || "pending"}
                      </span>,
                    ],
                  })),
                  ["Dates", "Destination", "Budget", "Approver", "Status"],
                  "No travel requests found.",
                )
              )}
            </div>

            {/* Right Column: Leave Balance Widget */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-[#dbe0e6] bg-white p-6 shadow-sm sticky top-6">
                <h3 className="text-lg font-bold text-[#111418] border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-chart-simple text-blue-600 text-sm" />
                  Leave Balance
                </h3>
                {leaveAllocation ? (
                  <div className="space-y-3.5 text-sm">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between transition-all hover:bg-slate-100/70">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Leave</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {leaveAllocation.annualLeave || 0}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                        <i className="fa-solid fa-calendar-days text-lg" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between transition-all hover:bg-slate-100/70">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sick Leave</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {leaveAllocation.sickLeave || 0}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <i className="fa-solid fa-notes-medical text-lg" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between transition-all hover:bg-slate-100/70">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Leave</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {leaveAllocation.personalLeave || 0}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <i className="fa-solid fa-user-clock text-lg" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex items-center justify-between transition-all hover:bg-slate-100/70">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Requested Days</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900 text-slate-600">
                          {calculatedDays}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <i className="fa-solid fa-clock text-lg" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 text-center">
                    Leave allocation is not available yet.
                  </div>
                )}

                {remainingLeave ? (
                  <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-900 border border-blue-100">
                    <div className="flex gap-2">
                      <i className="fa-solid fa-circle-info mt-0.5 text-blue-600" />
                      <div>
                        <span className="font-semibold">Remaining Balance:</span>
                        <span className="ml-1 font-bold">{remainingLeave.remaining} days</span>
                        <p className="text-xs text-blue-700 mt-1">Estimated remaining balance after current request approval.</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#dbe0e6] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Approvals Inbox</h3>
                <p className="text-sm text-slate-500">Action request submissions routed to you.</p>
              </div>
            </div>
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <i className="fa-solid fa-clipboard-check text-4xl mb-3 text-slate-300"></i>
                <p className="font-medium text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No requests currently pending your decision.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-slate-600">Requester</th>
                      <th className="px-6 py-3 font-semibold text-slate-600">Type</th>
                      <th className="px-6 py-3 font-semibold text-slate-600">Details</th>
                      <th className="px-6 py-3 font-semibold text-slate-600 font-medium">Attachment</th>
                      <th className="px-6 py-3 font-semibold text-slate-600">Date</th>
                      <th className="px-6 py-3 font-semibold text-slate-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingApprovals.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-900">{req.employeeName}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            req.type === 'leave' ? 'bg-orange-100 text-orange-800' :
                            req.type === 'travel' ? 'bg-indigo-100 text-indigo-800' :
                            req.type === 'advance' ? 'bg-blue-100 text-blue-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {req.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={req.details}>
                          {req.details}
                        </td>
                        <td className="px-6 py-4">
                          {req.attachment ? (
                            <a
                              href={req.attachment}
                              download={req.attachmentName || "attachment"}
                              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold"
                              title={req.attachmentName}
                            >
                              <i className="fa-solid fa-paperclip text-xs" />
                              <span className="max-w-[100px] truncate text-xs">{req.attachmentName || "View"}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">{formatDate(req.date)}</td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPendingRequest(req);
                              setApprovalActionType("approve");
                            }}
                            className="inline-flex items-center justify-center rounded-lg bg-green-600 text-white font-semibold text-xs px-3 py-1.5 hover:bg-green-700 transition-colors"
                          >
                            <i className="fa-solid fa-check mr-1.5"></i> Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPendingRequest(req);
                              setApprovalActionType("reject");
                            }}
                            className="inline-flex items-center justify-center rounded-lg bg-red-600 text-white font-semibold text-xs px-3 py-1.5 hover:bg-red-700 transition-colors"
                          >
                            <i className="fa-solid fa-xmark mr-1.5"></i> Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Dialog Modal */}
      {selectedPendingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                Confirm {approvalActionType === "approve" ? "Approval" : "Rejection"}
              </h3>
              <button
                onClick={() => {
                  setSelectedPendingRequest(null);
                  setActionComments("");
                }}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <i className="fa-solid fa-times" />
              </button>
            </div>
            <form onSubmit={handleApprovalAction} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600">
                  Are you sure you want to <strong>{approvalActionType}</strong> this {selectedPendingRequest.type} request from <strong>{selectedPendingRequest.employeeName}</strong>?
                </p>
                <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedPendingRequest.details}
                </p>
              </div>

              {selectedPendingRequest.attachment && (
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Supporting Attachment
                  </span>
                  <a
                    href={selectedPendingRequest.attachment}
                    download={selectedPendingRequest.attachmentName || "attachment"}
                    className="inline-flex w-full items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <i className="fa-solid fa-paperclip text-xs" />
                      <span className="truncate">{selectedPendingRequest.attachmentName || "Download Attachment"}</span>
                    </span>
                    <i className="fa-solid fa-download text-xs" />
                  </a>
                </div>
              )}

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Comments / Remarks (Optional)
                </label>
                <textarea
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  rows="3"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide details or instructions here..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPendingRequest(null);
                    setActionComments("");
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 rounded-lg text-white font-semibold text-sm px-4 py-2 transition-colors ${
                    approvalActionType === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? "Submitting..." : `Yes, ${approvalActionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdvanceForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">
                New Advance Request
              </h3>
              <button
                onClick={() => setShowAdvanceForm(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <i className="fa-solid fa-times" />
              </button>
            </div>
            <form
              onSubmit={handleAdvanceSubmit}
              className="space-y-4 overflow-y-auto p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  type="number"
                  value={advanceFormData.amount}
                  onChange={(e) =>
                    setAdvanceFormData({
                      ...advanceFormData,
                      amount: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Purpose
                </label>
                <select
                  value={advanceFormData.purpose}
                  onChange={(e) =>
                    setAdvanceFormData({
                      ...advanceFormData,
                      purpose: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  required
                >
                  <option value="">Select purpose...</option>
                  <option value="Medical Emergency">Medical Emergency</option>
                  <option value="Home Repair">Home Repair</option>
                  <option value="Education">Education</option>
                  <option value="Travel">Travel</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <textarea
                  value={advanceFormData.reason}
                  onChange={(e) =>
                    setAdvanceFormData({
                      ...advanceFormData,
                      reason: e.target.value,
                    })
                  }
                  rows="4"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Currency
                  </label>
                  <select
                    value={advanceFormData.currency}
                    onChange={(e) =>
                      setAdvanceFormData({
                        ...advanceFormData,
                        currency: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="NGN">NGN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Supporting Document
                </label>
                {!advanceFormData.attachment ? (
                  <div className="flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-6 transition-colors hover:border-slate-400">
                    <div className="text-center">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2" />
                      <div className="mt-1 flex text-sm text-slate-600 justify-center">
                        <label className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAdvanceFormData((prev) => ({
                                    ...prev,
                                    attachment: reader.result,
                                    attachmentName: file.name,
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">PDF, PNG, JPG, or DOC up to 5MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <i className="fa-solid fa-file-lines" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-xs" title={advanceFormData.attachmentName}>
                          {advanceFormData.attachmentName}
                        </p>
                        <p className="text-xs text-slate-500">Ready to upload</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAdvanceFormData((prev) => ({
                          ...prev,
                          attachment: "",
                          attachmentName: "",
                        }));
                      }}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanceForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showRefundForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">
                New Refund Request
              </h3>
              <button
                onClick={() => setShowRefundForm(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <i className="fa-solid fa-times" />
              </button>
            </div>
            <form
              onSubmit={handleRefundSubmit}
              className="space-y-4 overflow-y-auto p-6"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  type="number"
                  value={refundFormData.amount}
                  onChange={(e) =>
                    setRefundFormData({
                      ...refundFormData,
                      amount: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={refundFormData.category}
                  onChange={(e) =>
                    setRefundFormData({
                      ...refundFormData,
                      category: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="Travel">Travel</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Training">Training</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <textarea
                  value={refundFormData.reason}
                  onChange={(e) =>
                    setRefundFormData({
                      ...refundFormData,
                      reason: e.target.value,
                    })
                  }
                  rows="4"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Currency
                  </label>
                  <select
                    value={refundFormData.currency}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        currency: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="NGN">NGN</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Receipt Number
                  </label>
                  <input
                    type="text"
                    value={refundFormData.receiptNumber}
                    onChange={(e) =>
                      setRefundFormData({
                        ...refundFormData,
                        receiptNumber: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={refundFormData.transactionDate}
                  onChange={(e) =>
                    setRefundFormData({
                      ...refundFormData,
                      transactionDate: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showLeaveForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">
                New Leave Request
              </h3>
              <button
                onClick={() => setShowLeaveForm(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <i className="fa-solid fa-times" />
              </button>
            </div>
            <form
              onSubmit={handleLeaveSubmit}
              className="space-y-4 overflow-y-auto p-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Leave Type
                  </label>
                  <select
                    value={leaveFormData.leaveType}
                    onChange={(e) =>
                      setLeaveFormData({
                        ...leaveFormData,
                        leaveType: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  >
                    <option value="">Select type...</option>
                    <option value="annual">Annual</option>
                    <option value="sick">Sick</option>
                    <option value="personal">Personal</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Requested Days
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
                    {calculatedDays}
                  </div>
                </div>
              </div>

              {leaveFormData.leaveType && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Total Allocation
                    </label>
                    <input
                      type="text"
                      value={allocationInfo.allocated === 999 ? "Unlimited" : `${allocationInfo.allocated} days`}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 cursor-not-allowed"
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Available Balance
                    </label>
                    <input
                      type="text"
                      value={typeof allocationInfo.available === "number" ? `${allocationInfo.available} days` : allocationInfo.available}
                      className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 cursor-not-allowed font-semibold ${
                        typeof allocationInfo.available === "number" && allocationInfo.available <= 0
                          ? "text-red-600"
                          : "text-emerald-600"
                      }`}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    From
                  </label>
                  <input
                    type="date"
                    value={leaveFormData.fromDate}
                    onChange={(e) =>
                      setLeaveFormData({
                        ...leaveFormData,
                        fromDate: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    To
                  </label>
                  <input
                    type="date"
                    value={leaveFormData.toDate}
                    onChange={(e) =>
                      setLeaveFormData({
                        ...leaveFormData,
                        toDate: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Reason
                </label>
                <textarea
                  value={leaveFormData.reason}
                  onChange={(e) =>
                    setLeaveFormData({
                      ...leaveFormData,
                      reason: e.target.value,
                    })
                  }
                  rows="4"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Supporting Attachment <span className="text-red-500">*</span>
                </label>
                {!leaveFormData.attachment ? (
                  <div className="flex justify-center rounded-lg border-2 border-dashed border-slate-300 px-6 py-6 transition-colors hover:border-slate-400">
                    <div className="text-center">
                      <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-400 mb-2" />
                      <div className="mt-1 flex text-sm text-slate-600 justify-center">
                        <label className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setLeaveFormData((prev) => ({
                                    ...prev,
                                    attachment: reader.result,
                                    attachmentName: file.name,
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">PDF, PNG, JPG, or DOC up to 5MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <i className="fa-solid fa-file-lines" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 truncate max-w-xs" title={leaveFormData.attachmentName}>
                          {leaveFormData.attachmentName}
                        </p>
                        <p className="text-xs text-slate-500">Ready to upload</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveFormData((prev) => ({
                          ...prev,
                          attachment: "",
                          attachmentName: "",
                        }));
                      }}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                      <i className="fa-solid fa-trash-can" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <input type="hidden" value={leaveFormData.managerId} readOnly />
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="block text-xs text-slate-500">Manager</span>
                  {leaveFormData.managerName || "Not assigned"}
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
                  <span className="block text-xs text-slate-500">
                    Manager Email
                  </span>
                  {leaveFormData.managerEmail || "Not assigned"}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showTravelForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-bold text-slate-900">
                New Travel Request
              </h3>
              <button
                onClick={() => setShowTravelForm(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <i className="fa-solid fa-times" />
              </button>
            </div>
            <form
              onSubmit={handleTravelSubmit}
              className="space-y-4 overflow-y-auto p-6"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={travelFormData.currentLocation}
                    onChange={(e) =>
                      setTravelFormData({
                        ...travelFormData,
                        currentLocation: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={travelFormData.destination}
                    onChange={(e) =>
                      setTravelFormData({
                        ...travelFormData,
                        destination: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Purpose
                  </label>
                  <input
                    type="text"
                    value={travelFormData.purpose}
                    onChange={(e) =>
                      setTravelFormData({
                        ...travelFormData,
                        purpose: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Budget
                  </label>
                  <input
                    type="number"
                    value={travelFormData.budget}
                    onChange={(e) =>
                      setTravelFormData({
                        ...travelFormData,
                        budget: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    From
                  </label>
                  <input
                    type="date"
                    value={travelFormData.fromDate}
                    onChange={(e) =>
                      setTravelFormData({
                        ...travelFormData,
                        fromDate: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    To
                  </label>
                  <input
                    type="date"
                    value={travelFormData.toDate}
                    onChange={(e) =>
                      setTravelFormData({
                        ...travelFormData,
                        toDate: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 px-4 py-3"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="block text-xs text-slate-500">Days</span>
                  {travelFormData.numberOfDays}
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <span className="block text-xs text-slate-500">Nights</span>
                  {travelFormData.numberOfNights}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  value={travelFormData.description}
                  onChange={(e) =>
                    setTravelFormData({
                      ...travelFormData,
                      description: e.target.value,
                    })
                  }
                  rows="4"
                  className="w-full rounded-lg border border-slate-200 px-4 py-3"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={travelFormData.accommodationRequired}
                  onChange={(e) =>
                    setTravelFormData({
                      ...travelFormData,
                      accommodationRequired: e.target.checked,
                    })
                  }
                />
                <span>Accommodation required</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:col-span-1">
                  <span className="block text-xs text-slate-500">Manager</span>
                  {travelFormData.managerName || "Not assigned"}
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
                  <span className="block text-xs text-slate-500">
                    Manager Email
                  </span>
                  {travelFormData.managerEmail || "Not assigned"}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTravelForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-700"
                  disabled={travelFormLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white"
                  disabled={travelFormLoading}
                >
                  {travelFormLoading ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}


    </div>
  );
};

export default Approval;
