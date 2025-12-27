import { useState } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import apiService from "../../services/api";

const JournalEntry = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [entryData, setEntryData] = useState({
    date: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    currency: "USD",
    memo: "",
  });
  const [lineItems, setLineItems] = useState([
    {
      id: 1,
      account: "",
      description: "",
      debit: 0.0,
      credit: 0.0,
    },
  ]);

  const accounts = [
    { value: "", label: "Select Account" },
    { value: "1000", label: "1000 - Cash on Hand" },
    { value: "1200", label: "1200 - Accounts Receivable" },
    { value: "2000", label: "2000 - Credit Card" },
    { value: "2100", label: "2100 - Accounts Payable" },
    { value: "6001", label: "6001 - Office Supplies" },
    { value: "6005", label: "6005 - Marketing Expenses" },
  ];

  const calculateTotals = () => {
    const totalDebit = lineItems.reduce(
      (sum, item) => sum + (parseFloat(item.debit) || 0),
      0
    );
    const totalCredit = lineItems.reduce(
      (sum, item) => sum + (parseFloat(item.credit) || 0),
      0
    );
    const difference = totalDebit - totalCredit;
    return { totalDebit, totalCredit, difference };
  };

  const handleLineItemChange = (id, field, value) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddLineItem = () => {
    const newId = Math.max(...lineItems.map((item) => item.id)) + 1;
    setLineItems([
      ...lineItems,
      {
        id: newId,
        account: "",
        description: "",
        debit: 0.0,
        credit: 0.0,
      },
    ]);
  };

  const handleDeleteLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      toast.error("At least one line item is required");
    }
  };

  const handleSaveEntry = async () => {
    const { totalDebit, totalCredit, difference } = calculateTotals();

    if (Math.abs(difference) > 0.01) {
      toast.error(
        "Entry is not balanced. Total debits must equal total credits."
      );
      return;
    }

    if (!entryData.referenceNumber.trim()) {
      toast.error("Please enter a reference number");
      return;
    }

    const validLineItems = lineItems.filter(
      (item) => item.account && (item.debit > 0 || item.credit > 0)
    );

    if (validLineItems.length < 2) {
      toast.error("At least two line items are required");
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.post("/api/finance/journal-entries", {
        ...entryData,
        lineItems: validLineItems,
        totalDebit,
        totalCredit,
      });

      if (response.success) {
        toast.success("Journal entry saved successfully");
        onBack();
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast.error("Failed to save journal entry");
    } finally {
      setLoading(false);
    }
  };

  const { totalDebit, totalCredit, difference } = calculateTotals();
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins" },
          { label: "Journal History", icon: "fa-book", onClick: onBack },
          { label: "New Entry", icon: "fa-file-lines" },
        ]}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">
                  New Journal Entry
                </h1>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 border border-slate-200">
                  Draft
                </span>
              </div>
              <p className="text-slate-500">
                Create a new manual journal entry record for adjustments or
                transfers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                disabled={loading}
                className="px-4 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEntry}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20 disabled:opacity-50"
              >
                <i className="fa-solid fa-save text-sm"></i>
                {loading ? "Saving..." : "Save Entry"}
              </button>
            </div>
          </div>

          {/* Master Details Form Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
            <h3 className="text-lg font-bold mb-4 text-slate-900 flex items-center gap-2">
              <i className="fa-solid fa-file-lines text-primary"></i>
              Entry Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Date Input */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date
                </label>
                <input
                  className="form-input block w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary h-11 sm:text-sm"
                  type="date"
                  value={entryData.date}
                  onChange={(e) =>
                    setEntryData({ ...entryData, date: e.target.value })
                  }
                />
              </div>
              {/* Reference Number */}
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reference Number
                </label>
                <input
                  className="form-input block w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary h-11 sm:text-sm placeholder:text-slate-400"
                  placeholder="e.g. JE-2023-101"
                  type="text"
                  value={entryData.referenceNumber}
                  onChange={(e) =>
                    setEntryData({
                      ...entryData,
                      referenceNumber: e.target.value,
                    })
                  }
                />
              </div>
              {/* Currency */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  className="form-select block w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary h-11 sm:text-sm"
                  value={entryData.currency}
                  onChange={(e) =>
                    setEntryData({ ...entryData, currency: e.target.value })
                  }
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>
              {/* Memo / Description */}
              <div className="md:col-span-12">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Memo / Description
                </label>
                <textarea
                  className="form-textarea block w-full rounded-lg border-slate-300 bg-white text-slate-900 focus:border-primary focus:ring-primary sm:text-sm placeholder:text-slate-400 resize-none"
                  placeholder="Describe the reason for this journal entry..."
                  rows="2"
                  value={entryData.memo}
                  onChange={(e) =>
                    setEntryData({ ...entryData, memo: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Line Items Table Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden mb-6">
            {/* Table Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-table text-primary"></i>
                Line Items
              </h3>
              <div className="text-sm text-slate-500">
                <span className="font-medium text-slate-900">
                  {lineItems.filter((item) => item.account).length}
                </span>{" "}
                lines
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                    <th className="px-6 py-4 w-12 text-center">#</th>
                    <th className="px-6 py-4 min-w-[240px]">Account</th>
                    <th className="px-6 py-4 min-w-[240px]">
                      Line Description
                    </th>
                    <th className="px-6 py-4 w-40 text-right">Debit</th>
                    <th className="px-6 py-4 w-40 text-right">Credit</th>
                    <th className="px-6 py-4 w-16 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {lineItems.map((item, index) => (
                    <tr
                      key={item.id}
                      className="group hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 text-center text-slate-400">
                        {index + 1}
                      </td>
                      <td className="px-6 py-3">
                        <select
                          className="block w-full border-0 bg-transparent py-2 pl-0 pr-8 text-slate-900 focus:ring-0 sm:text-sm font-medium"
                          value={item.account}
                          onChange={(e) =>
                            handleLineItemChange(
                              item.id,
                              "account",
                              e.target.value
                            )
                          }
                        >
                          {accounts.map((acc) => (
                            <option key={acc.value} value={acc.value}>
                              {acc.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          className="block w-full border-0 border-b border-transparent bg-transparent p-0 pb-1 text-slate-600 placeholder:text-slate-400 focus:border-primary focus:ring-0 sm:text-sm transition-all"
                          placeholder="Description"
                          type="text"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          className={`block w-full rounded ${
                            item.debit > 0
                              ? "bg-slate-50"
                              : "bg-transparent border border-transparent hover:border-slate-200"
                          } py-2 px-3 text-right text-slate-900 focus:ring-1 focus:ring-primary sm:text-sm`}
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          value={item.debit || ""}
                          onChange={(e) =>
                            handleLineItemChange(
                              item.id,
                              "debit",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          className={`block w-full rounded ${
                            item.credit > 0
                              ? "bg-slate-50"
                              : "bg-transparent border border-transparent hover:border-slate-200"
                          } py-2 px-3 text-right text-slate-900 focus:ring-1 focus:ring-primary sm:text-sm`}
                          placeholder="0.00"
                          type="number"
                          step="0.01"
                          value={item.credit || ""}
                          onChange={(e) =>
                            handleLineItemChange(
                              item.id,
                              "credit",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={() => handleDeleteLineItem(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50"
                        >
                          <i className="fa-solid fa-trash text-lg"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={handleAddLineItem}
                className="flex items-center gap-2 text-primary font-bold text-sm hover:text-blue-700 transition-colors"
              >
                <i className="fa-solid fa-circle-plus text-lg"></i>
                Add Line Item
              </button>
            </div>
          </div>

          {/* Totals & Summary Section */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            {/* Left Side: Notes or File Upload */}
            <div className="w-full md:w-1/2">
              <div className="rounded-lg border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center bg-slate-50">
                <i className="fa-solid fa-cloud-arrow-up text-slate-400 text-3xl mb-2"></i>
                <p className="text-sm font-medium text-slate-700">
                  Attach supporting documents
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  PDF, PNG, JPG up to 10MB
                </p>
              </div>
            </div>

            {/* Right Side: Calculations */}
            <div className="w-full md:w-1/3 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Total Debits</span>
                  <span className="font-bold text-slate-900 font-mono text-base">
                    {totalDebit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">Total Credits</span>
                  <span className="font-bold text-slate-900 font-mono text-base">
                    {totalCredit.toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-900">
                    Difference
                  </span>
                  <div
                    className={`flex items-center gap-2 ${
                      isBalanced ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        isBalanced ? "fa-circle-check" : "fa-circle-xmark"
                      } text-lg`}
                    ></i>
                    <span className="font-bold font-mono text-lg">
                      {Math.abs(difference).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JournalEntry;
