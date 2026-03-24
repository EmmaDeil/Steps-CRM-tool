import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import { useCurrency } from "../../context/useCurrency";
import { apiService } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/useAppContext";

const AccountsPayableDetail = ({ invoice, onBack, onPaymentSuccess }) => {
  const navigate = useNavigate();
  const { modules } = useAppContext();
  const { currency } = useCurrency();
  const [payPercentage, setPayPercentage] = useState(100);
  const [isPaying, setIsPaying] = useState(false);
  const [billTo, setBillTo] = useState(invoice?.billTo || "");
  const [taxRate, setTaxRate] = useState(
    Number.isFinite(Number(invoice?.taxRate)) ? Number(invoice.taxRate) : 0,
  );
  const [poDetails, setPoDetails] = useState(null);

  const invoiceId = invoice?._id || invoice?.id;

  const billToOptions = useMemo(() => {
    const candidates = [
      invoice?.billTo,
      invoice?.department,
      invoice?.vendor,
      "Head Office",
      "Finance Department",
      "Operations Department",
    ];

    return [...new Set(candidates.map((item) => String(item || "").trim()))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [invoice?.billTo, invoice?.department, invoice?.vendor]);

  const totalAmount = Number(invoice?.amount || 0);
  const preTaxAmount = Number(invoice?.preTaxAmount || totalAmount);
  const currentTaxRate = Number.isFinite(Number(invoice?.taxRate))
    ? Number(invoice.taxRate)
    : Number(taxRate || 0);
  const currentTaxAmount = Number.isFinite(Number(invoice?.taxAmount))
    ? Number(invoice.taxAmount)
    : Number(((preTaxAmount * currentTaxRate) / 100).toFixed(2));
  const currentPaid = Number(invoice?.paidAmount || 0);
  const currentBalance =
    invoice?.balanceDue !== undefined
      ? Number(invoice.balanceDue || 0)
      : Math.max(0, totalAmount - currentPaid);
  const paymentHistory = useMemo(() => {
    if (
      Array.isArray(invoice?.paymentHistory) &&
      invoice.paymentHistory.length
    ) {
      return invoice.paymentHistory;
    }
    if (
      Array.isArray(poDetails?.paymentHistory) &&
      poDetails.paymentHistory.length
    ) {
      return poDetails.paymentHistory;
    }
    return [];
  }, [invoice?.paymentHistory, poDetails?.paymentHistory]);

  const fullPaymentCompletedDate = useMemo(() => {
    const fromInvoice = invoice?.fullyPaidAt
      ? new Date(invoice.fullyPaidAt)
      : null;
    const fromPo = poDetails?.fullyPaidAt
      ? new Date(poDetails.fullyPaidAt)
      : null;

    const fullEntries = paymentHistory
      .filter((entry) => Number(entry?.balanceAfter || 0) <= 0 && entry?.paidAt)
      .map((entry) => new Date(entry.paidAt))
      .filter((date) => !Number.isNaN(date.getTime()));

    const fromHistory =
      fullEntries.sort((a, b) => b.getTime() - a.getTime())[0] || null;
    return fromInvoice || fromPo || fromHistory;
  }, [invoice?.fullyPaidAt, poDetails?.fullyPaidAt, paymentHistory]);

  const firstPartialPaymentDate = useMemo(() => {
    const partialEntries = paymentHistory
      .filter((entry) => {
        const percentage = Number(entry?.percentage || 0);
        const balanceAfter = Number(entry?.balanceAfter);
        const isPartialByPercent = percentage > 0 && percentage < 100;
        const isPartialByBalance =
          Number.isFinite(balanceAfter) && balanceAfter > 0;
        return entry?.paidAt && (isPartialByPercent || isPartialByBalance);
      })
      .map((entry) => new Date(entry.paidAt))
      .filter((date) => !Number.isNaN(date.getTime()));

    let firstPartial =
      partialEntries.sort((a, b) => a.getTime() - b.getTime())[0] || null;

    if (!firstPartial) {
      const status = String(invoice?.status || "").toLowerCase();
      if (status === "partly paid" || status === "partly_paid") {
        const fallback =
          invoice?.firstPartiallyPaidAt || poDetails?.firstPartiallyPaidAt;
        firstPartial = fallback ? new Date(fallback) : null;
      }
    }

    if (
      firstPartial &&
      fullPaymentCompletedDate &&
      firstPartial.getTime() === fullPaymentCompletedDate.getTime() &&
      partialEntries.length === 0
    ) {
      return null;
    }

    return firstPartial;
  }, [
    paymentHistory,
    invoice?.status,
    invoice?.firstPartiallyPaidAt,
    poDetails?.firstPartiallyPaidAt,
    fullPaymentCompletedDate,
  ]);

  const poLineItems = useMemo(
    () => (Array.isArray(poDetails?.lineItems) ? poDetails.lineItems : []),
    [poDetails?.lineItems],
  );

  const mrLineItems = useMemo(
    () =>
      Array.isArray(poDetails?.linkedMaterialRequestId?.lineItems)
        ? poDetails.linkedMaterialRequestId.lineItems
        : [],
    [poDetails?.linkedMaterialRequestId?.lineItems],
  );

  const sourceRows = useMemo(() => {
    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();
    const requestId =
      poDetails?.linkedMaterialRequestId?.requestId ||
      poDetails?.linkedMaterialRequestId?._id ||
      "N/A";
    const requestObjectId =
      poDetails?.linkedMaterialRequestId?._id ||
      poDetails?.linkedMaterialRequestId?.id ||
      "";
    const poNumber =
      poDetails?.poNumber ||
      invoice?.poNumber ||
      invoice?.invoiceNumber ||
      "N/A";
    const poId =
      poDetails?._id || poDetails?.id || invoice?._id || invoice?.id || "";

    if (!poLineItems.length && !mrLineItems.length) return [];

    const rows = poLineItems.map((poItem, index) => {
      const poName = poItem?.itemName || "-";
      const poQty = Number(poItem?.quantity || 0);
      const poUnit = poItem?.quantityType || "-";
      const poAmount = Number(poItem?.amount || 0);

      const matchedMr = mrLineItems.find((mrItem) => {
        const sameName =
          normalize(mrItem?.itemName) === normalize(poItem?.itemName);
        const sameDesc =
          normalize(mrItem?.description) === normalize(poItem?.description);
        return sameName || (sameDesc && normalize(mrItem?.description));
      });

      return {
        key: `${poName}-${index}`,
        itemName: poName,
        poQuantity: `${poQty || "-"} ${poUnit}`.trim(),
        poUnitAmount: poAmount,
        poTotal: poQty * poAmount,
        materialRequestSource: requestId,
        materialRequestSourceId: requestObjectId,
        purchaseOrderSource: poNumber,
        purchaseOrderSourceId: poId,
        requestedQuantity: matchedMr
          ? `${Number(matchedMr?.quantity || 0)} ${matchedMr?.quantityType || ""}`.trim()
          : "-",
      };
    });

    if (!rows.length) {
      return mrLineItems.map((mrItem, index) => ({
        key: `mr-${index}`,
        itemName: mrItem?.itemName || "-",
        poQuantity: "-",
        poUnitAmount: 0,
        poTotal: 0,
        materialRequestSource: requestId,
        materialRequestSourceId: requestObjectId,
        purchaseOrderSource: poNumber,
        purchaseOrderSourceId: poId,
        requestedQuantity:
          `${Number(mrItem?.quantity || 0)} ${mrItem?.quantityType || ""}`.trim(),
      }));
    }

    return rows;
  }, [
    invoice?.invoiceNumber,
    invoice?.poNumber,
    mrLineItems,
    poDetails?.linkedMaterialRequestId?._id,
    poDetails?.linkedMaterialRequestId?.requestId,
    poDetails?.poNumber,
    poLineItems,
  ]);

  const openModuleByName = (targetName) => {
    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    const aliasMap = {
      materialrequests: ["materialrequests", "materialrequest"],
      purchaseorders: ["purchaseorders", "purchaseorder"],
    };

    const normalizedTarget = normalize(targetName);
    const candidates = aliasMap[normalizedTarget] || [normalizedTarget];

    const target = (modules || []).find((moduleItem) => {
      const byName = normalize(moduleItem?.name);
      const byComponent = normalize(moduleItem?.componentName);
      return candidates.includes(byName) || candidates.includes(byComponent);
    });

    const moduleId = target?.id || target?._id;
    if (!moduleId) {
      toast.error(`${targetName} module not found`);
      return null;
    }
    return moduleId;
  };

  const openMaterialRequestSource = (requestId) => {
    if (!requestId) return;
    const moduleId = openModuleByName("Material Requests");
    if (!moduleId) return;
    sessionStorage.setItem("materialRequestsOpenRequestId", String(requestId));
    navigate(`/home/${moduleId}`);
  };

  const openPurchaseOrderSource = (poId, poNumber) => {
    const moduleId = openModuleByName("Purchase Orders");
    if (!moduleId) return;
    if (poId) {
      sessionStorage.setItem("purchaseOrdersOpenPoId", String(poId));
    }
    if (poNumber) {
      sessionStorage.setItem("purchaseOrdersOpenPoNumber", String(poNumber));
      sessionStorage.setItem("purchaseOrdersSearch", String(poNumber));
    }
    navigate(`/home/${moduleId}`);
  };
  const maxPayablePercentage =
    totalAmount > 0
      ? Number(((Math.max(0, currentBalance) / totalAmount) * 100).toFixed(2))
      : 0;

  useEffect(() => {
    // For partly-paid invoices, default to paying the remaining percentage.
    const defaultPercentage =
      invoice?.status === "Partly Paid"
        ? Math.max(0, maxPayablePercentage)
        : 100;
    setPayPercentage(defaultPercentage > 0 ? defaultPercentage : 0);
  }, [invoice?._id, invoice?.status, maxPayablePercentage]);

  useEffect(() => {
    setBillTo(invoice?.billTo || "");
    setTaxRate(
      Number.isFinite(Number(invoice?.taxRate)) ? Number(invoice.taxRate) : 0,
    );
  }, [invoice?._id, invoice?.billTo, invoice?.taxRate]);

  useEffect(() => {
    const fetchPoDetails = async () => {
      if (!invoiceId) {
        setPoDetails(null);
        return;
      }

      try {
        const response = await apiService.get(
          `/api/purchase-orders/${invoiceId}`,
        );
        const po = response?.data || response;
        if (po?._id || po?.id) {
          setPoDetails(po);
        } else {
          setPoDetails(null);
        }
      } catch {
        setPoDetails(null);
      }
    };

    fetchPoDetails();
  }, [invoiceId]);

  const handlePay = async () => {
    if (!invoice) return;

    const resolvedBillTo = String(billTo || "").trim();
    if (!resolvedBillTo) {
      toast.error("Please set Bill To before making payment");
      return;
    }

    if (
      !Number.isFinite(Number(taxRate)) ||
      Number(taxRate) < 0 ||
      Number(taxRate) > 100
    ) {
      toast.error("Please set a valid Tax rate before making payment");
      return;
    }

    try {
      setIsPaying(true);
      const response = await apiService.post(
        `/api/finance/accounts-payable/${invoice._id}/pay`,
        {
          payPercentage,
          billTo: resolvedBillTo,
          taxRate: Number(taxRate),
        },
      );

      if (response.success) {
        toast.success(response.message || "Payment processed successfully");
        setPayPercentage(100);

        // Notify parent to refresh list, which in turn will update this invoice instance
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
      }
    } catch (error) {
      console.error("Error paying invoice:", error);
      toast.error(error.response?.data?.error || "Failed to pay invoice");
    } finally {
      setIsPaying(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      "Partly Paid": "bg-orange-100 text-orange-800 border-orange-200",
      Draft: "bg-slate-100 text-slate-800 border-slate-200",
      Paid: "bg-blue-100 text-blue-800 border-blue-200",
    };
    return badges[status] || badges.Draft;
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins", onClick: onBack },
          { label: "Accounts Payable", icon: "fa-receipt", onClick: onBack },
          { label: "Invoice Details", icon: "fa-file-invoice" },
        ]}
      />

      {/* Header section similar to accounts payable */}
      <section className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1800px] mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-slate-100"
            >
              <i className="fa-solid fa-arrow-left text-lg"></i>
            </button> */}
            <h1 className="text-xl font-bold text-slate-900">
              Invoice Details
            </h1>
          </div>
        </div>
      </section>

      <main className="flex-1 overflow-auto p-2">
        <div className="w-full space-y-6">
          {/* Invoice Header */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">
                  Invoice Number
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {invoice.invoiceNumber}
                </p>
              </div>
              <div className="md:text-right flex flex-col md:items-end">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">
                  Status
                </p>
                <span
                  className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusBadge(
                    invoice.status,
                  )}`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vendor Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-building text-primary"></i>
                Vendor Information
              </h3>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                  {invoice.vendor?.charAt(0) || "V"}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {invoice.vendor || "Unknown Vendor"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {invoice.category || "General Category"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-file-signature text-primary"></i>
                Bill To
              </h3>
              <div className="flex flex-col gap-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Billing Entity
                </label>
                <select
                  value={billTo}
                  onChange={(e) => setBillTo(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                >
                  <option value="">Select Bill To</option>
                  {billToOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value || 0))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Department */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-sitemap text-primary"></i>
                Department
              </h3>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <i className="fa-solid fa-building-user"></i>
                </div>
                <p className="text-base font-medium text-slate-900">
                  {invoice.department || "General"}
                </p>
              </div>
            </div>

            {/* Date Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <i className="fa-solid fa-calendar text-primary"></i>
                Dates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2 flex items-center gap-2">
                    <i className="fa-regular fa-calendar-plus"></i>
                    Issue Date
                  </p>
                  <p className="text-lg font-medium text-slate-900">
                    {invoice.issueDate
                      ? new Date(invoice.issueDate).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2 flex items-center gap-2">
                    <i className="fa-regular fa-calendar-xmark"></i>
                    Due Date
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      invoice.status === "Pending"
                        ? "text-yellow-700"
                        : "text-slate-900"
                    }`}
                  >
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2 flex items-center gap-2">
                    <i className="fa-regular fa-clock"></i>
                    First Partial Payment
                  </p>
                  <p className="text-base font-medium text-slate-900">
                    {firstPartialPaymentDate
                      ? firstPartialPaymentDate.toLocaleString()
                      : "Not yet"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-check-double"></i>
                    Full Payment Completed
                  </p>
                  <p className="text-base font-medium text-slate-900">
                    {fullPaymentCompletedDate
                      ? fullPaymentCompletedDate.toLocaleString()
                      : "Not yet"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-diagram-project text-primary"></i>
              Requested Line Items and Sources (MR {"->"} PO)
            </h3>

            {sourceRows.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Requested (MR)
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Ordered (PO)
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Line Total
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Material Request Source
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Purchase Order Source
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceRows.map((row) => (
                      <tr key={row.key} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {row.itemName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.requestedQuantity}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.poQuantity}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {row.poUnitAmount
                            ? formatCurrency(row.poUnitAmount, { currency })
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-900 font-semibold">
                          {row.poTotal
                            ? formatCurrency(row.poTotal, { currency })
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.materialRequestSourceId ? (
                            <button
                              type="button"
                              onClick={() =>
                                openMaterialRequestSource(
                                  row.materialRequestSourceId,
                                )
                              }
                              className="text-primary hover:underline font-semibold"
                            >
                              {row.materialRequestSource}
                            </button>
                          ) : (
                            row.materialRequestSource
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <button
                            type="button"
                            onClick={() =>
                              openPurchaseOrderSource(
                                row.purchaseOrderSourceId,
                                row.purchaseOrderSource,
                              )
                            }
                            className="text-primary hover:underline font-semibold"
                          >
                            {row.purchaseOrderSource}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                No source line items found for this invoice.
              </div>
            )}
          </div>

          {/* Amount Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-receipt text-primary"></i>
              Amount Details
            </h3>
            <div className="border border-slate-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                <div className="p-5 border-b md:border-b-0 md:border-r border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(invoice.amount || 0, { currency })}
                  </p>
                </div>
                <div className="p-5 border-b md:border-b-0 md:border-r border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Paid Amount
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(invoice.paidAmount || 0, { currency })}
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Balance Due
                  </p>
                  <p className="text-2xl font-bold text-amber-700">
                    {formatCurrency(invoice.balanceDue || 0, { currency })}
                  </p>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-sm text-slate-700">
                Base Amount: {formatCurrency(preTaxAmount, { currency })} | Tax
                ({currentTaxRate}%):{" "}
                {formatCurrency(currentTaxAmount, { currency })}
              </div>
            </div>

            {/* Payment Controls */}
            {(invoice.status === "Pending" ||
              invoice.status === "Partly Paid") && (
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <i className="fa-solid fa-credit-card text-primary"></i>
                  Make Payment
                </h3>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Payment Percentage
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="number"
                          min="0.01"
                          max={Math.max(0.01, maxPayablePercentage || 100)}
                          step="0.01"
                          value={payPercentage}
                          onChange={(e) =>
                            setPayPercentage(Number(e.target.value || 0))
                          }
                          className="w-32 pl-4 pr-8 py-2.5 border border-slate-300 rounded-md text-base font-semibold text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          %
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-500">
                        of total amount
                      </span>
                    </div>
                    {invoice.status === "Partly Paid" && (
                      <p className="mt-2 text-xs font-semibold text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
                        The remaining balance is{" "}
                        {((invoice.balanceDue / invoice.amount) * 100).toFixed(
                          2,
                        )}
                        % of the total amount.
                      </p>
                    )}
                    {maxPayablePercentage > 0 &&
                      payPercentage > maxPayablePercentage && (
                        <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 inline-block px-2 py-1 rounded border border-red-100">
                          Maximum payable right now is {maxPayablePercentage}%.
                        </p>
                      )}
                  </div>

                  <button
                    onClick={handlePay}
                    disabled={
                      isPaying ||
                      !Number.isFinite(payPercentage) ||
                      payPercentage <= 0 ||
                      payPercentage >
                        Math.max(0.01, maxPayablePercentage || 100)
                    }
                    className="w-full md:w-auto px-6 py-3 rounded-md bg-primary hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <i
                      className={`fa-solid ${isPaying ? "fa-spinner fa-spin" : "fa-credit-card"}`}
                    ></i>
                    {isPaying ? "Processing..." : `Pay ${payPercentage}%`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AccountsPayableDetail;
