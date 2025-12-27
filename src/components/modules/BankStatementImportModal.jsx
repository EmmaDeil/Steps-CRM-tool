import { useState } from "react";
import toast from "react-hot-toast";
import apiService from "../../services/api";

const BankStatementImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Map, 3: Verify
  const [selectedFile, setSelectedFile] = useState(null);
  const [mapping, setMapping] = useState({
    date: "Date",
    description: "Memo",
    amount: "Transaction Amount",
    checkNumber: "",
  });
  const [ignoreFirstRow, setIgnoreFirstRow] = useState(true);
  const [autoMatch, setAutoMatch] = useState(true);
  const [previewData] = useState([]);
  const [fileStats] = useState({
    transactionCount: 0,
    netAmount: 0,
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!selectedFile) {
        toast.error("Please select a file to upload");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate mapping
      if (!mapping.date || !mapping.description || !mapping.amount) {
        toast.error("Please map all required fields");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Complete import
      await handleImport();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleImport = async () => {
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("mapping", JSON.stringify(mapping));
      formData.append("ignoreFirstRow", ignoreFirstRow);

      const response = await apiService.post(
        "/api/finance/reconciliation/import",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.success) {
        toast.success("Bank statement imported successfully!");
        onImportComplete();
        onClose();
      }
    } catch (error) {
      console.error("Error importing statement:", error);
      toast.error("Failed to import bank statement");
    }
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 text-primary mb-4">
              <i className="fa-solid fa-file-import text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Select Bank Statement File
            </h3>
            <p className="text-sm text-slate-500">
              Upload a CSV file from your bank
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <i className="fa-solid fa-cloud-arrow-up text-4xl text-slate-400 mb-4 block"></i>
              <p className="text-sm font-medium text-slate-700 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-slate-500">
                CSV, XLS, or XLSX (MAX. 10MB)
              </p>
            </label>
          </div>

          {selectedFile && (
            <div className="mt-6 bg-slate-50 rounded-lg p-4 border border-slate-200 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                  <i className="fa-solid fa-file-csv"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    File Selected
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-sm font-medium text-primary hover:text-blue-600 transition-colors"
              >
                Change
              </button>
            </div>
          )}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex flex-col lg:flex-row flex-1">
          {/* Left Panel: Mapping */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col gap-8 border-b lg:border-b-0 lg:border-r border-slate-200">
            {/* File Info */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                  <i className="fa-solid fa-file-csv"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    File Selected
                  </p>
                  <p className="text-base font-semibold text-slate-900">
                    {selectedFile?.name || "No file selected"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(2)} KB`
                      : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm font-medium text-primary hover:text-blue-600 transition-colors"
              >
                Change
              </button>
            </div>

            {/* Mapping Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">
                  Map Data Fields
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoMatch}
                    onChange={(e) => setAutoMatch(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-slate-500">
                    Auto-match
                  </span>
                </label>
              </div>

              <div className="space-y-5">
                {/* Date Mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      System Field
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                      <i className="fa-solid fa-calendar-days"></i>
                      Transaction Date
                    </div>
                  </div>
                  <div className="hidden sm:flex text-slate-500 pt-6">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 mb-1">
                      CSV Header
                    </label>
                    <select
                      value={mapping.date}
                      onChange={(e) =>
                        setMapping({ ...mapping, date: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    >
                      <option>Date</option>
                      <option>Posted Date</option>
                      <option>Effective Date</option>
                    </select>
                  </div>
                </div>

                {/* Description Mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                      <i className="fa-solid fa-file-lines"></i>
                      Description
                    </div>
                  </div>
                  <div className="hidden sm:flex text-slate-500">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                  <div>
                    <select
                      value={mapping.description}
                      onChange={(e) =>
                        setMapping({ ...mapping, description: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    >
                      <option>Memo</option>
                      <option>Payee</option>
                      <option>Notes</option>
                    </select>
                  </div>
                </div>

                {/* Amount Mapping */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 rounded-lg text-slate-600 text-sm font-medium">
                      <i className="fa-solid fa-dollar-sign"></i>
                      Amount
                    </div>
                  </div>
                  <div className="hidden sm:flex text-slate-500">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                  <div>
                    <select
                      value={mapping.amount}
                      onChange={(e) =>
                        setMapping({ ...mapping, amount: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    >
                      <option>Transaction Amount</option>
                      <option>Debit</option>
                      <option>Credit</option>
                    </select>
                  </div>
                </div>

                {/* Check Number (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4 opacity-75">
                  <div>
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-dashed border-slate-300 rounded-lg text-slate-500 text-sm font-normal">
                      <i className="fa-solid fa-hashtag"></i>
                      Check Number (Optional)
                    </div>
                  </div>
                  <div className="hidden sm:flex text-slate-500">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                  <div>
                    <select
                      value={mapping.checkNumber}
                      onChange={(e) =>
                        setMapping({ ...mapping, checkNumber: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-500 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm italic"
                    >
                      <option value="">Select column...</option>
                      <option>Check #</option>
                      <option>Ref ID</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="pt-4 border-t border-slate-200">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={ignoreFirstRow}
                  onChange={(e) => setIgnoreFirstRow(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-900">
                    Ignore first row
                  </span>
                  <span className="text-xs text-slate-500">
                    Select this if your file contains headers in the first row.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Right Panel: Preview */}
          <div className="w-full lg:w-[400px] xl:w-[450px] bg-slate-50 p-6 lg:p-8 flex flex-col border-t lg:border-t-0 border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <i className="fa-solid fa-eye text-slate-500"></i>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Live Preview
              </h3>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 max-h-[500px]">
              {/* Preview Header */}
              <div className="px-4 py-3 border-b border-slate-200 bg-white sticky top-0">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-500">
                    First 3 rows
                  </span>
                  <span className="text-xs font-bold text-primary">
                    Mapped: {Object.values(mapping).filter((v) => v).length}/4
                  </span>
                </div>
              </div>
              {/* Preview Table */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Date</th>
                      <th className="px-4 py-2 font-medium">Description</th>
                      <th className="px-4 py-2 font-medium text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewData.length > 0 ? (
                      previewData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-slate-900">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 text-slate-900">
                            {row.description}
                          </td>
                          <td
                            className={`px-4 py-3 font-mono text-right ${
                              row.amount.toString().startsWith("+") ||
                              parseFloat(row.amount) > 0
                                ? "text-green-600"
                                : "text-slate-900"
                            }`}
                          >
                            {row.amount}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="3"
                          className="px-4 py-8 text-center text-slate-500 text-sm"
                        >
                          Upload a file to see preview
                        </td>
                      </tr>
                    )}
                    {previewData.length > 0 && (
                      <tr className="opacity-50">
                        <td className="px-4 py-3">...</td>
                        <td className="px-4 py-3">...</td>
                        <td className="px-4 py-3 text-right">...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex gap-2">
                <i className="fa-solid fa-info-circle text-primary text-sm mt-0.5"></i>
                <p className="text-xs text-primary/80 leading-normal">
                  {fileStats.transactionCount > 0 ? (
                    <>
                      The system detected{" "}
                      <strong>{fileStats.transactionCount} transactions</strong>{" "}
                      in this file. The total net amount is{" "}
                      <strong className="font-mono">
                        ${fileStats.netAmount.toFixed(2)}
                      </strong>
                      .
                    </>
                  ) : (
                    "Upload and map a file to see statistics."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-50 text-green-600 mb-4">
              <i className="fa-solid fa-check-circle text-2xl"></i>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Ready to Import
            </h3>
            <p className="text-sm text-slate-500">
              Review the summary below and confirm import
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    File Name
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedFile?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Account
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    Bank Account
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Transactions
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {fileStats.transactionCount} records
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Net Amount
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    ${fileStats.netAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <div className="flex gap-2">
                <i className="fa-solid fa-lightbulb text-primary text-sm mt-0.5"></i>
                <p className="text-xs text-primary/80 leading-normal">
                  After import, these transactions will be added to your bank
                  statement table for reconciliation.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Import Bank Statement
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Reconcile your accounts by importing external data.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="ml-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Step {step} of 3
              </span>
              <span className="text-xs font-medium text-slate-500">
                {step === 1 && "Next: Map Columns"}
                {step === 2 && "Next: Review & Confirm"}
                {step === 3 && "Next: Complete Import"}
              </span>
            </div>
            <div className="relative h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-3 text-sm font-medium text-slate-500">
              <div
                className={`flex items-center gap-2 ${
                  step >= 1 ? "text-slate-900" : ""
                }`}
              >
                {step > 1 ? (
                  <i className="fa-solid fa-check-circle text-green-600"></i>
                ) : (
                  <i className="fa-solid fa-circle-dot text-primary"></i>
                )}
                Select & Upload
              </div>
              <div
                className={`flex items-center gap-2 ${
                  step >= 2 ? "text-primary" : ""
                }`}
              >
                {step > 2 ? (
                  <i className="fa-solid fa-check-circle text-green-600"></i>
                ) : step === 2 ? (
                  <i className="fa-solid fa-circle-dot text-primary"></i>
                ) : (
                  <i className="fa-regular fa-circle"></i>
                )}
                Map Columns
              </div>
              <div
                className={`flex items-center gap-2 ${
                  step >= 3 ? "text-primary" : "opacity-50"
                }`}
              >
                {step === 3 ? (
                  <i className="fa-solid fa-circle-dot text-primary"></i>
                ) : (
                  <i className="fa-regular fa-circle"></i>
                )}
                Verify
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">{renderStepContent()}</div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-slate-500 text-sm font-medium hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-bold shadow-sm hover:bg-blue-600 focus:ring-4 focus:ring-primary/30 transition-all flex items-center gap-2"
            >
              {step === 3 ? "Complete Import" : "Next Step"}
              <i className="fa-solid fa-arrow-right text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankStatementImportModal;
