import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../services/currency";

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    draft:     "bg-gray-100 text-gray-700",
    sent:      "bg-blue-100 text-blue-700",
    paid:      "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    issued:    "bg-purple-100 text-purple-700",
    invoiced:  "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
};

// ── Generate Invoice Modal ─────────────────────────────────────────────────
const GenerateInvoiceModal = ({ issue, onClose, onGenerated }) => {
  const [form, setForm] = useState({ taxRate: 0, notes: "", paymentTerms: "Net 30", dueDate: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiService.post(`/api/inventory-issues/${issue._id}/generate-invoice`, form);
      toast.success("Invoice generated!");
      onGenerated(res);
      onClose();
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to generate invoice"); }
    finally { setSubmitting(false); }
  };

  const subtotal = issue.lineItems?.reduce((s, li) => s + (li.totalPrice || 0), 0) || 0;
  const tax = Math.round(subtotal * (form.taxRate / 100) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Generate Invoice</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark"></i></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="font-semibold text-blue-800">{issue.issueNumber} — {issue.issuedTo}</p>
            <p className="text-blue-600 mt-1">{issue.lineItems?.length} item(s) · Base value: {formatCurrency(subtotal)}</p>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.taxRate}
                onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
            <select value={form.paymentTerms} onChange={e => setForm(f => ({ ...f, paymentTerms: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
              {["Net 7", "Net 14", "Net 30", "Net 60", "Due on Receipt"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Optional note on the invoice"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
          </div>

          {form.taxRate > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex justify-between">
              <span>Subtotal: {formatCurrency(subtotal)}</span>
              <span>Tax ({form.taxRate}%): {formatCurrency(tax)}</span>
              <span className="font-bold text-gray-800">Total: {formatCurrency(subtotal + tax)}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              {submitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-file-invoice-dollar"></i>}
              {submitting ? "Generating…" : "Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Invoicing Component ──────────────────────────────────────────────────
const Invoicing = () => {
  const [activeTab, setActiveTab] = useState("issues"); // "issues" | "invoices"

  // Issues state
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesTotalPages, setIssuesTotalPages] = useState(1);
  const [issuesTotal, setIssuesTotal] = useState(0);
  const [issueSearch, setIssueSearch] = useState("");
  const [issueStatusFilter, setIssueStatusFilter] = useState("all");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Invoices state
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [invoicesTotalPages, setInvoicesTotalPages] = useState(1);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchIssues = useCallback(async (page = 1, search = "", status = "all") => {
    try {
      setIssuesLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      const res = await apiService.get(`/api/inventory-issues?${params}`);
      setIssues(res?.issues || []);
      setIssuesTotal(res?.total || 0);
      setIssuesTotalPages(res?.totalPages || 1);
      setIssuesPage(page);
    } catch { toast.error("Failed to load inventory issues"); }
    finally { setIssuesLoading(false); }
  }, []);

  const fetchInvoices = useCallback(async (page = 1, search = "", status = "all") => {
    try {
      setInvoicesLoading(true);
      const params = new URLSearchParams({ page, limit: 20 });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      const res = await apiService.get(`/api/invoices?${params}`);
      setInvoices(res?.invoices || []);
      setInvoicesTotal(res?.total || 0);
      setInvoicesTotalPages(res?.totalPages || 1);
      setInvoicesPage(page);
    } catch { toast.error("Failed to load invoices"); }
    finally { setInvoicesLoading(false); }
  }, []);

  useEffect(() => { fetchIssues(); fetchInvoices(); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchIssues(1, issueSearch, issueStatusFilter), 400);
    return () => clearTimeout(t);
  }, [issueSearch, issueStatusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchInvoices(1, invoiceSearch, invoiceStatusFilter), 400);
    return () => clearTimeout(t);
  }, [invoiceSearch, invoiceStatusFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePrintInvoice = (invoiceId) => {
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api/invoices/${invoiceId}/print`;
    window.open(url, "_blank");
  };

  const handleStatusChange = async (invoiceId, status) => {
    try {
      await apiService.patch(`/api/invoices/${invoiceId}/status`, { status });
      toast.success(`Invoice marked as ${status}`);
      fetchInvoices(invoicesPage, invoiceSearch, invoiceStatusFilter);
    } catch (err) { toast.error(err?.response?.data?.message || "Failed to update status"); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-file-invoice-dollar text-emerald-600"></i>
            Invoicing
          </h2>
          <p className="text-gray-500 text-sm mt-1">Manage stock issues and generate invoices</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: "issues", label: "Stock Issues", icon: "fa-boxes-stacked", count: issuesTotal },
            { key: "invoices", label: "Invoices", icon: "fa-file-invoice", count: invoicesTotal },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.key ? "border-emerald-600 text-emerald-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}>
              <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
              {tab.count > 0 && <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs font-bold">{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Issues Tab ──────────────────────────────────────────────────────── */}
      {activeTab === "issues" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Controls */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-72">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" placeholder="Search issue number or issued to…" value={issueSearch}
                onChange={e => setIssueSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <select value={issueStatusFilter} onChange={e => setIssueStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700">
              <option value="all">All Statuses</option>
              <option value="issued">Issued</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {issuesLoading ? (
              <div className="p-8 text-center text-gray-400"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>
            ) : issues.length === 0 ? (
              <div className="p-10 text-center">
                <i className="fa-solid fa-boxes-stacked text-4xl text-gray-200 mb-3"></i>
                <p className="text-gray-500 font-medium">No stock issues yet</p>
                <p className="text-sm text-gray-400 mt-1">Issues appear here when stock is issued from the Inventory module</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Issue #", "Issued To", "Items", "Total Value", "By", "Date", "Status", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {issues.map(issue => (
                    <tr key={issue._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{issue.issueNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{issue.issuedTo}</td>
                      <td className="px-4 py-3 text-gray-500">{issue.lineItems?.length} item(s)</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(issue.totalValue)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{issue.issuedByName || "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(issue.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
                      <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedIssue(selectedIssue?._id === issue._id ? null : issue)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View details">
                            <i className="fa-solid fa-eye text-xs"></i>
                          </button>
                          {issue.status === "issued" && (
                            <button onClick={() => { setSelectedIssue(issue); setShowGenerateModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Generate Invoice">
                              <i className="fa-solid fa-file-invoice-dollar text-xs"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Issue detail drawer */}
          {selectedIssue && !showGenerateModal && (
            <div className="border-t border-gray-200 bg-blue-50/50 p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-gray-800">{selectedIssue.issueNumber} — {selectedIssue.issuedTo}</h4>
                <button onClick={() => setSelectedIssue(null)} className="text-gray-400 hover:text-gray-600 text-xs"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-gray-100">
                  <th className="text-left p-2 rounded-tl">Item</th>
                  <th className="text-center p-2">Code</th>
                  <th className="text-center p-2">Qty</th>
                  <th className="text-right p-2">Unit Price</th>
                  <th className="text-right p-2 rounded-tr">Total</th>
                </tr></thead>
                <tbody>{selectedIssue.lineItems?.map((li, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-2 font-medium">{li.itemName}</td>
                    <td className="p-2 text-center text-gray-500 font-mono">{li.itemCode}</td>
                    <td className="p-2 text-center">{li.qty} {li.unit}</td>
                    <td className="p-2 text-right">{formatCurrency(li.unitPrice)}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(li.totalPrice)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr>
                  <td colSpan="4" className="p-2 text-right font-bold">Total Value</td>
                  <td className="p-2 text-right font-bold text-emerald-700">{formatCurrency(selectedIssue.totalValue)}</td>
                </tr></tfoot>
              </table>
              {selectedIssue.status === "issued" && (
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setShowGenerateModal(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2">
                    <i className="fa-solid fa-file-invoice-dollar"></i> Generate Invoice
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {issuesTotalPages > 1 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50">
              <span>{issuesTotal} issue(s)</span>
              <div className="flex gap-1">
                <button onClick={() => fetchIssues(issuesPage - 1, issueSearch, issueStatusFilter)} disabled={issuesPage <= 1 || issuesLoading}
                  className="px-3 py-1 border rounded text-xs disabled:opacity-40">Prev</button>
                <button onClick={() => fetchIssues(issuesPage + 1, issueSearch, issueStatusFilter)} disabled={issuesPage >= issuesTotalPages || issuesLoading}
                  className="px-3 py-1 border rounded text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Invoices Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "invoices" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Controls */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-72">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input type="text" placeholder="Search invoice number or bill to…" value={invoiceSearch}
                onChange={e => setInvoiceSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <select value={invoiceStatusFilter} onChange={e => setInvoiceStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700">
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {invoicesLoading ? (
              <div className="p-8 text-center text-gray-400"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>
            ) : invoices.length === 0 ? (
              <div className="p-10 text-center">
                <i className="fa-solid fa-file-invoice text-4xl text-gray-200 mb-3"></i>
                <p className="text-gray-500 font-medium">No invoices yet</p>
                <p className="text-sm text-gray-400 mt-1">Generate an invoice from a Stock Issue to see it here</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Invoice #", "Bill To", "Items", "Subtotal", "Tax", "Total", "Status", "Generated", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map(inv => (
                    <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-700 font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{inv.billTo}</td>
                      <td className="px-4 py-3 text-gray-500">{inv.lineItems?.length}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(inv.subtotal)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{inv.taxRate > 0 ? `${inv.taxRate}%` : "—"}</td>
                      <td className="px-4 py-3 font-bold text-gray-800">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(inv.createdAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handlePrintInvoice(inv._id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Print invoice">
                            <i className="fa-solid fa-print text-xs"></i>
                          </button>
                          {inv.status === "draft" && (
                            <button onClick={() => handleStatusChange(inv._id, "sent")}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Mark as Sent">
                              <i className="fa-solid fa-paper-plane text-xs"></i>
                            </button>
                          )}
                          {inv.status === "sent" && (
                            <button onClick={() => handleStatusChange(inv._id, "paid")}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Mark as Paid">
                              <i className="fa-solid fa-circle-check text-xs"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {invoicesTotalPages > 1 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50">
              <span>{invoicesTotal} invoice(s)</span>
              <div className="flex gap-1">
                <button onClick={() => fetchInvoices(invoicesPage - 1, invoiceSearch, invoiceStatusFilter)} disabled={invoicesPage <= 1 || invoicesLoading}
                  className="px-3 py-1 border rounded text-xs disabled:opacity-40">Prev</button>
                <button onClick={() => fetchInvoices(invoicesPage + 1, invoiceSearch, invoiceStatusFilter)} disabled={invoicesPage >= invoicesTotalPages || invoicesLoading}
                  className="px-3 py-1 border rounded text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Invoice Modal */}
      {showGenerateModal && selectedIssue && (
        <GenerateInvoiceModal
          issue={selectedIssue}
          onClose={() => { setShowGenerateModal(false); }}
          onGenerated={() => {
            fetchIssues(issuesPage, issueSearch, issueStatusFilter);
            fetchInvoices(1, invoiceSearch, invoiceStatusFilter);
            setActiveTab("invoices");
          }}
        />
      )}
    </div>
  );
};

export default Invoicing;
