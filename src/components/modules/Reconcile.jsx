import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import apiService from "../../services/api";
import BankStatementImportModal from "./BankStatementImportModal";

const Reconcile = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [selectedBank, setSelectedBank] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState([]);
  const [statementStart, setStatementStart] = useState(0);
  const [statementEnd, setStatementEnd] = useState(0);
  const [clearedBalance, setClearedBalance] = useState(0);
  const [account, setAccount] = useState({
    name: "Bank Account",
    number: "****",
  });
  const [period, setPeriod] = useState({
    start: "",
    end: "",
  });
  const [searchBank, setSearchBank] = useState("");
  const [searchLedger] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/finance/reconciliation");
      if (response.success) {
        setBankTransactions(response.data.bankTransactions || []);
        setLedgerTransactions(response.data.ledgerTransactions || []);
        setStatementStart(response.data.statementStart || 0);
        setStatementEnd(response.data.statementEnd || 0);
        setClearedBalance(response.data.clearedBalance || 0);
        if (response.data.account) {
          setAccount(response.data.account);
        }
        if (response.data.period) {
          setPeriod(response.data.period);
        }
      }
    } catch (error) {
      console.error("Error fetching reconciliation data:", error);
      toast.error("Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  };

  const handleBankCheckbox = (transactionId) => {
    setSelectedBank((prev) =>
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleLedgerCheckbox = (transactionId) => {
    setSelectedLedger((prev) =>
      prev.includes(transactionId)
        ? prev.filter((id) => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleMatchSelected = async () => {
    if (selectedBank.length === 0 || selectedLedger.length === 0) {
      toast.error("Please select transactions from both sides to match");
      return;
    }

    try {
      const response = await apiService.post(
        "/api/finance/reconciliation/match",
        {
          bankTransactions: selectedBank,
          ledgerTransactions: selectedLedger,
        }
      );

      if (response.success) {
        toast.success("Transactions matched successfully");
        setSelectedBank([]);
        setSelectedLedger([]);
        fetchReconciliationData();
      }
    } catch (error) {
      console.error("Error matching transactions:", error);
      toast.error("Failed to match transactions");
    }
  };

  const handleCompleteReconciliation = async () => {
    const difference = Math.abs(clearedBalance - statementEnd);
    if (difference > 0.01) {
      toast.error(
        `Cannot complete reconciliation. Difference: $${difference.toFixed(2)}`
      );
      return;
    }

    try {
      const response = await apiService.post(
        "/api/finance/reconciliation/complete",
        {
          account: account.name,
          period,
          statementEnd,
          clearedBalance,
        }
      );

      if (response.success) {
        toast.success("Reconciliation completed successfully!");
        setTimeout(() => onBack(), 1500);
      }
    } catch (error) {
      console.error("Error completing reconciliation:", error);
      toast.error("Failed to complete reconciliation");
    }
  };

  const handleSaveDraft = async () => {
    try {
      const response = await apiService.post(
        "/api/finance/reconciliation/draft",
        {
          account: account.name,
          period,
          bankTransactions: selectedBank,
          ledgerTransactions: selectedLedger,
        }
      );

      if (response.success) {
        toast.success("Draft saved successfully");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const handleImportComplete = () => {
    fetchReconciliationData();
  };

  const difference = Math.abs(clearedBalance - statementEnd);
  const matchedCount = bankTransactions.filter((t) => t.matched).length;
  const unmatchedCount = bankTransactions.filter((t) => !t.matched).length;

  const filteredBankTransactions = bankTransactions.filter((t) =>
    (t.description || "").toLowerCase().includes(searchBank.toLowerCase())
  );

  const filteredLedgerTransactions = ledgerTransactions.filter((t) =>
    (t.payee || "").toLowerCase().includes(searchLedger.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            { label: "Finance", icon: "fa-coins", onClick: onBack },
            { label: "Reconcile", icon: "fa-scale-balanced" },
          ]}
        />
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-slate-600 text-sm">
              Loading reconciliation data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Import Modal */}
      <BankStatementImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins", onClick: onBack },
          { label: "Reconcile", icon: "fa-scale-balanced" },
        ]}
      />

      {/* Summary Section */}
      <section className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-slate-900">
                Reconcile Transactions
              </h1>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <i className="fa-solid fa-clock text-xs"></i>
                <span>Last saved: 2 mins ago</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative group">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wide">
                  Account
                </label>
                <button className="flex items-center gap-3 bg-white border border-slate-300 hover:border-primary/50 text-slate-900 px-3 py-2 rounded-lg text-sm font-medium min-w-[240px] shadow-sm transition-all">
                  <i className="fa-solid fa-credit-card text-slate-400"></i>
                  <div className="flex flex-col items-start leading-none gap-0.5">
                    <span>{account.name}</span>
                    <span className="text-xs text-slate-500 font-normal">
                      ...{account.number}
                    </span>
                  </div>
                  <i className="fa-solid fa-chevron-down ml-auto text-slate-400 text-xs"></i>
                </button>
              </div>
              <div className="relative group">
                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1 uppercase tracking-wide">
                  Period
                </label>
                <button className="flex items-center gap-3 bg-white border border-slate-300 hover:border-primary/50 text-slate-900 px-3 py-2 rounded-lg text-sm font-medium min-w-[220px] shadow-sm transition-all">
                  <i className="fa-solid fa-calendar-days text-slate-400"></i>
                  <span>
                    {period.start} - {period.end}
                  </span>
                  <i className="fa-solid fa-chevron-down ml-auto text-slate-400 text-xs"></i>
                </button>
              </div>
            </div>
            <div className="flex-1 w-full lg:w-auto flex justify-end">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
                <div className="flex flex-col px-4 py-2 bg-slate-50 rounded-lg border border-transparent">
                  <span className="text-xs font-medium text-slate-500 mb-1">
                    Statement Start
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    ${statementStart.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col px-4 py-2 bg-slate-50 rounded-lg border border-transparent">
                  <span className="text-xs font-medium text-slate-500 mb-1">
                    Statement End
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    ${statementEnd.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col px-4 py-2 bg-slate-50 rounded-lg border border-transparent">
                  <span className="text-xs font-medium text-slate-500 mb-1">
                    Cleared Balance
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums">
                    ${clearedBalance.toFixed(2)}
                  </span>
                </div>
                <div
                  className={`flex flex-col px-4 py-2 rounded-lg border ${
                    difference < 0.01
                      ? "bg-green-50 border-green-100"
                      : "bg-amber-50 border-amber-100"
                  }`}
                >
                  <span
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      difference < 0.01 ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    Difference
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-sm font-black tabular-nums ${
                        difference < 0.01 ? "text-green-700" : "text-amber-700"
                      }`}
                    >
                      ${difference.toFixed(2)}
                    </span>
                    {difference < 0.01 && (
                      <i className="fa-solid fa-circle-check text-green-600 text-sm"></i>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        <div className="h-full max-w-[1600px] mx-auto w-full px-6 py-6 flex flex-col md:flex-row gap-4">
          {/* Bank Statement Table */}
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white rounded border border-slate-200 shadow-sm">
                  <i className="fa-solid fa-wallet text-slate-500 text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Bank Statement
                  </h3>
                  <p className="text-xs text-slate-500">
                    {bankTransactions.length} transactions imported
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary/50 text-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm group"
                >
                  <i className="fa-solid fa-upload text-slate-400 group-hover:text-primary transition-colors text-sm"></i>
                  <span>Import Statement</span>
                </button>
                <div className="relative">
                  <i className="absolute left-2.5 top-1/2 -translate-y-1/2 fa-solid fa-search text-xs text-slate-400"></i>
                  <input
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-primary focus:border-primary w-32 transition-all focus:w-48"
                    placeholder="Filter..."
                    type="text"
                    value={searchBank}
                    onChange={(e) => setSearchBank(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-2 px-4 w-10 border-b border-slate-200">
                      <input
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        type="checkbox"
                      />
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      Date
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-1/2">
                      Description
                    </th>
                    <th className="py-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredBankTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-4xl">🏦</div>
                          <div className="text-slate-900 font-medium">
                            No bank transactions
                          </div>
                          <div className="text-slate-500 text-sm">
                            Import a bank statement to get started
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBankTransactions.map((transaction) => (
                      <tr
                        key={transaction._id}
                        className={`group hover:bg-slate-50 transition-colors cursor-pointer ${
                          transaction.matched
                            ? "bg-blue-50/50 border-l-4 border-l-primary"
                            : "bg-white border-l-4 border-l-transparent"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                            type="checkbox"
                            checked={selectedBank.includes(transaction._id)}
                            onChange={() => handleBankCheckbox(transaction._id)}
                            disabled={transaction.matched}
                          />
                        </td>
                        <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                          {transaction.date}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-900">
                          {transaction.description}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium tabular-nums ${
                            transaction.amount > 0
                              ? "text-green-600"
                              : "text-slate-900"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}$
                          {Math.abs(transaction.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Match Button */}
          <div className="hidden md:flex flex-col justify-center items-center gap-4 w-12 shrink-0 relative">
            <div className="h-full w-px bg-slate-200 absolute left-1/2 -translate-x-1/2 z-[-1]"></div>
            <button
              onClick={handleMatchSelected}
              className="bg-white border border-slate-200 rounded-full p-2 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm z-10"
              title="Match Selected"
            >
              <i className="fa-solid fa-link"></i>
            </button>
          </div>

          {/* Internal Records Table */}
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white rounded border border-slate-200 shadow-sm">
                  <i className="fa-solid fa-server text-slate-500 text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Internal Records
                  </h3>
                  <p className="text-xs text-slate-500">Ledger entries</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    toast.info("Add missing entry feature coming soon")
                  }
                  className="text-xs font-medium text-primary hover:text-blue-700 flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  Missing
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-2 px-4 w-10 border-b border-slate-200">
                      <input
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        type="checkbox"
                      />
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      Date
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-1/3">
                      Ref
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 w-1/3">
                      Payee
                    </th>
                    <th className="py-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredLedgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-4xl">📒</div>
                          <div className="text-slate-900 font-medium">
                            No ledger entries
                          </div>
                          <div className="text-slate-500 text-sm">
                            Ledger entries will appear here for matching
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLedgerTransactions.map((transaction) => (
                      <tr
                        key={transaction._id}
                        className={`group hover:bg-slate-50 transition-colors cursor-pointer ${
                          transaction.matched
                            ? "bg-blue-50/50 border-r-4 border-r-primary"
                            : transaction.uncertain
                            ? "bg-amber-50/50 border-r-4 border-r-amber-400 border-t border-t-amber-100"
                            : "bg-white border-r-4 border-r-transparent"
                        }`}
                      >
                        <td className="py-3 px-4">
                          {transaction.uncertain ? (
                            <span className="flex h-4 w-4 rounded-full border border-amber-400 text-amber-500 items-center justify-center text-[10px]">
                              ?
                            </span>
                          ) : (
                            <input
                              className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                              type="checkbox"
                              checked={selectedLedger.includes(transaction._id)}
                              onChange={() =>
                                handleLedgerCheckbox(transaction._id)
                              }
                              disabled={transaction.matched}
                            />
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                          {transaction.date}
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-500 font-mono">
                          {transaction.reference}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-900 truncate max-w-[120px]">
                          {transaction.payee}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-medium tabular-nums ${
                            transaction.amount > 0
                              ? "text-green-600"
                              : "text-slate-900"
                          }`}
                        >
                          {transaction.amount > 0 ? "+" : ""}$
                          {Math.abs(transaction.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}

      {/* Footer */}
      <footer className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 z-20">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <span className="block w-2 h-2 rounded-full bg-primary"></span>
              Matched: {matchedCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="block w-2 h-2 rounded-full bg-slate-300"></span>
              Unmatched: {unmatchedCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-5 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 text-sm font-bold hover:bg-slate-200 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={handleCompleteReconciliation}
              className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-check text-sm"></i>
              Complete Reconciliation
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Reconcile;
