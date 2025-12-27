import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import Pagination from "../Pagination";
import apiService from "../../services/api";

const AccountsPayable = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [filters, setFilters] = useState({
    vendor: "",
    status: "",
    dateRange: "",
    minAmount: "",
    maxAmount: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(5);
  const [selectedView] = useState("All Open Invoices");

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/finance/accounts-payable", {
        params: { page: currentPage, ...filters },
      });
      if (response.success) {
        setInvoices(response.data.invoices);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error("Error fetching accounts payable:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(invoices.map((inv) => inv._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (invoiceId) => {
    setSelectedInvoices((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handlePaySelected = async () => {
    if (selectedInvoices.length === 0) {
      toast.error("Please select invoices to pay");
      return;
    }
    try {
      const response = await apiService.post(
        "/api/finance/accounts-payable/pay",
        {
          invoiceIds: selectedInvoices,
        }
      );
      if (response.success) {
        toast.success(
          `${selectedInvoices.length} invoice(s) paid successfully`
        );
        setSelectedInvoices([]);
        fetchInvoices();
      }
    } catch (error) {
      console.error("Error paying invoices:", error);
      toast.error("Failed to process payment");
    }
  };

  const handleExportCSV = () => {
    toast.info("CSV export feature coming soon");
  };

  const handleClearFilters = () => {
    setFilters({
      vendor: "",
      status: "",
      dateRange: "",
      minAmount: "",
      maxAmount: "",
    });
    setSearchQuery("");
  };

  const getStatusBadge = (status) => {
    const badges = {
      Approved: "bg-green-100 text-green-800 border-green-200",
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Overdue: "bg-red-100 text-red-800 border-red-200",
      Draft: "bg-slate-100 text-slate-800 border-slate-200",
      Paid: "bg-blue-100 text-blue-800 border-blue-200",
    };
    return badges[status] || badges.Draft;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            { label: "Finance", icon: "fa-coins", onClick: onBack },
            { label: "Accounts Payable", icon: "fa-receipt" },
          ]}
        />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-slate-600 text-sm">Loading invoices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins", onClick: onBack },
          { label: "Accounts Payable", icon: "fa-receipt" },
        ]}
      />

      {/* Header Section with Filters */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-[1800px] mx-auto w-full flex flex-col gap-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-primary transition-colors">
                  {selectedView}
                  <i className="fa-solid fa-chevron-down text-sm"></i>
                </button>
              </div>
              <span className="text-slate-300 text-xl font-light">|</span>
              <button
                onClick={() => toast.info("Save view feature coming soon")}
                className="text-xs font-medium text-primary hover:text-blue-700 flex items-center gap-1"
              >
                <i className="fa-solid fa-save text-xs"></i>
                Save View
              </button>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => toast.info("Column customization coming soon")}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-primary/50 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
              >
                <i className="fa-solid fa-columns text-sm"></i>
                Customize Columns
              </button>
              <div className="relative w-full md:w-64">
                <i className="absolute left-2.5 top-1/2 -translate-y-1/2 fa-solid fa-search text-sm text-slate-400"></i>
                <input
                  className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-primary focus:border-primary w-full transition-all"
                  placeholder="Search invoice #, vendor..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mr-2">
              <i className="fa-solid fa-filter text-sm"></i>
              Filters:
            </div>
            <div className="relative">
              <select
                value={filters.vendor}
                onChange={(e) =>
                  setFilters({ ...filters, vendor: e.target.value })
                }
                className="appearance-none bg-white border border-slate-200 hover:border-primary/50 text-slate-700 pl-3 pr-8 py-1.5 rounded-md text-sm focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value="">All Vendors</option>
                <option value="aws">AWS Web Services</option>
                <option value="wework">WeWork</option>
                <option value="google">Google Ads</option>
              </select>
              <i className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 fa-solid fa-chevron-down text-xs text-slate-400"></i>
            </div>
            <div className="relative">
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="appearance-none bg-white border border-slate-200 hover:border-primary/50 text-slate-700 pl-3 pr-8 py-1.5 rounded-md text-sm focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <i className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 fa-solid fa-chevron-down text-xs text-slate-400"></i>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1.5 shadow-sm">
              <i className="fa-solid fa-calendar-days text-xs text-slate-400"></i>
              <input
                className="border-none p-0 text-sm bg-transparent focus:ring-0 w-32 placeholder-slate-400 text-slate-700"
                placeholder="Due Date Range"
                type="text"
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters({ ...filters, dateRange: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2 py-1.5 shadow-sm">
              <span className="text-xs font-semibold text-slate-400">$</span>
              <input
                className="border-none p-0 text-sm bg-transparent focus:ring-0 w-16 placeholder-slate-400 text-slate-700"
                placeholder="Min"
                type="number"
                value={filters.minAmount}
                onChange={(e) =>
                  setFilters({ ...filters, minAmount: e.target.value })
                }
              />
              <span className="text-slate-300">-</span>
              <input
                className="border-none p-0 text-sm bg-transparent focus:ring-0 w-16 placeholder-slate-400 text-slate-700"
                placeholder="Max"
                type="number"
                value={filters.maxAmount}
                onChange={(e) =>
                  setFilters({ ...filters, maxAmount: e.target.value })
                }
              />
            </div>
            <button
              onClick={handleClearFilters}
              className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Clear all
            </button>
          </div>
        </div>
      </section>

      {/* Main Table */}
      <main className="flex-1 overflow-hidden relative bg-slate-50">
        <div className="h-full max-w-[1800px] mx-auto w-full px-6 py-6 flex flex-col">
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 w-12 border-b border-slate-200">
                      <input
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        type="checkbox"
                        checked={
                          selectedInvoices.length > 0 &&
                          selectedInvoices.length === invoices.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:text-primary group">
                      <div className="flex items-center gap-1">
                        Vendor
                        <i className="fa-solid fa-sort text-xs text-slate-400 group-hover:text-primary"></i>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:text-primary group">
                      <div className="flex items-center gap-1">
                        Invoice #
                        <i className="fa-solid fa-sort text-xs text-slate-400 group-hover:text-primary"></i>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:text-primary group">
                      <div className="flex items-center gap-1">
                        Issue Date
                        <i className="fa-solid fa-sort text-xs text-slate-400 group-hover:text-primary"></i>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:text-primary group">
                      <div className="flex items-center gap-1">
                        Due Date
                        <i className="fa-solid fa-sort-down text-xs text-primary"></i>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right cursor-pointer hover:text-primary group">
                      <div className="flex items-center justify-end gap-1">
                        Amount
                        <i className="fa-solid fa-sort text-xs text-slate-400 group-hover:text-primary"></i>
                      </div>
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">
                      Status
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      Dept.
                    </th>
                    <th className="py-3 px-4 w-12 border-b border-slate-200"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm bg-white">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-4xl">📋</div>
                          <div className="text-slate-900 font-medium">
                            No invoices found
                          </div>
                          <div className="text-slate-500 text-sm">
                            Try adjusting your filters or create a new invoice
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr
                        key={invoice._id}
                        className={`hover:bg-slate-50 transition-colors group ${
                          invoice.status === "Overdue" ? "bg-red-50/30" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice._id)}
                            onChange={() => handleSelectInvoice(invoice._id)}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                              {invoice.vendor?.charAt(0) || "V"}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">
                                {invoice.vendor || "Unknown Vendor"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {invoice.category || "General"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {invoice.invoiceNumber || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {invoice.issueDate
                            ? new Date(invoice.issueDate).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td
                          className={`py-3 px-4 ${
                            invoice.status === "Overdue"
                              ? "text-red-600 font-medium"
                              : "text-slate-600"
                          }`}
                        >
                          {invoice.dueDate
                            ? new Date(invoice.dueDate).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums">
                          ${invoice.amount?.toFixed(2) || "0.00"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {invoice.department || "General"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button className="text-slate-400 hover:text-primary transition-colors">
                            <i className="fa-solid fa-ellipsis-vertical text-lg"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {invoices.length > 0 ? (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-slate-900">
                      {(currentPage - 1) * 10 + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-slate-900">
                      {Math.min(currentPage * 10, invoices.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-slate-900">
                      {invoices.length}
                    </span>{" "}
                    results
                  </>
                ) : (
                  "No invoices to display"
                )}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer with Actions */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <span className="font-bold text-slate-900">
                {selectedInvoices.length}
              </span>{" "}
              items selected
            </span>
            <span className="hidden sm:inline">
              Select items to perform bulk actions
            </span>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-download text-sm"></i>
              Export CSV
            </button>
            <button
              onClick={() => toast.info("Hold payment feature coming soon")}
              disabled={selectedInvoices.length === 0}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hold Payment
            </button>
            <button
              onClick={handlePaySelected}
              disabled={selectedInvoices.length === 0}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fa-solid fa-credit-card text-sm"></i>
              Pay Selected
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AccountsPayable;
