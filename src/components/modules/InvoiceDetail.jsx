import React from "react";
import { formatCurrency } from "../../services/currency";

const StatusBadge = ({ status }) => {
  const map = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    partly_paid: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-700",
    payment_pending: "bg-orange-100 text-orange-800",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

const InvoiceDetail = ({ invoice, onBack }) => {
  // Determine if this is an AR Invoice or an AP PO
  const isAP = invoice._isAP;
  
  const documentNumber = isAP ? invoice.poNumber : invoice.invoiceNumber;
  const billTo = isAP ? invoice.vendor : invoice.billTo;
  const dateStr = isAP 
    ? (invoice.paidDate || invoice.createdAt) 
    : invoice.createdAt;
  
  return (
    <div className="w-full bg-white min-h-screen p-2 md:p-6 text-gray-800 flex flex-col">
      {/* Header controls (Hide in print) */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          <i className="fa-solid fa-arrow-left"></i>
          Back to Invoices
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-colors"
        >
          <i className="fa-solid fa-print"></i>
          Print Document
        </button>
      </div>

      {/* Printable Area */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-4xl mx-auto w-full print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              {isAP ? "Payment Voucher (AP)" : "Tax Invoice (AR)"}
            </h1>
            <p className="text-gray-500 mt-1 font-mono">{documentNumber}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
            <StatusBadge status={invoice.status} />
            <p className="text-sm text-gray-500">
              Date: <span className="font-medium text-gray-800">{new Date(dateStr).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
            </p>
          </div>
        </div>

        {/* Parties Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-lg print:bg-transparent print:p-0 print:gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">From (Our Company)</h3>
            <p className="font-semibold text-gray-800 text-lg">Steps CRM</p>
            <p className="text-sm text-gray-500 mt-1">Finance Department</p>
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {isAP ? "Paid To (Vendor)" : "Bill To (Customer)"}
            </h3>
            <p className="font-semibold text-gray-800 text-lg">{billTo}</p>
            {isAP && invoice.linkedMaterialRequestId?.department && (
              <p className="text-sm text-gray-500 mt-1">Dept: {invoice.linkedMaterialRequestId.department}</p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Request Details Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 rounded-tl-lg">Description</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Qty</th>
                  {!isAP && <th className="px-4 py-3 text-right font-semibold text-gray-600">Unit Price</th>}
                  <th className="px-4 py-3 text-right font-semibold text-gray-600 rounded-tr-lg">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.lineItems?.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {isAP ? item.itemName : item.description}
                      {isAP && item.description && <p className="text-xs text-gray-500 font-normal mt-0.5">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{item.qty || item.quantity} {item.quantityType || ""}</td>
                    {!isAP && <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>}
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                      {formatCurrency(isAP ? item.amount * (item.quantity||1) : item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Payment Details Layout */}
        <div className="flex flex-col md:flex-row justify-between gap-8">
          {/* Payment History (AP Only) */}
          <div className="flex-1">
            {isAP && invoice.paymentHistory?.length > 0 && (
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 print:border-none">
                <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left"></i> Payment History
                </h4>
                <div className="space-y-2">
                  {invoice.paymentHistory.map((ph, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-blue-700">
                        {new Date(ph.paidAt).toLocaleDateString('en-GB')}
                        <span className="text-blue-400 text-xs ml-2">({ph.percentage}%)</span>
                      </span>
                      <span className="font-semibold text-blue-900">{formatCurrency(ph.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="w-full md:w-72 bg-gray-50 p-5 rounded-xl border border-gray-100 print:bg-transparent print:border-none">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(isAP ? invoice.totalAmount : invoice.subtotal)}</span>
              </div>
              {!isAP && invoice.taxRate > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({invoice.taxRate}%)</span>
                  <span className="font-medium">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}
              
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-gray-800">Total Amount</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(isAP ? invoice.totalAmount : invoice.totalAmount)}
                  </span>
                </div>
              </div>

              {isAP && (
                <>
                  <div className="flex justify-between text-green-700 mt-2">
                    <span>Total Paid</span>
                    <span className="font-semibold">{formatCurrency(invoice.paidAmount || 0)}</span>
                  </div>
                  {(invoice.totalAmount - (invoice.paidAmount || 0)) > 0 && (
                    <div className="flex justify-between text-red-600 flex-wrap">
                      <span>Balance Due</span>
                      <span className="font-bold">{formatCurrency(invoice.totalAmount - (invoice.paidAmount || 0))}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvoiceDetail;
