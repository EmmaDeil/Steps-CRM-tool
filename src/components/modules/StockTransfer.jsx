import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";

// ── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending:    "bg-yellow-100 text-yellow-700",
  draft:      "bg-gray-100 text-gray-600",
  approved:   "bg-blue-100 text-blue-700",
  in_transit: "bg-purple-100 text-purple-700",
  completed:  "bg-green-100 text-green-700",
  cancelled:  "bg-red-100 text-red-600",
};

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] || "bg-gray-100 text-gray-500"}`}>
    {status?.replace("_", " ")}
  </span>
);

// ── Main Component ────────────────────────────────────────────────────────────

const StockTransfer = () => {
  const [transfers, setTransfers]       = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [isLoading, setIsLoading]       = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch]             = useState("");

  const [locations, setLocations]       = useState([]);

  // New Transfer modal
  const [showModal, setShowModal]       = useState(false);
  const [step, setStep]                 = useState(1); // 1=locations, 2=items
  const [fromLoc, setFromLoc]           = useState(null);
  const [toLoc, setToLoc]               = useState(null);
  const [availableItems, setAvailableItems] = useState([]);
  const [lineItems, setLineItems]       = useState([]); // [{ item, qty }]
  const [transferNotes, setTransferNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail drawer
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [showDetail, setShowDetail]     = useState(false);
  const [approving, setApproving]       = useState(false);

  // ── Fetching ───────────────────────────────────────────────────────────────

  const fetchTransfers = useCallback(async (pageNum = 1, status = "all", q = "") => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ page: pageNum, limit: 20 });
      if (status && status !== "all") params.set("status", status);
      if (q) params.set("search", q);
      const res = await apiService.get(`/api/stock-transfers?${params}`);
      setTransfers(res.transfers || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(pageNum);
    } catch {
      toast.error("Failed to load stock transfers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const locs = await apiService.get("/api/store-locations");
      setLocations(locs);
    } catch {
      /* silently ignore */
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
    fetchLocations();
  }, [fetchTransfers, fetchLocations]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchTransfers(1, filterStatus, search), 400);
    return () => clearTimeout(t);
  }, [search, filterStatus, fetchTransfers]);

  // ── New Transfer flow ─────────────────────────────────────────────────────

  const openNewTransfer = () => {
    setStep(1);
    setFromLoc(null);
    setToLoc(null);
    setLineItems([]);
    setAvailableItems([]);
    setTransferNotes("");
    setShowModal(true);
  };

  const handleLocationsNext = async () => {
    if (!fromLoc || !toLoc) return toast.error("Select both locations");
    if (fromLoc._id === toLoc._id) return toast.error("Source and destination must differ");
    try {
      const res = await apiService.get(
        `/api/inventory?limit=200&locationId=${fromLoc._id}`
      );
      const items = (res?.items || []).filter(item => {
        const sl = item.stockLevels?.find(s => s.locationId === fromLoc._id);
        return sl ? sl.quantity > 0 : item.quantity > 0;
      });
      setAvailableItems(items);
      setStep(2);
    } catch {
      toast.error("Failed to load inventory for that location");
    }
  };

  const toggleItemSelection = (item) => {
    setLineItems(prev => {
      const exists = prev.find(li => li.item._id === item._id);
      if (exists) return prev.filter(li => li.item._id !== item._id);
      return [...prev, { item, qty: 1 }];
    });
  };

  const setQty = (itemId, qty) => {
    setLineItems(prev => prev.map(li =>
      li.item._id === itemId ? { ...li, qty: Math.max(1, Number(qty)) } : li
    ));
  };

  const getAvailableAtFrom = (item) => {
    const sl = item.stockLevels?.find(s => s.locationId === fromLoc?._id);
    return sl ? sl.quantity : item.quantity;
  };

  const handleSubmitTransfer = async () => {
    if (lineItems.length === 0) return toast.error("Add at least one item");
    setIsSubmitting(true);
    try {
      await apiService.post("/api/stock-transfers", {
        fromLocationId:   fromLoc._id,
        fromLocationName: fromLoc.name,
        toLocationId:     toLoc._id,
        toLocationName:   toLoc.name,
        lineItems: lineItems.map(li => ({
          inventoryItemId: li.item._id,
          itemName: li.item.name,
          itemCode: li.item.itemId,
          unit:     li.item.unit || "pcs",
          requestedQty: li.qty,
        })),
        notes: transferNotes,
      });
      toast.success("Transfer request created");
      setShowModal(false);
      fetchTransfers(1, filterStatus, search);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Approve ────────────────────────────────────────────────────────────────

  const handleApprove = async (transferId) => {
    setApproving(true);
    try {
      const res = await apiService.post(`/api/stock-transfers/${transferId}/approve`, {});
      toast.success(`Transfer approved! Waybill: ${res.waybillNumber}`);
      if (res.waybillUrl) {
        // open waybill in new tab — server sends full printable HTML
        window.open(res.waybillUrl.replace("/api", ""), "_blank");
      }
      fetchTransfers(page, filterStatus, search);
      setShowDetail(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async (transferId) => {
    if (!window.confirm("Cancel this transfer?")) return;
    try {
      await apiService.post(`/api/stock-transfers/${transferId}/cancel`, { reason: "Cancelled by user" });
      toast.success("Transfer cancelled");
      fetchTransfers(page, filterStatus, search);
      setShowDetail(false);
    } catch {
      toast.error("Failed to cancel transfer");
    }
  };

  const openWaybill = (transfer) => {
    // server returns /api/stock-transfers/:id/waybill — construct full URL
    const base = (import.meta?.env?.VITE_API_URL || "http://localhost:5000");
    window.open(`${base}/api/stock-transfers/${transfer._id}/waybill`, "_blank");
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Stock Transfers</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Move stock between warehouse locations and print waybills.
          </p>
        </div>
        <button
          onClick={openNewTransfer}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <i className="fa-solid fa-arrow-right-arrow-left"></i> New Transfer
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          <input
            type="text" placeholder="Search transfers…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none bg-white"
        >
          {["all","pending","approved","completed","cancelled"].map(s => (
            <option key={s} value={s}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{total} transfer{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <i className="fa-solid fa-spinner fa-spin text-blue-400 text-2xl mr-3"></i>
            <span className="text-gray-500">Loading transfers…</span>
          </div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <i className="fa-solid fa-arrow-right-arrow-left text-3xl mb-3 opacity-40"></i>
            <p className="text-sm">No transfers yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Transfer #","From → To","Items","Status","Waybill","Date","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map(t => (
                <tr key={t._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-blue-700 text-xs">{t.transferNumber}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-medium text-gray-700">{t.fromLocationName}</span>
                      <i className="fa-solid fa-arrow-right text-blue-400"></i>
                      <span className="font-medium text-gray-700">{t.toLocationName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{t.lineItems?.length} item{t.lineItems?.length !== 1 ? "s" : ""}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    {t.waybillNumber ? (
                      <button onClick={() => openWaybill(t)} className="text-blue-600 hover:underline font-mono text-xs">
                        {t.waybillNumber}
                      </button>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(t.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setActiveTransfer(t); setShowDetail(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Details">
                        <i className="fa-solid fa-eye text-xs"></i>
                      </button>
                      {t.status === "pending" && (
                        <button onClick={() => handleApprove(t._id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Approve">
                          <i className="fa-solid fa-check text-xs"></i>
                        </button>
                      )}
                      {t.waybillNumber && (
                        <button onClick={() => openWaybill(t)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Print Waybill">
                          <i className="fa-solid fa-print text-xs"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button disabled={page <= 1 || isLoading} onClick={() => fetchTransfers(page-1, filterStatus, search)}
                className="px-3 py-1.5 border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
              <button disabled={page >= totalPages || isLoading} onClick={() => fetchTransfers(page+1, filterStatus, search)}
                className="px-3 py-1.5 border rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── New Transfer Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
              <div>
                <h3 className="text-white font-bold text-lg">New Stock Transfer</h3>
                <p className="text-blue-200 text-xs mt-0.5">Step {step} of 2 — {step === 1 ? "Select locations" : "Pick items"}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 ? (
                /* Step 1 — Location picker */
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <i className="fa-solid fa-warehouse mr-1 text-blue-500"></i> From Location
                      </label>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {locations.length === 0 && (
                          <p className="text-xs text-gray-400 italic p-2">No locations set up yet. Add them in the Locations tab.</p>
                        )}
                        {locations.map(loc => (
                          <button key={loc._id} onClick={() => setFromLoc(loc)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                              fromLoc?._id === loc._id
                                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                                : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                            }`}>
                            <span className="font-mono text-[10px] text-gray-400 mr-1">[{loc.code}]</span>
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <i className="fa-solid fa-location-dot mr-1 text-green-500"></i> To Location
                      </label>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {locations.filter(l => l._id !== fromLoc?._id).map(loc => (
                          <button key={loc._id} onClick={() => setToLoc(loc)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                              toLoc?._id === loc._id
                                ? "border-green-500 bg-green-50 text-green-700 font-medium"
                                : "border-gray-200 hover:border-green-300 hover:bg-green-50"
                            }`}>
                            <span className="font-mono text-[10px] text-gray-400 mr-1">[{loc.code}]</span>
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {fromLoc && toLoc && (
                    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <i className="fa-solid fa-check-circle text-blue-600"></i>
                      <span>
                        Moving from <strong>{fromLoc.name}</strong>
                        <i className="fa-solid fa-arrow-right mx-2 text-blue-400"></i>
                        <strong>{toLoc.name}</strong>
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
                    <input type="text" value={transferNotes} onChange={e => setTransferNotes(e.target.value)}
                      placeholder="e.g. Monthly distribution" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"/>
                  </div>
                </div>
              ) : (
                /* Step 2 — Item picker */
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                    <strong>{fromLoc.name}</strong>
                    <i className="fa-solid fa-arrow-right text-blue-400"></i>
                    <strong>{toLoc.name}</strong>
                    <span className="ml-auto text-xs text-blue-600">{availableItems.length} items available</span>
                  </div>

                  {availableItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <i className="fa-solid fa-box-open text-3xl mb-2 opacity-40 block"></i>
                      No stock available at {fromLoc.name}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {availableItems.map(item => {
                        const selected = lineItems.find(li => li.item._id === item._id);
                        const available = getAvailableAtFrom(item);
                        return (
                          <div key={item._id}
                            className={`border rounded-lg p-3 flex items-center gap-3 transition-all cursor-pointer ${
                              selected ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                            }`}
                            onClick={() => toggleItemSelection(item)}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                              selected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                            }`}>
                              {selected && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                              <p className="text-[10px] text-gray-400">{item.itemId} · {available} {item.unit || "pcs"} available</p>
                            </div>
                            {selected && (
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <button onClick={() => setQty(item._id, (selected.qty || 1) - 1)}
                                  className="w-6 h-6 border border-gray-300 rounded hover:bg-gray-100 text-xs flex items-center justify-center">−</button>
                                <input type="number" min="1" max={available}
                                  value={selected.qty}
                                  onChange={e => setQty(item._id, e.target.value)}
                                  onClick={e => e.stopPropagation()}
                                  className="w-14 border border-gray-300 rounded text-center text-sm py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"/>
                                <button onClick={() => setQty(item._id, Math.min(available, (selected.qty || 1) + 1))}
                                  className="w-6 h-6 border border-gray-300 rounded hover:bg-gray-100 text-xs flex items-center justify-center">+</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {lineItems.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-xs text-green-700">
                      <i className="fa-solid fa-list-check mr-1"></i>
                      {lineItems.length} item{lineItems.length !== 1 ? "s" : ""} selected •{" "}
                      {lineItems.reduce((s, li) => s + li.qty, 0)} total units
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
              {step === 1 ? (
                <>
                  <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                  <button onClick={handleLocationsNext} disabled={!fromLoc || !toLoc}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    Next <i className="fa-solid fa-arrow-right"></i>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center gap-2">
                    <i className="fa-solid fa-arrow-left"></i> Back
                  </button>
                  <button onClick={handleSubmitTransfer} disabled={isSubmitting || lineItems.length === 0}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                    {isSubmitting ? "Submitting…" : "Submit Transfer"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Drawer ──────────────────────────────────────────────── */}
      {showDetail && activeTransfer && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setShowDetail(false)}>
          <div className="flex-1 bg-black/30 backdrop-blur-sm" />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col max-h-screen overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-gray-800 font-mono text-sm">{activeTransfer.transferNumber}</h3>
                <div className="mt-0.5"><StatusBadge status={activeTransfer.status} /></div>
              </div>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="p-6 space-y-5 flex-1">
              {/* Route */}
              <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-4">
                <div className="flex-1">
                  <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">From</p>
                  <p className="font-semibold text-gray-800">{activeTransfer.fromLocationName}</p>
                </div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-arrow-right text-white text-xs"></i>
                </div>
                <div className="flex-1 text-right">
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">To</p>
                  <p className="font-semibold text-gray-800">{activeTransfer.toLocationName}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Requested By", activeTransfer.requestedByName || "—"],
                  ["Approved By", activeTransfer.approvedByName || "—"],
                  ["Date", new Date(activeTransfer.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})],
                  ["Waybill", activeTransfer.waybillNumber || "Not generated"],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                    <p className="font-medium text-gray-700 mt-0.5 truncate">{val}</p>
                  </div>
                ))}
              </div>

              {/* Line items */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Items</p>
                <div className="space-y-2">
                  {activeTransfer.lineItems?.map((li, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{li.itemName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{li.itemCode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-700">{li.transferredQty || li.requestedQty}</p>
                        <p className="text-[10px] text-gray-400">{li.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeTransfer.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm">
                  <p className="font-bold text-yellow-700 text-xs uppercase mb-1">Notes</p>
                  <p className="text-gray-700">{activeTransfer.notes}</p>
                </div>
              )}
            </div>

            {/* Drawer footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0 flex gap-2 flex-wrap">
              {activeTransfer.waybillNumber && (
                <button onClick={() => openWaybill(activeTransfer)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                  <i className="fa-solid fa-print"></i> Print Waybill
                </button>
              )}
              {activeTransfer.status === "pending" && (
                <button onClick={() => handleApprove(activeTransfer._id)} disabled={approving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {approving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-circle"></i>}
                  Approve & Execute
                </button>
              )}
              {["pending","draft"].includes(activeTransfer.status) && (
                <button onClick={() => handleCancel(activeTransfer._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                  <i className="fa-solid fa-ban"></i> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransfer;
