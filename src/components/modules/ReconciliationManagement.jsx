import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/useAuth";
import { useAppContext } from "../../context/useAppContext";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";

const ReconciliationManagement = ({
  onBack,
  onBackToHistory,
  showHistoryBreadcrumb = false,
  forceFreshStart = false,
  initialMonthYear = "",
  initialLineItems = [],
  initialEvidenceFiles = [],
  initialPreviousClosingBalance,
  initialInflowAmount,
  onBreakdownUpdated,
}) => {
  const { user } = useAuth();
  const resolvedUserId = user?.id || user?._id || user?.userId || "";
  const resolvedEmployeeName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Employee";
  const [lineItems, setLineItems] = useState([]);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [userList, setUserList] = useState([]);
  const [isLoadingMentionUsers, setIsLoadingMentionUsers] = useState(false);
  const [hasAttemptedMentionUsersLoad, setHasAttemptedMentionUsersLoad] =
    useState(false);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [reviewedLineItemIds, setReviewedLineItemIds] = useState([]);
  const commentRef = useRef(null);
  const autoFillToastMonthRef = useRef("");
  const [newItem, setNewItem] = useState({
    date: "",
    description: "",
    quantity: "",
    amount: "",
  });
  const [monthStatus, setMonthStatus] = useState("draft");
  const [submittedOn, setSubmittedOn] = useState("");
  const [reconciledOn, setReconciledOn] = useState("");
  const [activeBreakdownId, setActiveBreakdownId] = useState("");
  const {
    monthYear,
    setMonthYear,
    previousClosingBalance,
    setPreviousClosingBalance,
    inflowAmount,
    setInflowAmount,
  } = useAppContext();

  const shouldAutoFillPreviousBalance =
    !(Array.isArray(initialLineItems) && initialLineItems.length > 0) &&
    initialPreviousClosingBalance === undefined &&
    initialInflowAmount === undefined;

  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase();
  const normalizedDepartment = String(user?.department || "")
    .trim()
    .toLowerCase();
  const isAdminUser = normalizedRole === "admin";
  const canReconcile =
    normalizedRole === "admin" ||
    normalizedRole === "security admin" ||
    normalizedDepartment.includes("finance");
  const isMonthSubmitted = monthStatus === "submitted";
  const isMonthReconciled = monthStatus === "reconciled";
  const isReadOnly = isMonthReconciled || (isMonthSubmitted && !canReconcile);
  const isFinanceReviewMode =
    canReconcile && (isMonthSubmitted || isMonthReconciled);

  useEffect(() => {
    if (!forceFreshStart) return;

    setLineItems([]);
    setEvidenceFiles([]);
    setCommentText("");
    setNewItem({ date: "", description: "", quantity: "", amount: "" });
    setReviewedLineItemIds([]);
    setMonthStatus("draft");
    setSubmittedOn("");
    setReconciledOn("");
    setActiveBreakdownId("");
    setMonthYear(new Date().toISOString().slice(0, 7));
    setPreviousClosingBalance("");
    setInflowAmount("");
  }, [
    forceFreshStart,
    setInflowAmount,
    setMonthYear,
    setPreviousClosingBalance,
  ]);

  useEffect(() => {
    if (initialMonthYear && initialMonthYear !== monthYear) {
      setMonthYear(initialMonthYear);
    }
  }, [initialMonthYear, monthYear, setMonthYear]);

  useEffect(() => {
    if (Array.isArray(initialLineItems) && initialLineItems.length > 0) {
      setLineItems(initialLineItems);
    }
    if (
      Array.isArray(initialEvidenceFiles) &&
      initialEvidenceFiles.length > 0
    ) {
      setEvidenceFiles(initialEvidenceFiles);
    }
    if (initialPreviousClosingBalance !== undefined) {
      setPreviousClosingBalance(initialPreviousClosingBalance);
    }
    if (initialInflowAmount !== undefined) {
      setInflowAmount(initialInflowAmount);
    }
  }, [
    initialLineItems,
    initialEvidenceFiles,
    initialPreviousClosingBalance,
    initialInflowAmount,
    setPreviousClosingBalance,
    setInflowAmount,
  ]);

  useEffect(() => {
    const checkMonthStatus = async () => {
      const addMonthToMonthYear = (baseMonthYear, monthOffset = 1) => {
        const [year, month] = String(baseMonthYear || "").split("-");
        const date = new Date(Number(year), Number(month) - 1 + monthOffset, 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      };

      const findNextDraftMonthYear = (startMonthYear, breakdowns) => {
        const finalizedMonths = new Set(
          (breakdowns || [])
            .filter(
              (entry) =>
                ["submitted", "reconciled"].includes(entry?.status) &&
                entry?.monthYear,
            )
            .map((entry) => entry.monthYear),
        );

        let candidate = startMonthYear;
        for (let i = 0; i < 24; i += 1) {
          if (!finalizedMonths.has(candidate)) return candidate;
          candidate = addMonthToMonthYear(candidate, 1);
        }

        return addMonthToMonthYear(startMonthYear, 1);
      };

      if (!monthYear || !resolvedUserId) {
        setMonthStatus("draft");
        setSubmittedOn("");
        setReconciledOn("");
        setActiveBreakdownId("");
        return;
      }

      try {
        const response = await apiService.get(
          `/api/retirement-breakdown?userId=${resolvedUserId}`,
        );
        const breakdowns = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const monthBreakdowns = breakdowns.filter(
          (breakdown) => breakdown.monthYear === monthYear,
        );

        const hasFinalized = monthBreakdowns.some((breakdown) =>
          ["submitted", "reconciled"].includes(breakdown.status),
        );

        if (forceFreshStart && hasFinalized) {
          const nextDraftMonth = findNextDraftMonthYear(monthYear, breakdowns);
          if (nextDraftMonth !== monthYear) {
            setMonthStatus("draft");
            setSubmittedOn("");
            setReconciledOn("");
            setActiveBreakdownId("");
            setReviewedLineItemIds([]);
            autoFillToastMonthRef.current = "";
            setMonthYear(nextDraftMonth);
            return;
          }
        }

        const sortedMonthBreakdowns = [...monthBreakdowns].sort((a, b) => {
          const left = String(a?.updatedAt || a?.createdAt || "");
          const right = String(b?.updatedAt || b?.createdAt || "");
          return right.localeCompare(left);
        });

        const reconciledRecord = sortedMonthBreakdowns.find(
          (breakdown) => breakdown.status === "reconciled",
        );
        const submittedRecord = sortedMonthBreakdowns.find(
          (breakdown) => breakdown.status === "submitted",
        );
        const draftRecord = sortedMonthBreakdowns.find(
          (breakdown) => breakdown.status === "draft",
        );

        const activeRecord = reconciledRecord || submittedRecord || draftRecord;

        setMonthStatus(activeRecord?.status || "draft");
        setSubmittedOn(submittedRecord?.submittedDate || "");
        setReconciledOn(reconciledRecord?.reconciledDate || "");
        setActiveBreakdownId(activeRecord?._id || "");
        setReviewedLineItemIds([]);

        if (shouldAutoFillPreviousBalance) {
          const [year, month] = monthYear.split("-");
          const prevMonth = parseInt(month) - 1;
          let prevYear = parseInt(year);
          let prevMonthStr;

          if (prevMonth < 1) {
            prevYear -= 1;
            prevMonthStr = `${prevYear}-12`;
          } else {
            prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
          }

          const prevMonthData = breakdowns.find(
            (breakdown) =>
              breakdown.monthYear === prevMonthStr &&
              breakdown.status === "reconciled",
          );

          if (prevMonthData) {
            setPreviousClosingBalance(prevMonthData.newOpeningBalance || 0);
            if (autoFillToastMonthRef.current !== monthYear) {
              toast.success(
                `Previous closing balance auto-filled: ${formatCurrency(
                  prevMonthData.newOpeningBalance || 0,
                )}`,
              );
              autoFillToastMonthRef.current = monthYear;
            }
          } else {
            setPreviousClosingBalance("");
          }
        }
      } catch (error) {
        const errorCode = error?.code;
        if (errorCode !== "ECONNABORTED" && errorCode !== "ERR_NETWORK") {
          console.error("Error checking reconciliation status:", error);
        }
      }
    };

    checkMonthStatus();
  }, [
    monthYear,
    resolvedUserId,
    forceFreshStart,
    setMonthYear,
    setPreviousClosingBalance,
    shouldAutoFillPreviousBalance,
  ]);

  const fetchMentionUsers = useCallback(async () => {
    if (isLoadingMentionUsers || hasAttemptedMentionUsersLoad) return;

    setIsLoadingMentionUsers(true);
    setHasAttemptedMentionUsersLoad(true);

    try {
      const response = await apiService.get("/api/hr/employees", {
        params: { limit: 120, page: 1 },
        timeout: 10000,
      });
      const employees = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.employees)
            ? response.employees
            : [];

      setUserList(
        employees
          .map((emp) => ({
            id: emp._id || emp.id || emp.userId,
            name: emp.fullName || emp.name,
            email: emp.email || "",
          }))
          .filter((emp) => emp.name),
      );
    } catch (error) {
      const errorCode = error?.code;
      if (errorCode !== "ECONNABORTED" && errorCode !== "ERR_NETWORK") {
        console.error("Error fetching users for mentions:", error);
      }
      setUserList([]);
    } finally {
      setIsLoadingMentionUsers(false);
    }
  }, [hasAttemptedMentionUsersLoad, isLoadingMentionUsers]);

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setCommentText(value);

    const cursorPos = e.target.selectionStart;
    const textBefore = value.substring(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentionDropdown(true);
      setMentionSearch(atMatch[1].toLowerCase());
      if (!hasAttemptedMentionUsersLoad) {
        fetchMentionUsers();
      }
    } else {
      setShowMentionDropdown(false);
      setMentionSearch("");
    }
  };

  const handleMentionSelect = (userName) => {
    const textarea = commentRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBefore = commentText.substring(0, cursorPos);
    const textAfter = commentText.substring(cursorPos);
    const replacedBefore = textBefore.replace(/@(\w*)$/, `@${userName} `);
    const nextText = replacedBefore + textAfter;

    setCommentText(nextText);
    setShowMentionDropdown(false);
    setMentionSearch("");

    requestAnimationFrame(() => {
      textarea.focus();
      const nextPos = replacedBefore.length;
      textarea.setSelectionRange(nextPos, nextPos);
    });
  };

  const handleAddLineItem = () => {
    if (isReadOnly) {
      toast.error("This month is read-only");
      return;
    }

    const parsedQuantity = parseFloat(newItem.quantity);
    const parsedAmount = parseFloat(newItem.amount);

    if (
      !newItem.date.trim() ||
      !newItem.description.trim() ||
      Number.isNaN(parsedQuantity) ||
      parsedQuantity <= 0 ||
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    const item = {
      id: Date.now(),
      date: newItem.date,
      description: newItem.description.trim(),
      quantity: parsedQuantity,
      amount: parsedAmount,
    };

    setLineItems([...lineItems, item]);
    setNewItem({ date: "", description: "", quantity: "", amount: "" });
    toast.success("Expense item added");
  };

  const handleRemoveLineItem = (id) => {
    if (isReadOnly) {
      toast.error("This month is read-only");
      return;
    }

    setLineItems(lineItems.filter((item) => item.id !== id));
    toast.success("Expense item removed");
  };

  const handleReviewLineItem = (id) => {
    if (!isFinanceReviewMode) return;

    setReviewedLineItemIds((prev) =>
      prev.includes(id) ? prev : [...prev, id],
    );
    toast.success("Line item marked as reconciled");
  };

  const handleUpdateLineItem = (id, field, value) => {
    if (isReadOnly) return;

    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (field === "description") {
          return { ...item, [field]: value };
        }

        if (field === "quantity" || field === "amount") {
          if (value === "") {
            return { ...item, [field]: "" };
          }
          const parsed = Number(value);
          return { ...item, [field]: Number.isNaN(parsed) ? "" : parsed };
        }

        return { ...item, [field]: value };
      }),
    );
  };

  const calculateTotal = () =>
    lineItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const amt = Number(item.amount) || 0;
      return sum + qty * amt;
    }, 0);

  const getEvidenceName = (file, fallbackIndex = 0) =>
    file?.fileName || file?.name || `Evidence ${fallbackIndex + 1}`;

  const getEvidenceHref = (file) => file?.fileData || file?.url || "";

  const normalizePickedEvidence = (files) =>
    Array.from(files || []).map((file, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: file.name,
      size: file.size,
      type: file.type,
      source: file,
    }));

  const serializeEvidenceFiles = async (items) =>
    Promise.all(
      (items || []).map(async (item) => {
        if (!item) return null;
        if (item.fileData) {
          return {
            fileName: item.fileName || item.name || "Evidence",
            fileType: item.fileType || item.type || "application/octet-stream",
            fileData: item.fileData,
            uploadedAt: item.uploadedAt || new Date().toISOString(),
            uploadedBy: item.uploadedBy || resolvedEmployeeName,
          };
        }

        if (!item.source) return null;

        const fileData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(item.source);
        });

        return {
          fileName: item.name || "Evidence",
          fileType: item.type || "application/octet-stream",
          fileData,
          uploadedAt: new Date().toISOString(),
          uploadedBy: resolvedEmployeeName,
        };
      }),
    ).then((result) => result.filter(Boolean));

  const calculateNewOpeningBalance = () =>
    (Number(previousClosingBalance) || 0) +
    (Number(inflowAmount) || 0) -
    calculateTotal();
  const formatMonthYear = (val) => {
    if (!val) return "";
    const [y, m] = val.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  };
  // Use centralized currency formatter

  const handleSubmitBreakdown = async () => {
    if (isMonthReconciled) {
      toast.error("This month is already reconciled");
      return;
    }

    if (isMonthSubmitted) {
      toast.error(
        "This month has already been submitted and is awaiting reconciliation",
      );
      return;
    }

    if (!resolvedUserId) {
      toast.error("Unable to determine current user. Please re-login.");
      return;
    }
    if (lineItems.length === 0)
      return toast.error("Please add at least one expense");
    if (!monthYear) return toast.error("Please select the month and year");
    if (previousClosingBalance === "")
      return toast.error("Please enter previous closing balance");

    try {
      const request = {
        userId: resolvedUserId,
        employeeName: resolvedEmployeeName,
        monthYear,
        previousClosingBalance: Number(previousClosingBalance) || 0,
        inflowAmount: Number(inflowAmount) || 0,
        lineItems,
        comment: commentText,
        evidenceFiles: await serializeEvidenceFiles(evidenceFiles),
        totalExpenses: calculateTotal(),
        newOpeningBalance: calculateNewOpeningBalance(),
        status: "submitted",
        submittedDate: new Date().toISOString().split("T")[0],
      };
      const response = await apiService.post(
        "/api/retirement-breakdown",
        request,
      );
      const saved = response?.data || null;
      setMonthStatus("submitted");
      setSubmittedOn(request.submittedDate);
      setActiveBreakdownId(saved?._id || activeBreakdownId);
      onBreakdownUpdated?.();
      toast.success("Expense breakdown submitted successfully");
    } catch (error) {
      toast.error("Failed to submit expense breakdown");
      console.error(error);
    }
  };

  const handleSaveDraft = async () => {
    if (isMonthSubmitted || isMonthReconciled) {
      toast.error("Cannot save draft after submission");
      return;
    }

    if (!resolvedUserId) {
      toast.error("Unable to determine current user. Please re-login.");
      return;
    }
    if (!monthYear) return toast.error("Please select the month and year");
    try {
      const request = {
        userId: resolvedUserId,
        employeeName: resolvedEmployeeName,
        monthYear,
        previousClosingBalance: Number(previousClosingBalance) || 0,
        inflowAmount: Number(inflowAmount) || 0,
        lineItems,
        comment: commentText,
        evidenceFiles: await serializeEvidenceFiles(evidenceFiles),
        totalExpenses: calculateTotal(),
        newOpeningBalance: calculateNewOpeningBalance(),
        status: "draft",
        submittedDate: new Date().toISOString().split("T")[0],
      };
      const response = await apiService.post(
        "/api/retirement-breakdown",
        request,
      );
      const saved = response?.data || null;
      setMonthStatus("draft");
      setActiveBreakdownId(saved?._id || activeBreakdownId);
      onBreakdownUpdated?.();
      toast.success("Draft saved");
    } catch (error) {
      toast.error(error?.serverData?.error || "Failed to save draft");
      console.error(error);
    }
  };

  const handleReconcileBreakdown = async () => {
    if (!isMonthSubmitted) {
      toast.error("Only submitted months can be reconciled");
      return;
    }

    if (!canReconcile) {
      toast.error("Only Finance/Admin can reconcile this month");
      return;
    }

    if (!activeBreakdownId) {
      toast.error("No submitted breakdown found for this month");
      return;
    }

    try {
      const payload = {
        monthYear,
        previousClosingBalance: Number(previousClosingBalance) || 0,
        inflowAmount: Number(inflowAmount) || 0,
        lineItems,
        comment: commentText,
        evidenceFiles: await serializeEvidenceFiles(evidenceFiles),
        totalExpenses: calculateTotal(),
        newOpeningBalance: calculateNewOpeningBalance(),
      };
      const response = await apiService.post(
        `/api/retirement-breakdown/${activeBreakdownId}/reconcile`,
        payload,
      );
      const reconciled = response?.data || null;
      setMonthStatus("reconciled");
      setReconciledOn(
        reconciled?.reconciledDate || new Date().toISOString().split("T")[0],
      );
      onBreakdownUpdated?.();
      toast.success("Breakdown reconciled and locked");
    } catch (error) {
      toast.error(
        error?.serverData?.message || "Failed to reconcile breakdown",
      );
      console.error(error);
    }
  };

  const handleUnlockBreakdown = async () => {
    if (!isMonthReconciled) return;

    if (!isAdminUser) {
      toast.error("Only Admin can unlock this breakdown");
      return;
    }

    if (!activeBreakdownId) {
      toast.error("No reconciled breakdown found for this month");
      return;
    }

    try {
      const response = await apiService.post(
        `/api/retirement-breakdown/${activeBreakdownId}/unlock`,
      );
      const unlocked = response?.data || null;
      setMonthStatus(unlocked?.status || "submitted");
      setReconciledOn("");
      setReviewedLineItemIds([]);
      onBreakdownUpdated?.();
      toast.success("Breakdown unlocked");
    } catch (error) {
      toast.error(error?.serverData?.message || "Failed to unlock breakdown");
      console.error(error);
    }
  };

  const handleReset = () => {
    if (isReadOnly || isMonthSubmitted) {
      toast.error("This month cannot be cleared in its current status");
      return;
    }

    setLineItems([]);
    setEvidenceFiles([]);
    setCommentText("");
    setNewItem({ date: "", description: "", quantity: "", amount: "" });
    toast.success("Expense breakdown cleared");
  };

  const breadcrumbItems = [
    { label: "Home", href: "/home", icon: "fa-house" },
    {
      label: "Finance",
      onClick: onBack,
      icon: "fa-calculator",
    },
  ];

  if (showHistoryBreadcrumb && typeof onBackToHistory === "function") {
    breadcrumbItems.push({
      label: "Reconciliation History",
      onClick: onBackToHistory,
      icon: "fa-history",
    });
  }

  breadcrumbItems.push({ label: "Reconciliation", icon: "fa-umbrella" });

  return (
    <div
      className={`min-h-screen ${
        isFinanceReviewMode ? "bg-[#eef4ff]" : "bg-[#f4f7fb]"
      }`}
    >
      <Breadcrumb items={breadcrumbItems} />

      <main className="min-h-screen w-full p-2">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
              {isFinanceReviewMode ? "Review" : "Submission"}
            </p>
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900">
              {isFinanceReviewMode ? "Review" : "Expenses"}
            </h1>
            <p className="text-slate-600">
              {isFinanceReviewMode
                ? "Review submitted entries, verify evidence, and lock the month after reconciliation."
                : "Record the breakdown of how you spent the inflow payment from finance."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isMonthSubmitted && (
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                <i className="fa-solid fa-clock"></i>
                Submitted
              </span>
            )}
            {isMonthReconciled && (
              <button
                type="button"
                onClick={handleUnlockBreakdown}
                disabled={!isAdminUser}
                title={
                  isAdminUser
                    ? `Unlock reconciled month${reconciledOn ? ` (${reconciledOn})` : ""}`
                    : "Only Admin can unlock this breakdown"
                }
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  isAdminUser
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                <i className="fa-solid fa-lock"></i>
                Locked
              </button>
            )}
          </div>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Month & Year
            </label>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="rounded-xl border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Closing Balance
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-700">
                N
              </span>
              <input
                type="number"
                value={previousClosingBalance}
                onChange={(e) => setPreviousClosingBalance(e.target.value)}
                disabled={isReadOnly}
                placeholder="0.00"
                step="0"
                min="0"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-6 shadow-sm">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Inflow
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-700">
                N
              </span>
              <input
                type="number"
                value={inflowAmount}
                onChange={(e) => setInflowAmount(e.target.value)}
                disabled={isReadOnly}
                placeholder="0.00"
                step="0"
                min="0"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {isMonthSubmitted && !isFinanceReviewMode && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
            <p className="text-sm font-semibold">
              This month has been submitted.
            </p>
            <p className="mt-1 text-xs">
              Submitted on {submittedOn || "a previous date"}.
            </p>
          </div>
        )}

        <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h4 className="text-lg font-bold text-slate-900">
              {/* Breakdown */}
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[50%]" />
                <col className="w-[10%]" />
                <col className="w-[16%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Quantity
                  </th>
                  <th className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isFinanceReviewMode && (
                  <tr className="border-t border-slate-100 bg-slate-50/50">
                    <td className="px-4 py-1.5">
                      <input
                        type="date"
                        value={newItem.date}
                        onChange={(e) =>
                          setNewItem({ ...newItem, date: e.target.value })
                        }
                        disabled={isReadOnly}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddLineItem();
                        }}
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="text"
                        value={newItem.description}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            description: e.target.value,
                          })
                        }
                        disabled={isReadOnly}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddLineItem();
                        }}
                        placeholder="e.g., Office Supplies"
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem({ ...newItem, quantity: e.target.value })
                        }
                        disabled={isReadOnly}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddLineItem();
                        }}
                        placeholder="0"
                        min="0"
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                      />
                    </td>
                    <td className="px-4 py-1.5">
                      <input
                        type="number"
                        value={newItem.amount}
                        onChange={(e) =>
                          setNewItem({ ...newItem, amount: e.target.value })
                        }
                        disabled={isReadOnly}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddLineItem();
                        }}
                        placeholder="0.00"
                        step="0"
                        min="0"
                        className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                      />
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      <button
                        onClick={handleAddLineItem}
                        disabled={isReadOnly}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        title="Add expense"
                      >
                        <i className="fa-solid fa-plus"></i>
                        {/* Add */}
                      </button>
                    </td>
                  </tr>
                )}

                {lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center px-6">
                        <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
                          <i className="fa-solid fa-receipt text-4xl text-slate-400"></i>
                        </div>
                        <p className="mb-1 text-lg font-bold text-slate-900">
                          No expenses added yet.
                        </p>
                        <p className="mb-5 text-slate-500">
                          {isFinanceReviewMode
                            ? "No submitted line items were found for this month."
                            : "Start by adding your first expense line item above."}
                        </p>
                        {!isFinanceReviewMode && (
                          <button
                            type="button"
                            onClick={() =>
                              toast("Bank feed import will be available soon")
                            }
                            className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:underline"
                          >
                            Import from bank feed
                            <i className="fa-solid fa-arrow-right text-xs"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  lineItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${
                        isFinanceReviewMode &&
                        reviewedLineItemIds.includes(item.id)
                          ? "bg-emerald-50"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          value={String(item.date || "").slice(0, 10)}
                          onChange={(e) =>
                            handleUpdateLineItem(
                              item.id,
                              "date",
                              e.target.value,
                            )
                          }
                          disabled={isReadOnly}
                          className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.description || ""}
                          onChange={(e) =>
                            handleUpdateLineItem(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          disabled={isReadOnly}
                          className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.quantity ?? ""}
                          onChange={(e) =>
                            handleUpdateLineItem(
                              item.id,
                              "quantity",
                              e.target.value,
                            )
                          }
                          disabled={isReadOnly}
                          min="0"
                          className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.amount ?? ""}
                          onChange={(e) =>
                            handleUpdateLineItem(
                              item.id,
                              "amount",
                              e.target.value,
                            )
                          }
                          disabled={isReadOnly}
                          min="0"
                          step="0"
                          className="w-full border-0 border-b border-slate-300 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isFinanceReviewMode ? (
                          <button
                            type="button"
                            onClick={() => handleReviewLineItem(item.id)}
                            disabled={reviewedLineItemIds.includes(item.id)}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                              reviewedLineItemIds.includes(item.id)
                                ? "cursor-default border-emerald-300 bg-emerald-100 text-emerald-800"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Mark line item as reconciled"
                          >
                            <i className="fa-solid fa-history"></i>
                            {reviewedLineItemIds.includes(item.id)
                              ? "Reconciled"
                              : "Review"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRemoveLineItem(item.id)}
                            disabled={isReadOnly}
                            className="text-sm text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                            title="Delete item"
                          >
                            <i className="fa-solid fa-trash"></i>
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

        <input
          id="reconciliation-evidence-input"
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            if (isReadOnly) return;
            const files = e.target.files;
            if (!files || files.length === 0) return;
            setEvidenceFiles((prev) => [
              ...prev,
              ...normalizePickedEvidence(files),
            ]);
            e.target.value = "";
          }}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <div className="h-full rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h4 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                <i className="fa-solid fa-comments text-orange-500"></i>
                {isFinanceReviewMode ? "Review Notes & Evidence" : "Comments"}
              </h4>

              <div className="relative">
                <textarea
                  ref={commentRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  onBlur={() => {
                    setTimeout(() => setShowMentionDropdown(false), 120);
                  }}
                  disabled={isReadOnly}
                  rows={6}
                  placeholder={
                    isFinanceReviewMode
                      ? "Add finance review notes before reconciliation lock..."
                      : "Add context for this reconciliation. Use @ to mention a colleague..."
                  }
                  className="min-h-[160px] w-full rounded-xl border border-slate-200 bg-slate-50 p-4 pr-24 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />

                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById("reconciliation-evidence-input")
                        ?.click()
                    }
                    disabled={isReadOnly}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    title="Attach file"
                  >
                    <i className="fa-solid fa-paperclip"></i>
                  </button>
                </div>

                {showMentionDropdown && (
                  <div className="absolute z-50 bottom-full left-0 right-0 -mt-3 py-2 bg-white rounded-xl shadow-lg max-h-[150px] overflow-y-auto w-[150px]">
                    {(userList || [])
                      .filter((u) =>
                        u.name?.toLowerCase().includes(mentionSearch),
                      )
                      .slice(0, 8)
                      .map((u) => (
                        <button
                          key={u.id || u.email || u.name}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleMentionSelect(u.name);
                          }}
                          className="w-full px-3 py-2 text-left transition-colors hover:bg-blue-50"
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {u.name}
                          </p>
                        </button>
                      ))}

                    {userList.filter((u) =>
                      u.name?.toLowerCase().includes(mentionSearch),
                    ).length === 0 && (
                      <p className="px-3 py-2 text-sm text-slate-500">
                        No users found
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3">
                {evidenceFiles.length === 0 ? (
                  <p className="text-sm text-slate-500">No attachments yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {evidenceFiles.map((file, idx) => {
                      const href = getEvidenceHref(file);
                      return (
                        <div
                          key={`${getEvidenceName(file, idx)}-${idx}`}
                          className="inline-flex max-w-xs items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5"
                        >
                          <i className="fa-solid fa-paperclip text-xs text-slate-400"></i>
                          <div className="min-w-0">
                            {href ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="block max-w-[10rem] truncate text-xs font-medium text-blue-700 hover:underline"
                              >
                                {getEvidenceName(file, idx)}
                              </a>
                            ) : (
                              <p className="max-w-[10rem] truncate text-xs font-medium text-slate-800">
                                {getEvidenceName(file, idx)}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500">
                              {file?.type || file?.fileType || "Unknown type"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setEvidenceFiles((prev) =>
                                prev.filter((_, index) => index !== idx),
                              )
                            }
                            disabled={isReadOnly}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-slate-300"
                            title="Remove file"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="h-full rounded-xl border border-slate-200 bg-white p-8 text-slate-900 shadow-sm">
              <div>
                <h4 className="mb-6 flex items-center gap-2 text-lg font-bold">
                  <i
                    className={`fa-solid ${
                      isFinanceReviewMode ? "fa-shield-halved" : "fa-chart-pie"
                    } text-blue-600`}
                  ></i>
                  {isFinanceReviewMode
                    ? `Finance Decision Panel - ${
                        formatMonthYear(monthYear) || "(select month)"
                      }`
                    : `Summary for ${formatMonthYear(monthYear) || "(select month)"}`}
                </h4>

                <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-sm text-slate-500">
                      Previous Closing Balance
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(Number(previousClosingBalance) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-sm text-slate-500">
                      Inflow Received
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(Number(inflowAmount) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-sm text-slate-500">
                      Total Expenses
                    </span>
                    <span className="text-lg font-bold text-rose-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                    Projected Opening Balance
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    {formatCurrency(calculateNewOpeningBalance())}
                  </h2>
                </div>

                <div className="mt-8 flex flex-wrap justify-end gap-3">
                  {!isFinanceReviewMode && (
                    <>
                      <button
                        onClick={handleReset}
                        disabled={isReadOnly || isMonthSubmitted}
                        className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleSaveDraft}
                        disabled={
                          !monthYear || isMonthSubmitted || isMonthReconciled
                        }
                        className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                          !monthYear || isMonthSubmitted || isMonthReconciled
                            ? "cursor-not-allowed bg-slate-200 text-slate-500"
                            : "bg-slate-800 text-white hover:bg-slate-900"
                        }`}
                      >
                        <i className="fa-solid fa-floppy-disk"></i>
                        Save
                      </button>
                      <button
                        onClick={handleSubmitBreakdown}
                        disabled={
                          isMonthSubmitted ||
                          isMonthReconciled ||
                          lineItems.length === 0 ||
                          !monthYear ||
                          previousClosingBalance === ""
                        }
                        className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-all ${
                          isMonthSubmitted ||
                          isMonthReconciled ||
                          lineItems.length === 0 ||
                          !monthYear ||
                          previousClosingBalance === ""
                            ? "cursor-not-allowed bg-slate-200 text-slate-500"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <i className="fa-solid fa-check"></i>
                        Submit
                      </button>
                    </>
                  )}
                  {isFinanceReviewMode && isMonthSubmitted && canReconcile && (
                    <button
                      onClick={handleReconcileBreakdown}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700"
                    >
                      <i className="fa-solid fa-lock"></i>
                      Reconcile & Lock
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReconciliationManagement;
