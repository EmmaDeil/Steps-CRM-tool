import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import Skeleton from "../Skeleton";
import apiService from "../../services/api";

const Reconcile = ({ onBack }) => {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
  const [selectedBank, setSelectedBank] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState([]);
  const [statementStart, setStatementStart] = useState(14200.0);
  const [statementEnd, setStatementEnd] = useState(22450.0);
  const [clearedBalance, setClearedBalance] = useState(22450.0);
  const [account, setAccount] = useState({
    name: "Chase Business Checking",
    number: "8892",
  });
  const [period, setPeriod] = useState({
    start: "Oct 1, 2023",
    end: "Oct 31, 2023",
  });
  const [searchBank, setSearchBank] = useState("");
  const [searchLedger, setSearchLedger] = useState("");

  useEffect(() => {
    fetchReconciliationData();
  }, []);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/finance/reconciliation");
      if (response.success) {
        setBankTransactions(response.data.bankTransactions);
        setLedgerTransactions(response.data.ledgerTransactions);
        setStatementStart(response.data.statementStart);
        setStatementEnd(response.data.statementEnd);
        setClearedBalance(response.data.clearedBalance);
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
      const response = await apiService.post("/api/finance/reconciliation/match", {
        bankTransactions: selectedBank,
        ledgerTransactions: selectedLedger,
      });

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
      toast.error(`Cannot complete reconciliation. Difference: $${difference.toFixed(2)}`);
      return;
    }

    try {
      const response = await apiService.post("/api/finance/reconciliation/complete", {
        account: account.name,
        period,
        statementEnd,
        clearedBalance,
      });

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
      const response = await apiService.post("/api/finance/reconciliation/draft", {
        account: account.name,
        period,
        bankTransactions: selectedBank,
        ledgerTransactions: selectedLedger,
      });

      if (response.success) {
        toast.success("Draft saved successfully");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  const difference = Math.abs(clearedBalance - statementEnd);
  const matchedCount = bankTransactions.filter((t) => t.matched).length;
  const unmatchedCount = bankTransactions.filter((t) => !t.matched).length;

  const filteredBankTransactions = bankTransactions.filter((t) =>
    t.description.toLowerCase().includes(searchBank.toLowerCase())
  );

  const filteredLedgerTransactions = ledgerTransactions.filter((t) =>
    t.payee.toLowerCase().includes(searchLedger.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Breadcrumb
          items={[
            { label: "Finance", path: "/finance" },
            { label: "Reconcile", path: "/finance/reconcile" },
          ]}
        />
        <div className="flex-1 p-6">
          <Skeleton count={10} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-3 shrink-0 z-20">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors text-sm font-medium"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
            Back to Finance Home
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <i className="fa-solid fa-scale-balanced text-lg"></i>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Reconcile Transactions
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400">
            <span className="mr-2">Last saved: 2 mins ago</span>
          </div>
          <button className="flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <i className="fa-solid fa-bell text-sm"></i>
          </button>
          <button className="flex items-center justify-center size-9 rounded-full bg-primary text-white text-sm font-bold">
            {user?.firstName?.charAt(0) || "U"}
          </button>
        </div>
      </header>

      {/* Summary Section */}
      <section className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 shrink-0 shadow-sm z-10">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative group">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1 uppercase tracking-wide">
                  Account
                </label>
                <button className="flex items-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-primary/50 text-slate-900 dark:text-white px-3 py-2 rounded-lg text-sm font-medium min-w-[240px] shadow-sm transition-all">
                  <i className="fa-solid fa-credit-card text-slate-400"></i>
                  <div className="flex flex-col items-start leading-none gap-0.5">
                    <span>{account.name}</span>
                    <span className="text-xs text-slate-500 font-normal">...{account.number}</span>
                  </div>
                  <i className="fa-solid fa-chevron-down ml-auto text-slate-400 text-xs"></i>
                </button>
              </div>
              <div className="relative group">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 ml-1 uppercase tracking-wide">
                  Period
                </label>
                <button className="flex items-center gap-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:border-primary/50 text-slate-900 dark:text-white px-3 py-2 rounded-lg text-sm font-medium min-w-[220px] shadow-sm transition-all">
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
                <div className="flex flex-col px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-transparent dark:border-slate-600">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Statement Start
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    ${statementStart.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-transparent dark:border-slate-600">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Statement End
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    ${statementEnd.toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col px-4 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-transparent dark:border-slate-600">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Cleared Balance
                  </span>
                  <span className="text-sm font-bold text-primary tabular-nums">
                    ${clearedBalance.toFixed(2)}
                  </span>
                </div>
                <div
                  className={`flex flex-col px-4 py-2 rounded-lg border ${
                    difference < 0.01
                      ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/30"
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30"
                  }`}
                >
                  <span
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      difference < 0.01
                        ? "text-green-700 dark:text-green-400"
                        : "text-amber-700 dark:text-amber-400"
                    }`}
                  >
                    Difference
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-sm font-black tabular-nums ${
                        difference < 0.01
                          ? "text-green-700 dark:text-green-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      ${difference.toFixed(2)}
                    </span>
                    {difference < 0.01 && (
                      <i className="fa-solid fa-circle-check text-green-600 dark:text-green-400 text-sm"></i>
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
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white dark:bg-slate-600 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                  <i className="fa-solid fa-wallet text-slate-500 text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bank Statement</h3>
                  <p className="text-xs text-slate-500">{bankTransactions.length} transactions imported</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-600 hover:bg-slate-50 dark:hover:bg-slate-500 border border-slate-200 dark:border-slate-600 hover:border-primary/50 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all shadow-sm group">
                  <i className="fa-solid fa-upload text-slate-400 group-hover:text-primary transition-colors text-sm"></i>
                  <span>Import Statement</span>
                </button>
                <div className="relative">
                  <i className="absolute left-2.5 top-1/2 -translate-y-1/2 fa-solid fa-search text-xs text-slate-400"></i>
                  <input
                    className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-primary focus:border-primary w-32 transition-all focus:w-48"
                    placeholder="Filter..."
                    type="text"
                    value={searchBank}
                    onChange={(e) => setSearchBank(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 dark:bg-slate-700/30 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-2 px-4 w-10 border-b border-slate-200 dark:border-slate-700">
                      <input
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        type="checkbox"
                      />
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      Date
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-1/2">
                      Description
                    </th>
                    <th className="py-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200 dark:border-slate-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  {filteredBankTransactions.map((transaction) => (
                    <tr
                      key={transaction._id}
                      className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                        transaction.matched
                          ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-primary"
                          : "bg-white dark:bg-slate-800 border-l-4 border-l-transparent"
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
                      <td className="py-3 px-2 text-slate-500 whitespace-nowrap">{transaction.date}</td>
                      <td className="py-3 px-2 font-medium text-slate-900 dark:text-slate-100">
                        {transaction.description}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium tabular-nums ${
                          transaction.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Match Button */}
          <div className="hidden md:flex flex-col justify-center items-center gap-4 w-12 shrink-0 relative">
            <div className="h-full w-px bg-slate-200 dark:bg-slate-700 absolute left-1/2 -translate-x-1/2 z-[-1]"></div>
            <button
              onClick={handleMatchSelected}
              className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full p-2 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm z-10"
              title="Match Selected"
            >
              <i className="fa-solid fa-link"></i>
            </button>
          </div>

          {/* Internal Records Table */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-full">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-white dark:bg-slate-600 rounded border border-slate-200 dark:border-slate-600 shadow-sm">
                  <i className="fa-solid fa-server text-slate-500 text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Internal Records</h3>
                  <p className="text-xs text-slate-500">Ledger entries</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toast.info("Add missing entry feature coming soon")}
                  className="text-xs font-medium text-primary hover:text-blue-700 flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  Missing
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 dark:bg-slate-700/30 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-2 px-4 w-10 border-b border-slate-200 dark:border-slate-700">
                      <input
                        className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                        type="checkbox"
                      />
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      Date
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-1/3">
                      Ref
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-1/3">
                      Payee
                    </th>
                    <th className="py-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right border-b border-slate-200 dark:border-slate-700">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                  {filteredLedgerTransactions.map((transaction) => (
                    <tr
                      key={transaction._id}
                      className={`group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${
                        transaction.matched
                          ? "bg-blue-50/50 dark:bg-blue-900/10 border-r-4 border-r-primary"
                          : transaction.uncertain
                          ? "bg-amber-50/50 dark:bg-amber-900/10 border-r-4 border-r-amber-400 border-t border-t-amber-100 dark:border-t-amber-900/30"
                          : "bg-white dark:bg-slate-800 border-r-4 border-r-transparent"
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
                            onChange={() => handleLedgerCheckbox(transaction._id)}
                            disabled={transaction.matched}
                          />
                        )}
                      </td>
                      <td className="py-3 px-2 text-slate-500 whitespace-nowrap">{transaction.date}</td>
                      <td className="py-3 px-2 text-xs text-slate-500 font-mono">{transaction.reference}</td>
                      <td className="py-3 px-2 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                        {transaction.payee}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium tabular-nums ${
                          transaction.amount > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 z-20">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <span className="block w-2 h-2 rounded-full bg-primary"></span>
              Matched: {matchedCount}
            </span>
            <span className="flex items-center gap-1">
              <span className="block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              Unmatched: {unmatchedCount}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDraft}
              className="px-5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
