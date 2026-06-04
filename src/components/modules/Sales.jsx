import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import ModuleLoader from "../common/ModuleLoader";

// ─── Constants ───────────────────────────────────────────────────────────────

const STAGES = [
  { key: "lead",        label: "Lead",        icon: "fa-circle-dot",   badge: "bg-blue-100 text-blue-700" },
  { key: "contacted",   label: "Contacted",   icon: "fa-phone",        badge: "bg-purple-100 text-purple-700" },
  { key: "proposal",    label: "Proposal",    icon: "fa-file-lines",   badge: "bg-yellow-100 text-yellow-700" },
  { key: "negotiation", label: "Negotiation", icon: "fa-handshake",    badge: "bg-orange-100 text-orange-700" },
  { key: "won",         label: "Won",         icon: "fa-trophy",       badge: "bg-emerald-100 text-emerald-700" },
  { key: "lost",        label: "Lost",        icon: "fa-circle-xmark", badge: "bg-rose-100 text-rose-700" },
];

const INVOICE_STATUS = {
  draft:     { label: "Draft",     cls: "bg-gray-100 text-gray-600",       icon: "fa-file-pen" },
  sent:      { label: "Sent",      cls: "bg-blue-100 text-blue-700",       icon: "fa-paper-plane" },
  paid:      { label: "Paid",      cls: "bg-emerald-100 text-emerald-700", icon: "fa-circle-check" },
  overdue:   { label: "Overdue",   cls: "bg-rose-100 text-rose-700",       icon: "fa-triangle-exclamation" },
  cancelled: { label: "Cancelled", cls: "bg-gray-200 text-gray-500",       icon: "fa-ban" },
};

const RESET_DEAL_FORM = {
  title: "", stage: "lead", customerName: "", customerEmail: "",
  customerPhone: "", assignedRep: "", closeDate: "", notes: "",
};

const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;

