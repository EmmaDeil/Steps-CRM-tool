import React, { useState, useEffect } from "react";
import Pagination from "../Pagination";
import Skeleton from "../Skeleton";
import EmptyState from "../EmptyState";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import { useAuth } from "../../context/useAuth";
import Reconcile from "./Reconcile";
import AccountsPayable from "./AccountsPayable";
import JournalHistory from "./JournalHistory";
import JournalEntry from "./JournalEntry";
import VendorManagement from "./VendorManagement";

const Finance = () => {
  const { user } = useAuth();
  const [recentInvoices] = useState([]);
  const [accountBalance, setAccountBalance] = useState({
    total: 0,
    receivables: 0,
    payables: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showReconcile, setShowReconcile] = useState(false);
  const [showAccountsPayable, setShowAccountsPayable] = useState(false);
  const [showJournalHistory, setShowJournalHistory] = useState(false);
  const [showJournalEntry, setShowJournalEntry] = useState(false);
  const [showVendorManagement, setShowVendorManagement] = useState(false);

  const displayName =
    user?.firstName || user?.fullName?.split(" ")[0] || "User";

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      // Data will be fetched directly in each module
      setAccountBalance({
        total: 0,
        receivables: 0,
        payables: 0,
      });
    } catch (err) {
      console.error("Error fetching finance data:", err);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen w-full">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="flex h-full grow flex-col p-2 w-full">
          <Breadcrumb
            items={[
              { label: "Home", href: "/home", icon: "fa-house" },
              { label: "Finance", icon: "fa-coins" },
            ]}
          />

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
            <button className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary">
              <i className="fa-solid fa-plus mr-2"></i>
              Quick Action
            </button>
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
              onClick={() => toast.info("Audit Log module coming soon")}
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
              onClick={() => toast.info("Reports module coming soon")}
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
              onClick={() => toast.info("Salary Computing module coming soon")}
              className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-calculator text-[28px]"></i>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                Salary Computing
              </span>
            </button>

            <button
              onClick={() => toast.info("Budget module coming soon")}
              className="group relative flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer h-40"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-chart-pie text-[28px]"></i>
              </div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white text-center">
                Budget
              </span>
            </button>

            <button
              onClick={() => toast.info("Invoicing module coming soon")}
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
              onClick={() => toast.info("Expense Claims module coming soon")}
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
              onClick={() => toast.info("Cash Flow module coming soon")}
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
              onClick={() => toast.info("Forecasting module coming soon")}
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
              onClick={() => toast.info("Treasury module coming soon")}
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
              onClick={() => toast.info("Compliance module coming soon")}
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
                    <button className="text-xs font-medium bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-slate-900 dark:text-white">
                      All
                    </button>
                    <button className="text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400">
                      Approved
                    </button>
                    <button className="text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 px-3 py-1 rounded-full text-slate-500 dark:text-slate-400">
                      Pending
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="p-6">
                    <Skeleton count={3} height={50} />
                  </div>
                ) : recentInvoices.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      icon="📄"
                      title="No recent invoices"
                      description="Purchase orders will appear here once they are created"
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
                          {recentInvoices.map((invoice) => (
                            <tr
                              key={invoice._id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                {invoice.poNumber}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                {invoice.vendor}
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                {invoice.orderDate
                                  ? new Date(
                                      invoice.orderDate
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                                {formatCurrency(invoice.totalAmount || 0)}
                              </td>
                              <td className="px-6 py-4">
                                {invoice.status === "approved" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200">
                                    Approved
                                  </span>
                                ) : invoice.status === "pending" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                                    {invoice.status}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-center">
                      <button className="text-sm font-medium text-slate-500 hover:text-primary flex items-center gap-1">
                        View All Purchase Orders{" "}
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
                    onClick={() => toast.info("Tax Filings coming soon")}
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
                    onClick={() => toast.info("Compliance Check coming soon")}
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
  );
};

export default Finance;
