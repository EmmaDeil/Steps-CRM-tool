import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import { useCurrency } from "../../context/useCurrency";
import { apiService } from "../../services/api";

const AccountsPayableDetail = ({ invoice, onBack, onPaymentSuccess }) => {
  const { currency } = useCurrency();
  const [payPercentage, setPayPercentage] = useState(100);
  const [isPaying, setIsPaying] = useState(false);

  const totalAmount = Number(invoice?.amount || 0);
  const currentPaid = Number(invoice?.paidAmount || 0);
  const currentBalance =
    invoice?.balanceDue !== undefined
      ? Number(invoice.balanceDue || 0)
      : Math.max(0, totalAmount - currentPaid);
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

  const handlePay = async () => {
    if (!invoice) return;

    try {
      setIsPaying(true);
      const response = await apiService.post(
        `/api/finance/accounts-payable/${invoice._id}/pay`,
        { payPercentage },
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
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins", onClick: onBack },
          { label: "Accounts Payable", icon: "fa-receipt", onClick: onBack },
          { label: "Invoice Details", icon: "fa-file-invoice" },
        ]}
      />

      {/* Header section similar to accounts payable */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
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

      <main className="flex-1 overflow-auto bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Invoice Header */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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

            {/* Department */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
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
              </div>
            </div>
          </div>

          {/* Amount Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-receipt text-primary"></i>
              Amount Details
            </h3>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    Total Amount Due
                  </p>
                  <p className="text-4xl font-black text-blue-900 tracking-tight">
                    {formatCurrency(invoice.amount || 0, { currency })}
                  </p>
                </div>
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 mb-1 uppercase tracking-wider">
                      Paid So Far
                    </p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(invoice.paidAmount || 0, { currency })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-800 mb-1 uppercase tracking-wider">
                      Balance Due
                    </p>
                    <p className="text-xl font-bold text-amber-700">
                      {formatCurrency(invoice.balanceDue || 0, { currency })}
                    </p>
                  </div>
                </div>
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
                          className="w-32 pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg text-base font-semibold text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                    className="w-full md:w-auto px-8 py-3.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-base font-bold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    <i
                      className={`fa-solid ${isPaying ? "fa-spinner fa-spin" : "fa-shield-halved"} text-lg`}
                    ></i>
                    {isPaying
                      ? "Processing..."
                      : `Pay ${payPercentage}% Securely`}
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