// ─── Invoice print helper ─────────────────────────────────────────────────────
function printInvoice(invoice) {
  const rows = (invoice.lineItems || []).map(li => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${li.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${li.qty}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${Number(li.unitPrice).toFixed(2)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">$${Number(li.totalPrice).toFixed(2)}</td>
    </tr>`).join('');

  const dueDate   = invoice.dueDate  ? new Date(invoice.dueDate).toLocaleDateString()  : '—';
  const createdAt = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
  const isPaid    = invoice.status === 'paid';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a2e;padding:40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px}
  .brand{font-size:26px;font-weight:700;color:#2563eb;letter-spacing:-0.5px}
  .brand span{color:#1a1a2e}
  .inv-num{font-size:20px;font-weight:700;margin-bottom:4px}
  .badge{display:inline-block;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;
         background:${isPaid?'#d1fae5':'#fee2e2'};color:${isPaid?'#065f46':'#991b1b'}}
  .parties{display:flex;gap:48px;margin-bottom:28px}
  .party-block .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead{background:#f1f5f9}
  thead th{padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#374151}
  thead th:last-child,thead th:nth-child(2),thead th:nth-child(3){text-align:right}
  .totals{display:flex;justify-content:flex-end}
  .totals-box{width:280px}
  .totals-row{display:flex;justify-content:space-between;padding:5px 0;color:#374151}
  .totals-row.total{font-weight:700;font-size:15px;border-top:2px solid #1a1a2e;padding-top:8px;margin-top:4px}
  .paid-stamp{text-align:center;margin:24px 0 0}
  .paid-stamp span{display:inline-block;border:3px solid #059669;color:#059669;font-weight:700;font-size:22px;padding:6px 24px;border-radius:8px;letter-spacing:3px;transform:rotate(-6deg)}
  .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
</style></head><body>
  <div class="header">
    <div>
      <div class="brand">Steps<span>CRM</span></div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px">Sales Invoice</div>
    </div>
    <div style="text-align:right">
      <div class="inv-num">${invoice.invoiceNumber}</div>
      <div style="color:#6b7280;margin-bottom:6px">Issued: ${createdAt} &nbsp;|&nbsp; Due: ${dueDate}</div>
      <span class="badge">${isPaid?'✓ PAID':'UNPAID'}</span>
    </div>
  </div>
  <div class="parties">
    <div class="party-block">
      <div class="label">Bill To</div>
      <p><strong>${invoice.billTo}</strong></p>
    </div>
    <div class="party-block">
      <div class="label">Payment Terms</div>
      <p>${invoice.paymentTerms||'Net 30'}</p>
      ${isPaid&&invoice.paidAt?`<p style="color:#059669;font-weight:600">Paid ${new Date(invoice.paidAt).toLocaleDateString()}</p>`:''}
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Description</th><th style="text-align:right">Qty</th>
      <th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals"><div class="totals-box">
    <div class="totals-row"><span>Subtotal</span><span>$${Number(invoice.subtotal||0).toFixed(2)}</span></div>
    ${invoice.taxRate>0?`<div class="totals-row"><span>Tax (${invoice.taxRate}%)</span><span>$${Number(invoice.taxAmount||0).toFixed(2)}</span></div>`:''}
    <div class="totals-row total"><span>Total Due</span><span>$${Number(invoice.totalAmount||0).toFixed(2)}</span></div>
  </div></div>
  ${isPaid?`<div class="paid-stamp"><span>PAID</span></div>`:''}
  ${invoice.notes?`<div style="margin-top:24px;padding:12px;background:#f9fafb;border-radius:8px;font-size:12px"><strong>Notes:</strong> ${invoice.notes}</div>`:''}
  <div class="footer">Generated by StepsCRM &nbsp;·&nbsp; ${new Date().toLocaleString()}</div>
  <script>window.onload=()=>{window.print()}<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) { win.document.write(html); win.document.close(); }
  else toast.error("Pop-ups blocked — please allow pop-ups for this site.");
}

// ─── Component ───────────────────────────────────────────────────────────────

const Sales = () => {
  // ── Data
  const [deals, setDeals]       = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats]       = useState({ totalDeals: 0, wonValue: 0, pipelineValue: 0, conversionRate: 0, activeCount: 0 });
  const [loading, setLoading]   = useState(true);

  // ── UI tabs
  const [activeTab, setActiveTab] = useState("sell"); // "sell" | "pipeline" | "invoices"

  // ── Quick Sale state
  const [saleCustomer, setSaleCustomer]     = useState({ name: "", email: "", phone: "" });
  const [saleItems, setSaleItems]           = useState([]);
  const [saleInvSearch, setSaleInvSearch]   = useState("");
  const [saleInvResults, setSaleInvResults] = useState([]);
  const [showSaleDropdown, setShowSaleDropdown] = useState(false);
  const [saleTax, setSaleTax]               = useState(0);
  const [saleDueDate, setSaleDueDate]       = useState("");
  const [saleTerms, setSaleTerms]           = useState("Net 30");
  const [saleNotes, setSaleNotes]           = useState("");
  const [saleMarkPaid, setSaleMarkPaid]     = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleSuccessData, setSaleSuccessData] = useState(null); // { invoice, customerEmail, isPaid }
  const saleDebounce                        = useRef(null);

  // ── Deal create modal
  const [showDealModal, setShowDealModal] = useState(false);
  const [dealForm, setDealForm]           = useState(RESET_DEAL_FORM);
  const [submittingDeal, setSubmittingDeal] = useState(false);

  // ── Deal panel (for pipeline tab)
  const [selectedDeal, setSelectedDeal]   = useState(null);
  const [panelTab, setPanelTab]           = useState("items");
  const [lineItems, setLineItems]         = useState([]);
  const [savingItems, setSavingItems]     = useState(false);
  const [generatingInv, setGeneratingInv] = useState(false);
  const [showInvModal, setShowInvModal]   = useState(false);
  const [invForm, setInvForm]             = useState({ taxRate: 0, dueDate: "", paymentTerms: "Net 30", notes: "" });
  const [panelInvSearch, setPanelInvSearch]     = useState("");
  const [panelInvResults, setPanelInvResults]   = useState([]);
  const [showPanelDropdown, setShowPanelDropdown] = useState(false);
  const panelDebounce                             = useRef(null);

  // ── Kanban filters
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.get("/api/sales/deals");
      if (res) { setDeals(res.deals || []); setStats(res.stats || {}); }
    } catch { toast.error("Failed to load deals"); }
    finally   { setLoading(false); }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await apiService.get("/api/sales/invoices");
      setInvoices(Array.isArray(res) ? res : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDeals(); fetchInvoices(); }, [fetchDeals, fetchInvoices]);

  // Inventory search – Quick Sale
  useEffect(() => {
    if (!showSaleDropdown) return;
    clearTimeout(saleDebounce.current);
    saleDebounce.current = setTimeout(async () => {
      try {
        const res = await apiService.get(`/api/sales/inventory-items?search=${encodeURIComponent(saleInvSearch)}`);
        setSaleInvResults(Array.isArray(res) ? res : []);
      } catch { setSaleInvResults([]); }
    }, 280);
    return () => clearTimeout(saleDebounce.current);
  }, [saleInvSearch, showSaleDropdown]);

  // Inventory search – Deal Panel
  useEffect(() => {
    if (!showPanelDropdown) return;
    clearTimeout(panelDebounce.current);
    panelDebounce.current = setTimeout(async () => {
      try {
        const res = await apiService.get(`/api/sales/inventory-items?search=${encodeURIComponent(panelInvSearch)}`);
        setPanelInvResults(Array.isArray(res) ? res : []);
      } catch { setPanelInvResults([]); }
    }, 280);
    return () => clearTimeout(panelDebounce.current);
  }, [panelInvSearch, showPanelDropdown]);

  // ─── Quick Sale helpers ────────────────────────────────────────────────────

  const addSaleItem = (invItem) => {
    const existing = saleItems.findIndex(li => String(li.inventoryItemId) === String(invItem._id));
    if (existing !== -1) {
      const copy = [...saleItems];
      copy[existing].qty += 1;
      copy[existing].lineRevenue = copy[existing].qty * copy[existing].sellingPrice;
      copy[existing].lineCost    = copy[existing].qty * copy[existing].costPrice;
      copy[existing].lineProfit  = copy[existing].lineRevenue - copy[existing].lineCost;
      setSaleItems(copy);
    } else {
      const cost = invItem.unitPrice || 0;
      setSaleItems(prev => [...prev, {
        inventoryItemId: invItem._id,
        itemName: invItem.name, itemCode: invItem.itemId,
        unit: invItem.unit || 'pcs', availableQty: invItem.quantity,
        qty: 1, costPrice: cost, sellingPrice: cost,
        lineRevenue: cost, lineCost: cost, lineProfit: 0,
      }]);
    }
    setShowSaleDropdown(false);
    setSaleInvSearch("");
  };

  const updateSaleItem = (idx, field, val) => {
    const copy = [...saleItems];
    copy[idx][field] = Math.max(field === 'qty' ? 1 : 0, Number(val) || 0);
    copy[idx].lineRevenue = copy[idx].qty * copy[idx].sellingPrice;
    copy[idx].lineCost    = copy[idx].qty * copy[idx].costPrice;
    copy[idx].lineProfit  = copy[idx].lineRevenue - copy[idx].lineCost;
    setSaleItems(copy);
  };

  const removeSaleItem = (idx) => setSaleItems(prev => prev.filter((_, i) => i !== idx));

  const saleSummary = useMemo(() => {
    const totalRevenue = saleItems.reduce((s, li) => s + li.lineRevenue, 0);
    const totalCost    = saleItems.reduce((s, li) => s + li.lineCost, 0);
    const totalProfit  = totalRevenue - totalCost;
    const margin       = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const taxAmt       = Math.round(totalRevenue * (saleTax / 100) * 100) / 100;
    const grandTotal   = totalRevenue + taxAmt;
    return { totalRevenue, totalCost, totalProfit, margin, taxAmt, grandTotal };
  }, [saleItems, saleTax]);

  const handleQuickSale = async (e) => {
    e.preventDefault();
    if (!saleCustomer.name.trim())  return toast.error("Please enter a customer name");
    if (saleItems.length === 0)     return toast.error("Add at least one item to sell");

    setSubmittingSale(true);
    try {
      // 1. Create a deal (stage 'won')
      const deal = await apiService.post("/api/sales/deals", {
        title:         `Sale – ${saleCustomer.name}`,
        value:         saleSummary.totalRevenue,
        stage:         "won",
        customerName:  saleCustomer.name,
        customerEmail: saleCustomer.email,
        customerPhone: saleCustomer.phone,
        assignedRep:   "",
        notes:         saleNotes,
      });

      // 2. Save line items + profit
      const savedDeal = await apiService.patch(`/api/sales/deals/${deal._id}/line-items`, { lineItems: saleItems });

      // 3. Generate invoice
      const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { invoice } = await apiService.post(`/api/sales/deals/${savedDeal._id}/invoice`, {
        taxRate:      Number(saleTax) || 0,
        dueDate:      saleDueDate || thirtyDays,
        paymentTerms: saleTerms,
        notes:        saleNotes,
      });

      // 4. If user chose "mark paid now" → mark paid (stock gets deducted)
      let finalInvoice = invoice;
      if (saleMarkPaid) {
        finalInvoice = await apiService.patch(`/api/sales/invoices/${invoice._id}/status`, { status: "paid" });
      }

      toast.success(`Sale complete! Invoice ${invoice.invoiceNumber} generated.`);

      // 5. Show success modal (replaces window.confirm)
      setSaleSuccessData({
        invoice:       finalInvoice,
        customerEmail: saleCustomer.email,
        isPaid:        saleMarkPaid,
      });

      // 6. Reset form
      setSaleCustomer({ name: "", email: "", phone: "" });
      setSaleItems([]);
      setSaleTax(0);
      setSaleDueDate("");
      setSaleTerms("Net 30");
      setSaleNotes("");
      setSaleMarkPaid(false);
      fetchDeals();
      fetchInvoices();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Sale failed — please try again");
    } finally {
      setSubmittingSale(false);
    }
  };

  // ─── Deal CRUD ─────────────────────────────────────────────────────────────

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    setSubmittingDeal(true);
    try {
      await apiService.post("/api/sales/deals", { ...dealForm, value: 0 });
      toast.success("Deal added to pipeline");
      setShowDealModal(false);
      setDealForm(RESET_DEAL_FORM);
      fetchDeals();
    } catch { toast.error("Failed to create deal"); }
    finally   { setSubmittingDeal(false); }
  };

  const handleUpdateStage = async (dealId, stage) => {
    try {
      await apiService.patch(`/api/sales/deals/${dealId}`, { stage });
      setDeals(prev => prev.map(d => d._id === dealId ? { ...d, stage } : d));
      if (selectedDeal?._id === dealId) setSelectedDeal(p => ({ ...p, stage }));
    } catch { toast.error("Failed to update stage"); }
  };

  const handleDeleteDeal = async (dealId) => {
    if (!window.confirm("Delete this deal?")) return;
    try {
      await apiService.delete(`/api/sales/deals/${dealId}`);
      toast.success("Deal deleted");
      if (selectedDeal?._id === dealId) setSelectedDeal(null);
      fetchDeals();
    } catch { toast.error("Failed to delete deal"); }
  };

  // ─── Deal panel ────────────────────────────────────────────────────────────

  const openPanel = (deal) => {
    setSelectedDeal(deal);
    setPanelTab("items");
    setLineItems(deal.lineItems?.length ? [...deal.lineItems] : []);
    setPanelInvSearch(""); setPanelInvResults([]); setShowPanelDropdown(false);
  };

  const addPanelItem = (invItem) => {
    const existing = lineItems.findIndex(li => String(li.inventoryItemId) === String(invItem._id));
    if (existing !== -1) {
      const copy = [...lineItems];
      copy[existing].qty += 1;
      copy[existing].lineRevenue = copy[existing].qty * copy[existing].sellingPrice;
      copy[existing].lineCost    = copy[existing].qty * copy[existing].costPrice;
      copy[existing].lineProfit  = copy[existing].lineRevenue - copy[existing].lineCost;
      setLineItems(copy);
    } else {
      const cost = invItem.unitPrice || 0;
      setLineItems(prev => [...prev, {
        inventoryItemId: invItem._id, itemName: invItem.name,
        itemCode: invItem.itemId, unit: invItem.unit || 'pcs',
        qty: 1, costPrice: cost, sellingPrice: cost,
        lineRevenue: cost, lineCost: cost, lineProfit: 0,
      }]);
    }
    setShowPanelDropdown(false); setPanelInvSearch("");
  };

  const updatePanelItem = (idx, field, val) => {
    const copy = [...lineItems];
    copy[idx][field] = Math.max(field === 'qty' ? 1 : 0, Number(val) || 0);
    copy[idx].lineRevenue = copy[idx].qty * copy[idx].sellingPrice;
    copy[idx].lineCost    = copy[idx].qty * copy[idx].costPrice;
    copy[idx].lineProfit  = copy[idx].lineRevenue - copy[idx].lineCost;
    setLineItems(copy);
  };

  const removePanelItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));

  const panelSummary = useMemo(() => {
    const totalRevenue = lineItems.reduce((s, li) => s + li.qty * li.sellingPrice, 0);
    const totalCost    = lineItems.reduce((s, li) => s + li.qty * li.costPrice,    0);
    const totalProfit  = totalRevenue - totalCost;
    const margin       = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { totalRevenue, totalCost, totalProfit, margin };
  }, [lineItems]);

  const saveLineItems = async () => {
    setSavingItems(true);
    try {
      const res = await apiService.patch(`/api/sales/deals/${selectedDeal._id}/line-items`, { lineItems });
      toast.success("Line items saved");
      setSelectedDeal(res);
      setLineItems(res.lineItems || []);
      fetchDeals();
    } catch { toast.error("Failed to save line items"); }
    finally   { setSavingItems(false); }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();
    setGeneratingInv(true);
    try {
      const res = await apiService.post(`/api/sales/deals/${selectedDeal._id}/invoice`, invForm);
      if (res.alreadyExists) toast("Invoice already exists", { icon: "ℹ️" });
      else toast.success(`Invoice ${res.invoice.invoiceNumber} generated!`);
      setSelectedDeal(res.deal);
      setShowInvModal(false);
      fetchDeals(); fetchInvoices();
    } catch (err) { toast.error(err?.response?.data?.error || "Failed to generate invoice"); }
    finally       { setGeneratingInv(false); }
  };

  // ─── Invoices ──────────────────────────────────────────────────────────────

  const updateInvoiceStatus = async (invoiceId, status) => {
    try {
      await apiService.patch(`/api/sales/invoices/${invoiceId}/status`, { status });
      const msg = status === 'paid' ? 'Marked as Paid! Stock deducted.' : `Invoice marked ${status}.`;
      toast.success(msg);
      fetchInvoices(); fetchDeals();
    } catch { toast.error("Failed to update invoice status"); }
  };

  const getInvoiceStatus = (inv) => {
    if (inv.status === 'paid' || inv.status === 'cancelled') return inv.status;
    if (inv.dueDate && new Date(inv.dueDate) < new Date()) return 'overdue';
    return inv.status;
  };

  // ─── Kanban ────────────────────────────────────────────────────────────────

  const filteredDeals = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return deals.filter(d => {
      const match = d.title.toLowerCase().includes(q) || d.customerName.toLowerCase().includes(q);
      return match && (stageFilter ? d.stage === stageFilter : true);
    });
  }, [deals, searchQuery, stageFilter]);

  const pipelineColumns = useMemo(() => {
    const cols = Object.fromEntries(STAGES.map(s => [s.key, []]));
    filteredDeals.forEach(d => { if (cols[d.stage]) cols[d.stage].push(d); });
    return cols;
  }, [filteredDeals]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading && deals.length === 0) return <ModuleLoader moduleName="Sales" subtitle="Loading Sales CRM…" />;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <Breadcrumb items={[{ label: "Home", href: "/home", icon: "fa-house" }, { label: "Sales CRM", icon: "fa-sack-dollar" }]} />

      <div className="p-4 md:p-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Sales CRM</h2>
            <p className="text-gray-500 mt-1 text-sm">Record sales, manage your pipeline &amp; track invoices</p>
          </div>
          <button onClick={() => setShowDealModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg font-semibold shadow-sm transition-colors text-sm hover:bg-gray-50 self-start sm:self-auto">
            <i className="fa-solid fa-plus"></i> Add to Pipeline
          </button>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pipeline Value",  value: fmt(stats.pipelineValue), sub: `${stats.activeCount} active`,   icon: "fa-chart-line",  bg: "bg-blue-50",    text: "text-blue-600" },
            { label: "Total Won",       value: fmt(stats.wonValue),       sub: "Closed revenue",               icon: "fa-sack-dollar", bg: "bg-emerald-50", text: "text-emerald-600" },
            { label: "Conversion Rate", value: pct(stats.conversionRate), sub: "Won ÷ total deals",            icon: "fa-percent",     bg: "bg-yellow-50",  text: "text-yellow-600" },
            { label: "Total Deals",     value: stats.totalDeals || 0,     sub: "All time",                     icon: "fa-database",    bg: "bg-purple-50",  text: "text-purple-600" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`${card.bg} ${card.text} p-2.5 rounded-lg shrink-0`}>
                  <i className={`fa-solid ${card.icon} text-base`}></i>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { key: "sell",     label: "Sell",     icon: "fa-cash-register" },
            { key: "pipeline", label: "Pipeline", icon: "fa-columns" },
            { key: "invoices", label: "Invoices", icon: "fa-file-invoice-dollar", count: invoices.length },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <i className={`fa-solid ${t.icon} text-xs`}></i>
              {t.label}
              {t.count !== undefined && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${activeTab === t.key ? "bg-primary text-white" : "bg-gray-300 text-gray-600"}`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════ SELL TAB ══════════ */}
        {activeTab === "sell" && (
          <form onSubmit={handleQuickSale} className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Left — Customer + Items */}
            <div className="lg:col-span-2 space-y-5">

              {/* Customer Info */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                  Customer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Customer Name <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="e.g. Acme Corp or John Doe" value={saleCustomer.name}
                      onChange={e => setSaleCustomer(p => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Email</label>
                    <input type="email" placeholder="optional" value={saleCustomer.email}
                      onChange={e => setSaleCustomer(p => ({ ...p, email: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Phone</label>
                    <input type="tel" placeholder="optional" value={saleCustomer.phone}
                      onChange={e => setSaleCustomer(p => ({ ...p, phone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Payment Terms</label>
                    <select value={saleTerms} onChange={e => setSaleTerms(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50">
                      {["Net 7", "Net 14", "Net 30", "Net 60", "Due on Receipt"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Item Picker */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                  Items Being Sold
                </h3>

                {/* Search */}
                <div className="relative mb-4">
                  <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                  <input type="text" placeholder="Search inventory items to add…"
                    value={saleInvSearch}
                    onFocus={() => setShowSaleDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSaleDropdown(false), 200)}
                    onChange={e => { setSaleInvSearch(e.target.value); setShowSaleDropdown(true); }}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />

                  {showSaleDropdown && (
                    <div className="absolute z-30 left-0 right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                      {saleInvResults.length === 0 ? (
                        <div className="p-4 text-xs text-gray-400 text-center">
                          {saleInvSearch ? 'No items with available stock' : 'Start typing to search inventory…'}
                        </div>
                      ) : saleInvResults.map(item => (
                        <button key={item._id} type="button"
                          onMouseDown={() => addSaleItem(item)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors text-left gap-4 border-b border-gray-50 last:border-0">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.itemId} · {item.category}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-gray-800">{fmt(item.unitPrice)}</p>
                            <p className="text-xs text-gray-400">{item.quantity} {item.unit} in stock</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                {saleItems.length > 0 ? (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Item</th>
                          <th className="px-3 py-2.5 text-right w-20">Qty</th>
                          <th className="px-3 py-2.5 text-right w-24 hidden sm:table-cell">Cost</th>
                          <th className="px-3 py-2.5 text-right w-28">Sell Price</th>
                          <th className="px-3 py-2.5 text-right w-24 hidden md:table-cell">Profit</th>
                          <th className="px-2 py-2.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {saleItems.map((li, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-gray-900 text-sm truncate max-w-[150px]">{li.itemName}</p>
                              <p className="text-xs text-gray-400">{li.unit} · {li.availableQty} avail.</p>
                            </td>
                            <td className="px-3 py-3">
                              <input type="number" min="1" max={li.availableQty || 9999} value={li.qty}
                                onChange={e => updateSaleItem(idx, 'qty', e.target.value)}
                                className="w-16 text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                            </td>
                            <td className="px-3 py-3 text-right text-gray-400 font-mono text-sm hidden sm:table-cell">
                              {fmt(li.costPrice)}
                            </td>
                            <td className="px-3 py-3">
                              <input type="number" min="0" step="0.01" value={li.sellingPrice}
                                onChange={e => updateSaleItem(idx, 'sellingPrice', e.target.value)}
                                className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40" />
                            </td>
                            <td className={`px-3 py-3 text-right font-bold font-mono text-sm hidden md:table-cell ${li.lineProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {fmt(li.lineProfit)}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button type="button" onClick={() => removeSaleItem(idx)}
                                className="text-gray-300 hover:text-rose-500 transition-colors p-1">
                                <i className="fa-solid fa-times text-xs"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 text-center text-gray-400">
                    <i className="fa-solid fa-cart-plus text-4xl mb-3 opacity-25"></i>
                    <p className="text-sm text-gray-500 font-medium">No items added yet</p>
                    <p className="text-xs mt-1">Use the search above to find items from your inventory</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right — Summary + Submit */}
            <div className="space-y-4">

              {/* Profit & Totals Summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                  Sale Summary
                </h3>

                {/* Profit breakdown */}
                <div className="space-y-2.5 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-900">{fmt(saleSummary.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Cost</span>
                    <span className="font-semibold text-gray-600">{fmt(saleSummary.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2.5">
                    <span className="text-gray-500">Gross Profit</span>
                    <span className={`font-bold ${saleSummary.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(saleSummary.totalProfit)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Margin</span>
                    <span className={`font-bold ${saleSummary.margin >= 20 ? 'text-emerald-600' : saleSummary.margin >= 0 ? 'text-yellow-600' : 'text-rose-500'}`}>{pct(saleSummary.margin)}</span>
                  </div>
                </div>

                {/* Tax input */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-2.5 mb-4 border border-gray-100">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700">Tax Rate (%)</label>
                    <input type="number" min="0" max="100" step="0.1" value={saleTax}
                      onChange={e => setSaleTax(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white" />
                  </div>
                  {Number(saleTax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tax ({saleTax}%)</span>
                      <span className="font-semibold text-gray-700">{fmt(saleSummary.taxAmt)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="font-bold text-gray-900 text-sm">Total Due</span>
                    <span className="font-bold text-lg text-gray-900">{fmt(saleSummary.grandTotal)}</span>
                  </div>
                </div>

                {/* Due date */}
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-xs font-semibold text-gray-700">Invoice Due Date</label>
                  <input type="date" value={saleDueDate} onChange={e => setSaleDueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg h-9 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-xs font-semibold text-gray-700">Notes</label>
                  <textarea rows={2} value={saleNotes} onChange={e => setSaleNotes(e.target.value)}
                    placeholder="Optional notes for the invoice…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50 resize-none" />
                </div>

                {/* Mark paid toggle */}
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-5 hover:bg-emerald-100/60 transition-colors">
                  <div className="relative shrink-0">
                    <input type="checkbox" className="sr-only" checked={saleMarkPaid} onChange={e => setSaleMarkPaid(e.target.checked)} />
                    <div className={`w-10 h-5 rounded-full transition-colors ${saleMarkPaid ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${saleMarkPaid ? 'translate-x-5' : ''}`}></div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-800">Mark as Paid Now</p>
                    <p className="text-[10px] text-emerald-600">Payment received — stock will be deducted immediately</p>
                  </div>
                </label>

                {/* Submit */}
                <button type="submit" disabled={submittingSale || saleItems.length === 0 || !saleCustomer.name.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {submittingSale ? (
                    <><i className="fa-solid fa-spinner fa-spin"></i> Processing…</>
                  ) : (
                    <><i className="fa-solid fa-cash-register"></i> Complete Sale &amp; Generate Invoice</>
                  )}
                </button>
                {(saleItems.length === 0 || !saleCustomer.name.trim()) && (
                  <p className="text-center text-xs text-gray-400 mt-2">
                    {!saleCustomer.name.trim() ? 'Enter customer name' : 'Add at least one item'} to proceed
                  </p>
                )}
              </div>
            </div>
          </form>
        )}

        {/* ══════════ PIPELINE TAB ══════════ */}
        {activeTab === "pipeline" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="relative flex-1">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                <input type="text" placeholder="Search deals…" value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
              </div>
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
                className="w-full sm:w-44 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50">
                <option value="">All Stages</option>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6 pb-4">
              <div className="flex gap-4" style={{ minWidth: "max-content" }}>
                {STAGES.map(stage => {
                  const cols = pipelineColumns[stage.key] || [];
                  return (
                    <div key={stage.key} className="flex flex-col bg-gray-100/70 border border-gray-200 rounded-xl p-3" style={{ width: 252, minWidth: 252 }}>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <i className={`fa-solid ${stage.icon} text-xs text-gray-500`}></i>
                          <span className="font-semibold text-gray-700 text-sm truncate">{stage.label}</span>
                        </div>
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>{cols.length}</span>
                      </div>
                      <div className="space-y-2.5 flex-1 overflow-y-auto" style={{ maxHeight: 500 }}>
                        {cols.map(deal => (
                          <div key={deal._id} onClick={() => openPanel(deal)}
                            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group relative cursor-pointer">
                            <button onClick={e => { e.stopPropagation(); handleDeleteDeal(deal._id); }}
                              className="absolute top-2 right-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all text-xs">
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                            <p className="font-semibold text-gray-900 text-sm pr-5 mb-1 leading-snug">{deal.title}</p>
                            <div className="flex items-baseline gap-2 mb-2">
                              <p className="font-bold text-gray-800 text-base">{fmt(deal.totalRevenue || deal.value)}</p>
                              {deal.profitMargin > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${deal.profitMargin >= 20 ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                  {pct(deal.profitMargin)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mb-2"><i className="fa-solid fa-user mr-1 text-[10px]"></i>{deal.customerName}</p>
                            <div className="flex gap-1.5 mb-2.5 flex-wrap">
                              {deal.lineItems?.length > 0 && <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"><i className="fa-solid fa-boxes-stacked mr-1"></i>{deal.lineItems.length} item{deal.lineItems.length !== 1 ? 's' : ''}</span>}
                              {deal.linkedInvoiceId && <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded"><i className="fa-solid fa-file-invoice mr-1"></i>Invoice</span>}
                            </div>
                            <select value={deal.stage} onClick={e => e.stopPropagation()} onChange={e => handleUpdateStage(deal._id, e.target.value)}
                              className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/40">
                              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                          </div>
                        ))}
                        {cols.length === 0 && <div className="text-center text-gray-400 text-xs py-10 italic">No deals</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ══════════ INVOICES TAB ══════════ */}
        {activeTab === "invoices" && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Sales Invoices</h3>
              <span className="text-xs text-gray-500">{invoices.length} total</span>
            </div>
            {invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <i className="fa-solid fa-file-invoice-dollar text-4xl mb-3 opacity-30"></i>
                <p className="font-medium text-gray-500">No invoices yet</p>
                <p className="text-sm mt-1">Complete a sale to generate your first invoice</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3 text-left">Invoice #</th>
                      <th className="px-5 py-3 text-left">Customer</th>
                      <th className="px-5 py-3 text-left hidden md:table-cell">Deal</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Status</th>
                      <th className="px-5 py-3 text-left hidden lg:table-cell">Due</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoices.map(inv => {
                      const statusKey = getInvoiceStatus(inv);
                      const statusDef = INVOICE_STATUS[statusKey] || INVOICE_STATUS.draft;
                      const isPaid = inv.status === 'paid';
                      const isCancelled = inv.status === 'cancelled';
                      return (
                        <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-semibold text-gray-900 text-xs">{inv.invoiceNumber}</td>
                          <td className="px-5 py-3.5 text-gray-700">{inv.billTo}</td>
                          <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell max-w-[160px] truncate">{inv.linkedDealId?.title || '—'}</td>
                          <td className="px-5 py-3.5 text-right font-bold text-gray-900">{fmt(inv.totalAmount)}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusDef.cls}`}>
                              <i className={`fa-solid ${statusDef.icon} text-[10px]`}></i>{statusDef.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs hidden lg:table-cell">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                            {isPaid && inv.paidAt && <span className="ml-2 text-emerald-600 font-semibold">· Paid {new Date(inv.paidAt).toLocaleDateString()}</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {!isPaid && !isCancelled && inv.status !== 'sent' && (
                                <button onClick={() => updateInvoiceStatus(inv._id, 'sent')}
                                  className="text-xs px-2.5 py-1 rounded-md border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors font-semibold whitespace-nowrap">
                                  <i className="fa-solid fa-paper-plane mr-1"></i>Sent
                                </button>
                              )}
                              {!isPaid && !isCancelled && (
                                <button onClick={() => updateInvoiceStatus(inv._id, 'paid')}
                                  className="text-xs px-2.5 py-1 rounded-md border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors font-semibold whitespace-nowrap">
                                  <i className="fa-solid fa-circle-check mr-1"></i>Paid
                                </button>
                              )}
                              {isPaid && (
                                <button onClick={() => updateInvoiceStatus(inv._id, 'sent')}
                                  className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors font-semibold whitespace-nowrap">
                                  <i className="fa-solid fa-rotate-left mr-1"></i>Revert
                                </button>
                              )}
                              <button onClick={() => printInvoice(inv)}
                                className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors font-semibold">
                                <i className="fa-solid fa-print"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ DEAL DETAIL PANEL ══════════ */}
      {selectedDeal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={() => setSelectedDeal(null)} />
          <div className="fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl border-l border-gray-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 text-base truncate">{selectedDeal.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500"><i className="fa-solid fa-user mr-1"></i>{selectedDeal.customerName}</span>
                  <span className="text-xs font-bold text-primary">{fmt(selectedDeal.totalRevenue || selectedDeal.value)}</span>
                  {selectedDeal.profitMargin > 0 && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedDeal.profitMargin >= 20 ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      {pct(selectedDeal.profitMargin)} margin
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="shrink-0 p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex border-b border-gray-100 bg-white shrink-0">
              {[{ key: "items", label: "Items & Profit", icon: "fa-boxes-stacked" }, { key: "info", label: "Deal Info", icon: "fa-circle-info" }].map(t => (
                <button key={t.key} onClick={() => setPanelTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${panelTab === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <i className={`fa-solid ${t.icon} text-xs`}></i>{t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {panelTab === "items" && (
                <div className="p-5 space-y-4">
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                    <input type="text" placeholder="Add inventory item…" value={panelInvSearch}
                      onFocus={() => setShowPanelDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPanelDropdown(false), 200)}
                      onChange={e => { setPanelInvSearch(e.target.value); setShowPanelDropdown(true); }}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                    {showPanelDropdown && (
                      <div className="absolute z-20 left-0 right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                        {panelInvResults.length === 0 ? (
                          <div className="p-4 text-xs text-gray-400 text-center">{panelInvSearch ? 'No items found' : 'Type to search inventory…'}</div>
                        ) : panelInvResults.map(item => (
                          <button key={item._id} type="button" onMouseDown={() => addPanelItem(item)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left gap-3 border-b border-gray-50 last:border-0">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                              <p className="text-xs text-gray-400">{item.itemId} · {item.category}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-bold text-gray-700">{fmt(item.unitPrice)}</p>
                              <p className="text-[10px] text-gray-400">{item.quantity} {item.unit}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {lineItems.length > 0 ? (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500 uppercase tracking-wide text-[10px]">
                          <tr>
                            <th className="px-3 py-2 text-left">Item</th>
                            <th className="px-3 py-2 text-right w-16">Qty</th>
                            <th className="px-3 py-2 text-right w-20">Cost</th>
                            <th className="px-3 py-2 text-right w-20">Sell</th>
                            <th className="px-3 py-2 text-right w-20">Profit</th>
                            <th className="px-2 py-2 w-7"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {lineItems.map((li, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <p className="font-semibold text-gray-900 truncate max-w-[110px]">{li.itemName}</p>
                                <p className="text-gray-400 text-[10px]">{li.unit}</p>
                              </td>
                              <td className="px-3 py-2">
                                <input type="number" min="1" value={li.qty}
                                  onChange={e => updatePanelItem(idx, 'qty', e.target.value)}
                                  className="w-14 text-right border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
                              </td>
                              <td className="px-3 py-2 text-right text-gray-400 font-mono">{fmt(li.costPrice)}</td>
                              <td className="px-3 py-2">
                                <input type="number" min="0" step="0.01" value={li.sellingPrice}
                                  onChange={e => updatePanelItem(idx, 'sellingPrice', e.target.value)}
                                  className="w-20 text-right border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40" />
                              </td>
                              <td className={`px-3 py-2 text-right font-bold font-mono ${li.lineProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{fmt(li.lineProfit)}</td>
                              <td className="px-2 py-2">
                                <button type="button" onClick={() => removePanelItem(idx)}
                                  className="text-gray-300 hover:text-rose-500 transition-colors">
                                  <i className="fa-solid fa-times text-xs"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                      <i className="fa-solid fa-boxes-stacked text-3xl mb-2 opacity-30"></i>
                      <p className="text-sm text-gray-500">No items — search inventory above</p>
                    </div>
                  )}

                  {lineItems.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-gray-700 mb-3"><i className="fa-solid fa-chart-pie text-primary mr-1.5"></i>Profit Summary</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Total Cost",    value: fmt(panelSummary.totalCost),    cls: "text-gray-700" },
                          { label: "Total Revenue", value: fmt(panelSummary.totalRevenue), cls: "text-blue-700" },
                          { label: "Gross Profit",  value: fmt(panelSummary.totalProfit),  cls: panelSummary.totalProfit >= 0 ? "text-emerald-700" : "text-rose-600" },
                          { label: "Margin",        value: pct(panelSummary.margin),       cls: panelSummary.margin >= 20 ? "text-emerald-700" : "text-yellow-700" },
                        ].map(row => (
                          <div key={row.label} className="bg-white rounded-lg px-3 py-2.5 border border-white/80 shadow-sm">
                            <p className="text-[10px] text-gray-400 font-medium mb-0.5">{row.label}</p>
                            <p className={`text-sm font-bold ${row.cls}`}>{row.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {panelTab === "info" && (
                <div className="p-5 space-y-4">
                  {[
                    { label: "Customer", value: selectedDeal.customerName },
                    { label: "Email",    value: selectedDeal.customerEmail || '—' },
                    { label: "Phone",    value: selectedDeal.customerPhone || '—' },
                    { label: "Rep",      value: selectedDeal.assignedRep },
                    { label: "Close",    value: selectedDeal.closeDate ? new Date(selectedDeal.closeDate).toLocaleDateString() : '—' },
                    { label: "Notes",    value: selectedDeal.notes || '—' },
                  ].map(row => (
                    <div key={row.label}>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{row.label}</span>
                      <p className="text-sm text-gray-800 font-medium mt-0.5">{row.value}</p>
                    </div>
                  ))}
                  <div>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stage</span>
                    <select value={selectedDeal.stage} onChange={e => handleUpdateStage(selectedDeal._id, e.target.value)}
                      className="mt-1 w-full sm:w-56 border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50 font-medium">
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 px-5 py-4 bg-white flex flex-wrap items-center gap-3">
              {panelTab === "items" && (
                <>
                  <button onClick={saveLineItems} disabled={savingItems}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover shadow-sm transition-colors disabled:opacity-60">
                    <i className="fa-solid fa-floppy-disk"></i>{savingItems ? "Saving…" : "Save Items"}
                  </button>
                  {lineItems.length > 0 && (
                    selectedDeal.linkedInvoiceId ? (
                      <button onClick={() => { setActiveTab("invoices"); setSelectedDeal(null); }}
                        className="flex items-center gap-2 px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg text-sm font-semibold hover:bg-purple-100 transition-colors">
                        <i className="fa-solid fa-file-invoice"></i>View Invoice
                      </button>
                    ) : (
                      <button onClick={() => setShowInvModal(true)}
                        className="flex items-center gap-2 px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 rounded-lg text-sm font-semibold hover:bg-emerald-100 transition-colors">
                        <i className="fa-solid fa-file-invoice-dollar"></i>Generate Invoice
                      </button>
                    )
                  )}
                </>
              )}
              <button onClick={() => setSelectedDeal(null)} className="ml-auto text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">Close</button>
            </div>
          </div>
        </>
      )}

      {/* ══════════ ADD PIPELINE DEAL MODAL ══════════ */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white shadow-2xl rounded-xl w-full max-w-lg overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50 shrink-0">
              <h3 className="font-bold text-gray-900 text-lg">Add to Pipeline</h3>
              <button onClick={() => setShowDealModal(false)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="flex flex-col flex-1 min-h-0">
              <div className="overflow-y-auto flex-1 p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Deal Title <span className="text-red-500">*</span></label>
                    <input type="text" required value={dealForm.title} onChange={e => setDealForm({ ...dealForm, title: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Stage</label>
                    <select value={dealForm.stage} onChange={e => setDealForm({ ...dealForm, stage: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50">
                      {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Close Date</label>
                    <input type="date" value={dealForm.closeDate} onChange={e => setDealForm({ ...dealForm, closeDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Customer Name <span className="text-red-500">*</span></label>
                    <input type="text" required value={dealForm.customerName} onChange={e => setDealForm({ ...dealForm, customerName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Email</label>
                    <input type="email" value={dealForm.customerEmail} onChange={e => setDealForm({ ...dealForm, customerEmail: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Phone</label>
                    <input type="tel" value={dealForm.customerPhone} onChange={e => setDealForm({ ...dealForm, customerPhone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-700">Notes</label>
                    <textarea rows={2} value={dealForm.notes} onChange={e => setDealForm({ ...dealForm, notes: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50 resize-none" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0">
                <button type="button" onClick={() => setShowDealModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-white transition-colors">Cancel</button>
                <button type="submit" disabled={submittingDeal}
                  className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover shadow-sm transition-colors disabled:opacity-60">
                  {submittingDeal ? "Adding…" : "Add Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ GENERATE INVOICE MODAL (Pipeline) ══════════ */}
      {showInvModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white shadow-2xl rounded-xl w-full max-w-md border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900">Generate Invoice</h3>
              <button onClick={() => setShowInvModal(false)} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleGenerateInvoice}>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-blue-900">{lineItems.length} items · Subtotal {fmt(panelSummary.totalRevenue)}</p>
                  <p className="text-blue-600 text-xs mt-0.5">Profit {fmt(panelSummary.totalProfit)} ({pct(panelSummary.margin)} margin)</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Tax Rate (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={invForm.taxRate}
                    onChange={e => setInvForm({ ...invForm, taxRate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Due Date</label>
                  <input type="date" value={invForm.dueDate}
                    onChange={e => setInvForm({ ...invForm, dueDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Payment Terms</label>
                  <select value={invForm.paymentTerms} onChange={e => setInvForm({ ...invForm, paymentTerms: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50">
                    {["Net 7", "Net 14", "Net 30", "Net 60", "Due on Receipt"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700">Notes</label>
                  <textarea rows={2} value={invForm.notes}
                    onChange={e => setInvForm({ ...invForm, notes: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-gray-50 resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                <button type="button" onClick={() => setShowInvModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-white transition-colors">Cancel</button>
                <button type="submit" disabled={generatingInv}
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-60">
                  <i className="fa-solid fa-file-invoice-dollar mr-2"></i>
                  {generatingInv ? "Generating…" : "Generate Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ SALE SUCCESS MODAL ══════════ */}
      {saleSuccessData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md border border-gray-200 overflow-hidden">

            {/* Green header */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-circle-check text-white text-3xl"></i>
              </div>
              <h2 className="text-white font-bold text-xl mb-1">Sale Complete!</h2>
              <p className="text-emerald-100 text-sm">Your invoice has been generated successfully</p>
            </div>

            {/* Invoice details */}
            <div className="px-6 py-5 space-y-3">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Number</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">{saleSuccessData.invoice?.invoiceNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Amount</span>
                  <span className="font-bold text-gray-900 text-lg">{fmt(saleSuccessData.invoice?.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</span>
                  <span className="text-sm text-gray-700">
                    {saleSuccessData.invoice?.dueDate ? new Date(saleSuccessData.invoice.dueDate).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Status</span>
                  {saleSuccessData.isPaid ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      <i className="fa-solid fa-circle-check text-[10px]"></i>Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                      <i className="fa-solid fa-clock text-[10px]"></i>Pending Payment
                    </span>
                  )}
                </div>
              </div>

              {saleSuccessData.isPaid && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700">
                  <i className="fa-solid fa-boxes-stacked shrink-0"></i>
                  <span>Inventory stock has been automatically deducted for all items in this sale.</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  printInvoice({ ...saleSuccessData.invoice, linkedDealId: { customerEmail: saleSuccessData.customerEmail } });
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover shadow-md transition-all">
                <i className="fa-solid fa-print"></i>
                Print Invoice
              </button>
              <button
                onClick={() => { setActiveTab("invoices"); setSaleSuccessData(null); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                <i className="fa-solid fa-file-invoice-dollar"></i>
                View All Invoices
              </button>
              <button
                onClick={() => setSaleSuccessData(null)}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors">
                Close &amp; Record Another Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
