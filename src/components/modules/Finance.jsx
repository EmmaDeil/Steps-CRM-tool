import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Pagination from "../Pagination";
import Skeleton from "../Skeleton";
import EmptyState from "../EmptyState";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import { useAuth } from "../../context/useAuth";
import { apiService } from "../../services/api";
import Reconcile from "./Reconcile";
import AccountsPayable from "./AccountsPayable";
import JournalHistory from "./JournalHistory";
import JournalEntry from "./JournalEntry";
import VendorManagement from "./VendorManagement";
import Budget from "./Budget";
import Invoicing from "./Invoicing";

const Finance = () => {
  const { user } = useAuth();
  const [recentPOs, setRecentPOs] = useState([]);
  const [poFilter, setPoFilter] = useState("all"); // all, approved, pending
  const [poLoading, setPoLoading] = useState(true);
  const [accountBalance, setAccountBalance] = useState({
    total: 0,
    receivables: 0,
    payables: 0,
  });
  const [showReconcile, setShowReconcile] = useState(false);
  const [showAccountsPayable, setShowAccountsPayable] = useState(false);
  const [showJournalHistory, setShowJournalHistory] = useState(false);
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [showVendorManagement, setShowVendorManagement] = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [showInvoicing, setShowInvoicing] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.openInvoicing) {
      setShowInvoicing(true);
    }
  }, [location.state]);

  const displayName =
    user?.firstName || user?.fullName?.split(" ")[0] || "User";

  const fetchFinanceData = async () => {
    try {
      // Data will be fetched directly in each module
      setAccountBalance({
        total: 0,
        receivables: 0,
        payables: 0,
      });
    } catch (err) {
      console.error("Error fetching finance data:", err);
    }
  };

  const fetchRecentPOs = useCallback(async () => {
    try {
      setPoLoading(true);
      // Fetch all POs that are approved, locked, and ready for payment (payment_pending status)
      const response = await apiService.get("/api/purchase-orders", {
        params: {
          status: "all",
          limit: 10,
          page: 1,
        },
        timeout: 12000,
      });

      const rows =
        (Array.isArray(response?.data?.purchaseOrders) &&
          response.data.purchaseOrders) ||
        (Array.isArray(response?.data?.orders) && response.data.orders) ||
        (Array.isArray(response?.purchaseOrders) && response.purchaseOrders) ||
        (Array.isArray(response?.orders) && response.orders) ||
        [];

      // Filter for approved, locked POs ready for AP.
      const filtered = rows.filter(
        (po) =>
          (po.status === "approved" || po.status === "payment_pending") &&
          po.isLocked,
      );

      setRecentPOs(filtered.slice(0, 10));
    } catch (err) {
      console.error("Error fetching recent POs:", err);
      setRecentPOs([]);
      if (!err?.response) {
        toast.error(
          "Finance data source is taking too long. Showing empty recent purchase orders.",
        );
      }
    } finally {
      setPoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, []);

  useEffect(() => {
    fetchRecentPOs();
  }, [fetchRecentPOs]);

  const getFilteredPOs = () => {
    if (poFilter === "approved") {
      // Approved and locked, waiting for payment
      return recentPOs.filter((po) => po.status === "approved" && po.isLocked);
    } else if (poFilter === "pending") {
      // Already scheduled/sent to payment (payment_pending status)
      return recentPOs.filter((po) => po.status === "payment_pending");
    }
    // All approved and locked
    return recentPOs;
  };

  if (showBudget) {
    return (
      <Budget onBack={() => setShowBudget(false)} parentModule="Finance" />
    );
  }

  if (showInvoicing) {
    return (
      <div className="w-full min-h-screen bg-gray-50 px-1">
        <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
          <div className="flex h-full grow flex-col w-full">
            <div className="p-2">
              <Invoicing onBackToFinance={() => setShowInvoicing(false)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showVendorManagement) {
    return <VendorManagement onBack={() => setShowVendorManagement(false)} />;
  }

  if (showReconcile) {
    return <Reconcile onBack={() => setShowReconcile(false)} />;
  }

  if (showAccountsPayable) {
    return <AccountsPayable onBack={() => setShowAccountsPayable(false)} />;
  }

  if (showJournalHistory) {
    return (
      <JournalHistory
        onBack={() => setShowJournalHistory(false)}
        onNewEntry={() => {
          setShowJournalHistory(false);
          setShowJournalEntry(true);
        }}
      />
    );
  }

  if (showJournalEntry) {
    return (
      <JournalEntry
        onBack={() => {
          setShowJournalEntry(false);
          setShowJournalHistory(true);
        }}
        onBackToFinance={() => {
          setShowJournalEntry(false);
          setShowJournalHistory(false);
        }}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="flex h-full grow flex-col w-full">
          <Breadcrumb
            items={[
              { label: "Home", href: "/home", icon: "fa-house" },
              { label: "Finance", icon: "fa-coins" },
            ]}
          />
          <div className="p-2">
            {/* Page Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
              <div>
                <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Finance Home
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  Welcome back, {displayName}. Select a module to get started.
                </p>
              </div>
              {/* Quick Action dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowQuickAction((v) => !v)}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary gap-2"
                >
                  <i className="fa-solid fa-bolt"></i>
                  Quick Action
                  <i className="fa-solid fa-chevron-down text-xs"></i>
                </button>

                {showQuickAction && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowQuickAction(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Finance Actions
                        </p>
                      </div>
                      {[
                        {
                          icon: "fa-book",
                          color: "text-blue-600",
                          bg: "bg-blue-50 dark:bg-blue-900/30",
                          label: "New Journal Entry",
                          action: () => {
                            setShowJournalEntry(true);
                            setShowQuickAction(false);
                          },
                        },
                        {
                          icon: "fa-receipt",
                          color: "text-red-600",
                          bg: "bg-red-50 dark:bg-red-900/30",
                          label: "Accounts Payable",
                          action: () => {
                            setShowAccountsPayable(true);
                            setShowQuickAction(false);
                          },
                        },
                        {
                          icon: "fa-wallet",
                          color: "text-teal-600",
                          bg: "bg-teal-50 dark:bg-teal-900/30",
                          label: "Budget Overview",
                          action: () => {
                            setShowBudget(true);
                            setShowQuickAction(false);
                          },
                        },
                        {
                          icon: "fa-scale-balanced",
                          color: "text-purple-600",
                          bg: "bg-purple-50 dark:bg-purple-900/30",
                          label: "Reconcile Accounts",
                          action: () => {
                            setShowReconcile(true);
                            setShowQuickAction(false);
                          },
                        },
                        {
                          icon: "fa-users",
                          color: "text-indigo-600",
                          bg: "bg-indigo-50 dark:bg-indigo-900/30",
                          label: "Vendor Management",
                          action: () => {
                            setShowVendorManagement(true);
                            setShowQuickAction(false);
                          },
                        },
                      ].map(({ icon, color, bg, label, action }) => (
                        <button
                          key={label}
                          onClick={action}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <span
                            className={`flex size-7 items-center justify-center rounded-lg ${bg}`}
                          >
                            <i
                              className={`fa-solid ${icon} ${color} text-xs`}
                            ></i>
                          </span>
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <button
                onClick={() => setShowJournalHistory(true)}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-book text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Journal
                </span>
              </button>

              <button
                onClick={() => setShowReconcile(true)}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-scale-balanced text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Reconcile
                </span>
              </button>

              <button
                onClick={() => setShowAccountsPayable(true)}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-receipt text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Accounts Payable
                </span>
              </button>

              <button
                onClick={() => setShowVendorManagement(true)}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-users text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Vendor Management
                </span>
              </button>

              <button
                onClick={() => toast("Audit Log module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-book text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Audit Log
                </span>
              </button>

              <button
                onClick={() => toast("Reports module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-chart-bar text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Reports
                </span>
              </button>

              <button
                onClick={() => setShowBudget(true)}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-wallet text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Budget
                </span>
              </button>

              <button
                onClick={() => setShowInvoicing(true)}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-file-invoice-dollar text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Invoicing
                </span>
              </button>

              <button
                onClick={() => toast("Expense Claims module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-receipt text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Expense Claims
                </span>
              </button>

              <button
                onClick={() => toast("Cash Flow module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-hand-holding-dollar text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Cash Flow
                </span>
              </button>

              <button
                onClick={() => toast("Forecasting module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-chart-line text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Forecasting
                </span>
              </button>

              <button
                onClick={() => toast("Treasury module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-vault text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Treasury
                </span>
              </button>

              <button
                onClick={() => toast("Compliance module coming soon")}
                className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-shield-halved text-[28px]"></i>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                  Compliance
                </span>
              </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Recent Invoices */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Account Balance Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-wallet text-primary"></i>
                    Account Balance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Total Balance
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(accountBalance.total)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Net Position
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                        Accounts Receivable
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(accountBalance.receivables)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Incoming
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-lg p-4">
                      <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                        Accounts Payable
                      </p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {formatCurrency(accountBalance.payables)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Outgoing
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Invoices Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-file-invoice text-primary"></i>
                      Recent Purchase Orders
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPoFilter("all")}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                          poFilter === "all"
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                            : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setPoFilter("approved")}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                          poFilter === "approved"
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                            : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        Approved
                      </button>
                      <button
                        onClick={() => setPoFilter("pending")}
                        className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                          poFilter === "pending"
                            ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                            : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        Scheduled for Payment
                      </button>
                    </div>
                  </div>
                  {poLoading ? (
                    <div className="p-6">
                      <Skeleton count={3} height={50} />
                    </div>
                  ) : getFilteredPOs().length === 0 ? (
                    <div className="p-8">
                      <EmptyState
                        icon="📋"
                        title={
                          poFilter === "pending"
                            ? "No Purchase Orders Scheduled for Payment"
                            : "No Approved Purchase Orders Ready for Payment"
                        }
                        description={
                          poFilter === "pending"
                            ? "POs scheduled for payment will appear here"
                            : "Approved and locked POs ready to schedule for payment will appear here"
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                PO Number
                              </th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Vendor
                              </th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {getFilteredPOs().map((po) => (
                              <tr
                                key={po._id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                              >
                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                                  {po.poNumber}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                  {po.vendor}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                  {po.orderDate
                                    ? new Date(
                                        po.orderDate,
                                      ).toLocaleDateString()
                                    : "N/A"}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                  {formatCurrency(po.totalAmount || 0)}
                                </td>
                                <td className="px-6 py-4">
                                  {po.status === "approved" ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                      <i className="fa-solid fa-circle-check mr-1 text-[10px]"></i>
                                      Approved & Locked
                                    </span>
                                  ) : po.status === "payment_pending" ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                      <i className="fa-solid fa-clock mr-1 text-[10px]"></i>
                                      Scheduled for Payment
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                                      {po.status}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-center">
                        <button
                          onClick={() => setShowAccountsPayable(true)}
                          className="text-sm font-medium text-slate-500 hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          View All in Accounts Payable{" "}
                          <i className="fa-solid fa-arrow-right text-[14px]"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column - Tax Management */}
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-landmark text-primary"></i>
                    Tax Management
                  </h3>
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <i className="fa-solid fa-bell text-orange-600 dark:text-orange-400 mt-0.5"></i>
                      <div>
                        <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
                          Upcoming Deadline
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                          Sales Tax Filing for Q4 is due soon.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => toast("Tax Filings coming soon")}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-primary">
                          <i className="fa-solid fa-file-alt text-[18px]"></i>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          Tax Filings
                        </span>
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-400 text-[14px]"></i>
                    </button>
                    <button
                      onClick={() => toast("Compliance Check coming soon")}
                      className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                          <i className="fa-solid fa-check-circle text-[18px]"></i>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                          Compliance Check
                        </span>
                      </div>
                      <i className="fa-solid fa-chevron-right text-slate-400 text-[14px]"></i>
                    </button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-primary"></i>
                    Quick Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Total Payables
                      </span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(accountBalance.payables)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Total Receivables
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(accountBalance.receivables)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          Net Position
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            accountBalance.total >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatCurrency(accountBalance.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;
