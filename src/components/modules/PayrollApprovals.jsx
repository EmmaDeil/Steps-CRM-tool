import { useCallback, useEffect, useState } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { formatCurrency } from "../../services/currency";
import toast from "react-hot-toast";

const formatPeriod = (period) => {
    const month = Number(period?.month);
    const year = period?.year;
    const monthName = Number.isInteger(month)
        ? new Date(Number(year), month).toLocaleString("en", { month: "long" })
        : "Unknown period";
    return `${monthName} ${year || ""} · ${period?.paymentSchedule || ""}`.trim();
};

const PayrollApprovals = ({ onBack }) => {
    const [runs, setRuns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyRunId, setBusyRunId] = useState(null);

    const loadRuns = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiService.get("/api/payroll/runs");
            const allRuns = Array.isArray(response) ? response : response?.data || [];
            setRuns(allRuns.filter((run) => ["pending_approval", "approved"].includes(run.status)));
        } catch (error) {
            toast.error(error?.serverData?.message || "Failed to load payroll approvals");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRuns();
    }, [loadRuns]);

    const updateStatus = async (run, status) => {
        const action = status === "paid" ? "mark this payroll as paid" : status === "cancelled" ? "cancel this payroll run" : "approve this payroll run";
        if (!window.confirm(`Are you sure you want to ${action} for ${formatPeriod(run.period)}?`)) return;

        setBusyRunId(run._id);
        try {
            await apiService.put(`/api/payroll/runs/${run._id}/status`, { status });
            toast.success(status === "approved" ? "Payroll approved" : status === "paid" ? "Payroll marked as paid" : "Payroll cancelled");
            await loadRuns();
        } catch (error) {
            toast.error(error?.serverData?.message || "Failed to update payroll status");
        } finally {
            setBusyRunId(null);
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 px-1 flex flex-col">
            <Breadcrumb
                items={[
                    { label: "Home", href: "/home", icon: "fa-house" },
                    { label: "HR Management", icon: "fa-user-tie", onClick: onBack },
                    { label: "Payroll Approvals", icon: "fa-clipboard-check" },
                ]}
            />
            <main className="flex-1 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payroll Approvals</h1>
                        <p className="mt-1 text-sm text-slate-500">Review submitted payroll runs before payment.</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={loadRuns}
                            disabled={loading}
                            title="Refresh payroll runs"
                            aria-label="Refresh payroll runs"
                            className="size-10 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                            <i className={`fa-solid fa-rotate ${loading ? "fa-spin" : ""}`} />
                        </button>
                        <button
                            type="button"
                            onClick={onBack}
                            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Back to HR
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <table className="w-full min-w-[760px] text-left">
                        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                            <tr>
                                {["Period", "Employees", "Gross Pay", "Net Pay", "Submitted", "Status", "Actions"].map((label) => (
                                    <th key={label} className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">{label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">Loading payroll runs...</td></tr>
                            ) : runs.length === 0 ? (
                                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">No payroll runs require review.</td></tr>
                            ) : runs.map((run) => (
                                <tr key={run._id}>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">{formatPeriod(run.period)}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{run.employees?.length || 0}</td>
                                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">{formatCurrency(run.totals?.totalGrossPay || 0)}</td>
                                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(run.totals?.totalNetPay || 0)}</td>
                                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">{run.createdAt ? new Date(run.createdAt).toLocaleDateString() : "—"}</td>
                                    <td className="px-4 py-4">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${run.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                            {run.status === "approved" ? "Approved" : "Pending approval"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            {run.status === "pending_approval" && (
                                                <button type="button" onClick={() => updateStatus(run, "approved")} disabled={busyRunId === run._id} className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                                                    Approve
                                                </button>
                                            )}
                                            {run.status === "approved" && (
                                                <button type="button" onClick={() => updateStatus(run, "paid")} disabled={busyRunId === run._id} className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                                    Mark paid
                                                </button>
                                            )}
                                            <button type="button" onClick={() => updateStatus(run, "cancelled")} disabled={busyRunId === run._id} className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                                                Cancel
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default PayrollApprovals;
