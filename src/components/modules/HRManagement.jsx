import React, { useEffect, useMemo, useState } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import { useUser } from "@clerk/clerk-react";

const StatCard = ({ label, icon, value, trend, trendType }) => (
  <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex justify-between items-start">
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <div
        className={`p-1.5 rounded ${
          trendType === "rose"
            ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
            : "bg-blue-50 dark:bg-blue-900/30 text-primary"
        }`}
      >
        <i className={`fa-solid fa-${icon} text-[20px]`}></i>
      </div>
    </div>
    <div className="flex items-end gap-2 mt-2">
      <p className="text-slate-900 dark:text-white text-2xl font-bold leading-tight">
        {value}
      </p>
      {trend !== undefined && (
        <span
          className={`text-xs font-bold mb-1 flex items-center px-1.5 py-0.5 rounded ${
            trend >= 0
              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30"
              : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30"
          }`}
        >
          <i
            className={`fa-solid ${
              trend >= 0 ? "fa-arrow-trend-up" : "fa-arrow-trend-down"
            } text-[14px]`}
          ></i>{" "}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
  </div>
);

const HRManagement = () => {
  const { user } = useUser();
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [requisitions, setRequisitions] = useState([]);
  const [analytics, setAnalytics] = useState({
    turnoverRates: [],
    months: [],
    newHires: 0,
  });
  const [range, setRange] = useState("6m");

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [performance, setPerformance] = useState({
    q3CompletedPct: 0,
    pending: { selfReviews: 0, managerReviews: 0 },
  });
  const [training, setTraining] = useState([]);
  const [payrollNext, setPayrollNext] = useState({
    date: "",
    runApproved: false,
  });

  // Modal states
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [employeeFormLoading, setEmployeeFormLoading] = useState(false);
  const [jobFormLoading, setJobFormLoading] = useState(false);
  const [showLeaveAllocationModal, setShowLeaveAllocationModal] =
    useState(false);
  const [leaveAllocationLoading, setLeaveAllocationLoading] = useState(false);

  // Leave allocations state
  const [leaveAllocations, setLeaveAllocations] = useState([]);

  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    department: "",
    jobTitle: "",
    startDate: "",
  });

  // Job form state
  const [jobForm, setJobForm] = useState({
    title: "",
    department: "",
    status: "draft",
    experienceLevel: "",
    description: "",
  });

  // Leave allocation form state
  const [leaveAllocationForm, setLeaveAllocationForm] = useState({
    employeeId: "",
    employeeName: "",
    annualLeave: 20,
    sickLeave: 10,
    personalLeave: 5,
    unpaidLeave: 0,
    year: new Date().getFullYear(),
    managerId: "",
    managerName: "",
  });

  const totalEmployees = employees.length;
  const openRequisitions = requisitions.length;
  // newHires provided in analytics
  const pendingApprovals = leaveRequests.filter(
    (l) => l.status === "pending"
  ).length;

  const formattedPayrollDate = useMemo(() => {
    if (!payrollNext.date) return "";
    try {
      const d = new Date(payrollNext.date);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return payrollNext.date;
    }
  }, [payrollNext]);

  const displayName = useMemo(() => {
    if (!user) return "";
    return (
      user.firstName ||
      user.username ||
      (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
      ""
    );
  }, [user]);

  const fetchAll = async () => {
    try {
      setEmployeesLoading(true);
      const [
        empRes,
        reqRes,
        anaRes,
        leaveRes,
        perfRes,
        trainRes,
        payRes,
        allocRes,
      ] = await Promise.allSettled([
        apiService.get(
          `/api/hr/employees${
            search ? `?search=${encodeURIComponent(search)}` : ""
          }`
        ),
        apiService.get("/api/hr/requisitions"),
        apiService.get(`/api/hr/analytics?range=${range}`),
        apiService.get("/api/hr/leave-requests"),
        apiService.get("/api/hr/performance"),
        apiService.get("/api/hr/training"),
        apiService.get("/api/hr/payroll-next"),
        apiService.get("/api/hr/leave-allocations"),
      ]);

      setEmployees(
        empRes.status === "fulfilled" && empRes.value.data
          ? Array.isArray(empRes.value.data)
            ? empRes.value.data
            : empRes.value.data.data || []
          : []
      );
      setRequisitions(
        reqRes.status === "fulfilled" && reqRes.value.data
          ? Array.isArray(reqRes.value.data)
            ? reqRes.value.data
            : reqRes.value.data.data || []
          : []
      );
      setAnalytics(
        anaRes.status === "fulfilled" && anaRes.value.data
          ? anaRes.value.data
          : { turnoverRates: [], months: [], newHires: 0 }
      );
      setLeaveRequests(
        leaveRes.status === "fulfilled" && leaveRes.value.data
          ? Array.isArray(leaveRes.value.data)
            ? leaveRes.value.data
            : leaveRes.value.data.data || []
          : []
      );
      setLeaveAllocations(
        allocRes.status === "fulfilled" && allocRes.value.data
          ? Array.isArray(allocRes.value.data)
            ? allocRes.value.data
            : allocRes.value.data.data || []
          : []
      );
      setPerformance(
        perfRes.status === "fulfilled" && perfRes.value.data
          ? perfRes.value.data
          : {
              q3CompletedPct: 0,
              pending: { selfReviews: 0, managerReviews: 0 },
            }
      );
      setTraining(
        trainRes.status === "fulfilled" && trainRes.value.data
          ? Array.isArray(trainRes.value.data)
            ? trainRes.value.data
            : trainRes.value.data.data || []
          : []
      );
      setPayrollNext(
        payRes.status === "fulfilled" && payRes.value.data
          ? payRes.value.data
          : { date: "", runApproved: false }
      );

      // Check for failures and log them
      const failures = [
        empRes.status === "rejected" ? "Employees" : null,
        reqRes.status === "rejected" ? "Requisitions" : null,
        anaRes.status === "rejected" ? "Analytics" : null,
        leaveRes.status === "rejected" ? "Leave Requests" : null,
        perfRes.status === "rejected" ? "Performance" : null,
        trainRes.status === "rejected" ? "Training" : null,
        payRes.status === "rejected" ? "Payroll" : null,
        allocRes.status === "rejected" ? "Leave Allocations" : null,
      ].filter(Boolean);

      if (failures.length > 0) {
        console.warn("Failed to load:", failures.join(", "));
        // Only show error if critical endpoints failed
        if (failures.includes("Employees") || failures.includes("Analytics")) {
          toast.error(`Failed to load: ${failures.join(", ")}`);
        }
      }
    } catch (error) {
      console.error("Error in fetchAll:", error);
      toast.error("Failed to load HR dashboard data");
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const approveLeave = async (id) => {
    try {
      await apiService.post(`/api/hr/leave-requests/${id}/approve`);
      setLeaveRequests((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l))
      );
      toast.success("Leave approved");
    } catch {
      toast.error("Failed to approve");
    }
  };

  const rejectLeave = async (id) => {
    try {
      await apiService.post(`/api/hr/leave-requests/${id}/reject`);
      setLeaveRequests((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l))
      );
      toast.success("Leave rejected");
    } catch {
      toast.error("Failed to reject");
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white font-display min-h-screen w-full">
      <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
        <div className="flex h-full grow flex-col p-2 w-full">
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { label: "Home", href: "/home", icon: "fa-house" },
              { label: "Dashboard", icon: "fa-user-tie" },
            ]}
          />

          {/* Page Header & Actions */}
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 items-start md:items-end">
            <div className="flex flex-col gap-2">
              <h1 className="text-slate-900 dark:text-white text-3xl mt-3 md:text-4xl font-black leading-tight tracking-[-0.033em]">
                {displayName ? `${displayName}'s ` : ""} Dashboard
              </h1>
              <p className="text-slate-500 text-base font-normal leading-normal max-w-2xl">
                Overview of organization workforce, recruitment pipeline, and
                performance metrics.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateJobModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
              >
                <i className="fa-solid fa-plus text-[16px]"></i>
                <span className="truncate">Create Job</span>
              </button>
              <button
                onClick={() => setShowAddEmployeeModal(true)}
                className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-blue-700 transition-colors"
              >
                <i className="fa-solid fa-user-plus text-[16px]"></i>
                <span className="truncate">Add Employee</span>
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Employees"
              icon="group"
              value={employeesLoading ? "…" : totalEmployees}
              trend={2.1}
            />
            <StatCard
              label="Open Requisitions"
              icon="work"
              value={openRequisitions}
              trend={5}
            />
            <StatCard
              label="New Hires (Mo)"
              icon="badge"
              value={analytics.newHires}
              trend={12}
            />
            <StatCard
              label="Pending Approvals"
              icon="pending_actions"
              value={pendingApprovals}
              trendType="rose"
            />
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {/* Main Column */}
            <div className="lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
              {/* Employee Directory */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-people-group text-slate-400"></i>
                    Employee Directory
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSearch("")}
                      className="text-primary text-sm font-bold hover:underline"
                    >
                      View All
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                        <th className="px-5 py-3">Employee</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3 hidden sm:table-cell">
                          Department
                        </th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                      {employees.map((e) => (
                        <tr
                          key={e.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="size-9 rounded-full bg-cover bg-center"
                                style={{
                                  backgroundImage: `url('${e.avatar}')`,
                                }}
                              ></div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {e.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {e.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                            {e.role}
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-300 hidden sm:table-cell">
                            {e.department}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                e.status === "Active"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              <span
                                className={`size-1.5 rounded-full ${
                                  e.status === "Active"
                                    ? "bg-emerald-500"
                                    : "bg-amber-500"
                                }`}
                              ></span>{" "}
                              {e.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button className="text-slate-400 hover:text-primary transition-colors">
                              <i className="fa-solid fa-ellipsis-v text-[16px]"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recruitment */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-user-group text-purple-500"></i>
                    Recruitment
                  </h3>
                </div>
                {requisitions.slice(0, 2).map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {r.title}
                      </span>
                      <span className="text-xs font-bold text-primary bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                        {r.candidates} Candidates
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full"
                        style={{ width: `${r.progressPct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                      <span>Screening</span>
                      <span>Interview</span>
                      <span>Offer</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Column */}
            <div className="lg:col-span-1 xl:col-span-1 flex flex-col gap-6">
              {/* Leave Allocations */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <i className="fa-solid fa-calendar-days text-purple-500"></i>
                    Leave Allocations
                  </h3>
                  <button
                    onClick={() => setShowLeaveAllocationModal(true)}
                    className="text-xs text-primary hover:underline font-semibold"
                  >
                    + Allocate
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-64 overflow-y-auto">
                  {leaveAllocations.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-sm">
                      No leave allocations yet
                    </div>
                  ) : (
                    leaveAllocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {allocation.employeeName}
                          </p>
                          <span className="text-xs text-slate-500">
                            {allocation.year}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Annual:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {allocation.annualLeave} days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Sick:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {allocation.sickLeave} days
                            </span>
                          </div>
                        </div>
                        {allocation.managerName && (
                          <div className="text-xs text-slate-500">
                            Manager:{" "}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {allocation.managerName}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Analytics */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-blue-500"></i>
                    Analytics
                  </h3>
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border-none text-xs rounded text-slate-500 font-medium focus:ring-0 cursor-pointer"
                  >
                    <option value="6m">Last 6 Months</option>
                    <option value="ytd">Year to Date</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-500">Turnover Rate</p>
                  <div className="flex items-end gap-2 h-32 w-full justify-between pt-4 px-2">
                    {analytics.turnoverRates.map((v, idx) => (
                      <div
                        key={idx}
                        className={`w-1/${
                          analytics.turnoverRates.length
                        } bg-blue-${
                          100 + idx * 100
                        } dark:bg-blue-900/40 rounded-t relative group`}
                        style={{
                          height: `${Math.max(10, Math.min(100, v * 20))}%`,
                        }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded">
                          {v.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 px-2">
                    {analytics.months
                      .slice(0, analytics.turnoverRates.length)
                      .map((m) => (
                        <span key={m}>{m}</span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Leave Requests */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <i className="fa-solid fa-calendar-xmark text-rose-500"></i>
                    Leave Requests
                  </h3>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {leaveRequests.map((lr) => (
                    <div key={lr.id} className="p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {lr.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {lr.type} • {lr.range}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => rejectLeave(lr.id)}
                          className="flex-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 rounded transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => approveLeave(lr.id)}
                          className="flex-1 bg-primary hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <i className="fa-solid fa-star text-amber-500"></i>
                    Performance
                  </h3>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-semibold">
                      Q3 Reviews
                    </p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">
                      {performance.q3CompletedPct}%{" "}
                      <span className="text-xs font-normal text-slate-500">
                        Completed
                      </span>
                    </p>
                  </div>
                  <div className="size-10 rounded-full border-4 border-slate-200 dark:border-slate-600 border-t-amber-500 dark:border-t-amber-500 transform -rotate-45"></div>
                </div>
                <div className="space-y-3 mt-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      Self-Reviews
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {performance.pending.selfReviews} Pending
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">
                      Manager Reviews
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {performance.pending.managerReviews} Pending
                    </span>
                  </div>
                </div>
              </div>

              {/* Training */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
                    <i className="fa-solid fa-graduation-cap text-emerald-500"></i>
                    Training
                  </h3>
                </div>
                {training.map((t) => (
                  <div key={t.id} className="flex gap-3 items-center">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 p-2 rounded-lg">
                      <i className={`fa-solid fa-${t.icon}`}></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Due in {t.dueInDays} days
                      </p>
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                      {t.completionPercent}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Benefits Snapshot */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl shadow-sm p-5 text-white flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                  <i className="fa-solid fa-money-bill-wave text-[120px]"></i>
                </div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider z-10">
                  Next Payroll
                </p>
                <p className="text-2xl font-bold z-10">
                  {formattedPayrollDate}
                </p>
                <div className="mt-2 inline-flex items-center gap-2 text-xs text-emerald-400 font-medium z-10">
                  <i
                    className={`fa-solid ${
                      payrollNext.runApproved
                        ? "fa-check-circle"
                        : "fa-exclamation-circle"
                    } text-[16px]`}
                  ></i>
                  {payrollNext.runApproved
                    ? "Run Approved"
                    : "Approval Pending"}
                </div>
              </div>
            </div>
          </div>

          {/* Add Employee Modal */}
          {showAddEmployeeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300">
              <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col bg-white shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-white z-10">
                  <div>
                    <h3 className="text-slate-900 tracking-tight text-xl font-bold leading-tight">
                      Add New Employee
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Fill in the information below to onboard a new team
                      member.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddEmployeeModal(false)}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <i className="fa-solid fa-times text-xl"></i>
                  </button>
                </div>

                {/* Content */}
                <div className="modal-content flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  <form
                    className="space-y-6"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setEmployeeFormLoading(true);
                      try {
                        const fullName =
                          `${employeeForm.firstName} ${employeeForm.lastName}`.trim();
                        await apiService.post("/api/hr/employees", {
                          name: fullName,
                          email: employeeForm.email,
                          phone: employeeForm.phone,
                          dateOfBirth: employeeForm.dateOfBirth,
                          department: employeeForm.department,
                          jobTitle: employeeForm.jobTitle,
                          startDate: employeeForm.startDate,
                        });
                        toast.success("Employee added successfully");
                        setShowAddEmployeeModal(false);
                        setEmployeeForm({
                          firstName: "",
                          lastName: "",
                          email: "",
                          phone: "",
                          dateOfBirth: "",
                          department: "",
                          jobTitle: "",
                          startDate: "",
                        });
                        fetchAll();
                      } catch (error) {
                        toast.error(error.message || "Failed to add employee");
                      } finally {
                        setEmployeeFormLoading(false);
                      }
                    }}
                  >
                    {/* Personal Information */}
                    <div>
                      <h2 className="text-slate-900 text-lg font-bold pb-4 border-b border-slate-200 mb-6">
                        Personal Information
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            First Name <span className="text-red-500">*</span>
                          </p>
                          <input
                            type="text"
                            placeholder="e.g. Jane"
                            required
                            value={employeeForm.firstName}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                firstName: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Last Name <span className="text-red-500">*</span>
                          </p>
                          <input
                            type="text"
                            placeholder="e.g. Doe"
                            required
                            value={employeeForm.lastName}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                lastName: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Email Address{" "}
                            <span className="text-red-500">*</span>
                          </p>
                          <input
                            type="email"
                            placeholder="jane.doe@company.com"
                            required
                            value={employeeForm.email}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                email: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Phone Number
                          </p>
                          <input
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            value={employeeForm.phone}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                phone: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Date of Birth
                          </p>
                          <input
                            type="date"
                            value={employeeForm.dateOfBirth}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                dateOfBirth: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div>
                      <h2 className="text-slate-900 text-lg font-bold pb-4 border-b border-slate-200 mb-6">
                        Employment Details
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Department <span className="text-red-500">*</span>
                          </p>
                          <select
                            required
                            value={employeeForm.department}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                department: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 appearance-none focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                          >
                            <option value="">Select Department</option>
                            <option value="engineering">Engineering</option>
                            <option value="product">Product</option>
                            <option value="hr">Human Resources</option>
                          </select>
                        </label>
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Job Title <span className="text-red-500">*</span>
                          </p>
                          <input
                            type="text"
                            placeholder="e.g. Senior Product Designer"
                            required
                            value={employeeForm.jobTitle}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                jobTitle: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                        <label className="flex flex-col w-full">
                          <p className="text-slate-700 text-sm font-medium pb-2">
                            Start Date <span className="text-red-500">*</span>
                          </p>
                          <input
                            type="date"
                            required
                            value={employeeForm.startDate}
                            onChange={(e) =>
                              setEmployeeForm({
                                ...employeeForm,
                                startDate: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                          />
                        </label>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 z-10">
                  <button
                    onClick={() => setShowAddEmployeeModal(false)}
                    disabled={employeeFormLoading}
                    className="flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const form = document.querySelector("form");
                      form?.dispatchEvent(
                        new Event("submit", { bubbles: true })
                      );
                    }}
                    disabled={employeeFormLoading}
                    className="flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all gap-2 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-check text-lg"></i>
                    {employeeFormLoading ? "Adding..." : "Add Employee"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Create Job Modal */}
          {showCreateJobModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300">
              <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col bg-white shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-white z-10">
                  <div>
                    <h3 className="text-slate-900 tracking-tight text-xl font-bold leading-tight">
                      Create Job Posting
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Draft a new position to find your next team member.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateJobModal(false)}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <i className="fa-solid fa-times text-xl"></i>
                  </button>
                </div>

                {/* Content */}
                <div className="modal-content flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  <form
                    className="space-y-6"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setJobFormLoading(true);
                      try {
                        await apiService.post("/api/hr/requisitions", {
                          title: jobForm.title,
                          department: jobForm.department,
                          status: jobForm.status,
                          experienceLevel: jobForm.experienceLevel,
                          description: jobForm.description,
                        });
                        toast.success("Job posting created successfully");
                        setShowCreateJobModal(false);
                        setJobForm({
                          title: "",
                          department: "",
                          status: "draft",
                          experienceLevel: "",
                          description: "",
                        });
                        fetchAll();
                      } catch (error) {
                        toast.error(error.message || "Failed to create job");
                      } finally {
                        setJobFormLoading(false);
                      }
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Job Title <span className="text-red-500">*</span>
                        </p>
                        <input
                          type="text"
                          placeholder="e.g. Senior Product Designer"
                          required
                          value={jobForm.title}
                          onChange={(e) =>
                            setJobForm({ ...jobForm, title: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </label>
                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Department <span className="text-red-500">*</span>
                        </p>
                        <select
                          required
                          value={jobForm.department}
                          onChange={(e) =>
                            setJobForm({
                              ...jobForm,
                              department: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 appearance-none focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="">Select Department</option>
                          <option value="engineering">Engineering</option>
                          <option value="design">Design</option>
                          <option value="marketing">Marketing</option>
                        </select>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Job Status
                        </p>
                        <select
                          value={jobForm.status}
                          onChange={(e) =>
                            setJobForm({ ...jobForm, status: e.target.value })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 appearance-none focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="draft">Draft</option>
                          <option value="published">Published</option>
                          <option value="closed">Closed</option>
                        </select>
                      </label>
                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Experience Level
                        </p>
                        <select
                          value={jobForm.experienceLevel}
                          onChange={(e) =>
                            setJobForm({
                              ...jobForm,
                              experienceLevel: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 appearance-none focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="">Select Level</option>
                          <option value="entry">Entry Level</option>
                          <option value="mid">Mid Level</option>
                          <option value="senior">Senior Level</option>
                        </select>
                      </label>
                    </div>

                    <label className="flex flex-col w-full">
                      <p className="text-slate-700 text-sm font-medium pb-2">
                        Job Description <span className="text-red-500">*</span>
                      </p>
                      <textarea
                        placeholder="Describe the role, responsibilities, and requirements..."
                        required
                        value={jobForm.description}
                        onChange={(e) =>
                          setJobForm({
                            ...jobForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 min-h-[150px] px-4 py-3 placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                      ></textarea>
                    </label>
                  </form>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 z-10">
                  <button
                    onClick={() => setShowCreateJobModal(false)}
                    disabled={jobFormLoading}
                    className="flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const form = document.querySelector("form");
                      form?.dispatchEvent(
                        new Event("submit", { bubbles: true })
                      );
                    }}
                    disabled={jobFormLoading}
                    className="flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all gap-2 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-check text-lg"></i>
                    {jobFormLoading ? "Creating..." : "Create Job"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Leave Allocation Modal */}
          {showLeaveAllocationModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300">
              <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col bg-white shadow-2xl rounded-xl overflow-hidden ring-1 ring-black/5">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-white z-10">
                  <div>
                    <h3 className="text-slate-900 tracking-tight text-xl font-bold leading-tight">
                      Allocate Leave
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Set leave allocation and assign manager for employee
                    </p>
                  </div>
                  <button
                    onClick={() => setShowLeaveAllocationModal(false)}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <i className="fa-solid fa-times text-xl"></i>
                  </button>
                </div>

                <div className="modal-content flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  <form
                    className="space-y-6"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setLeaveAllocationLoading(true);
                      try {
                        await apiService.post(
                          "/api/hr/leave-allocations",
                          leaveAllocationForm
                        );
                        toast.success("Leave allocation saved successfully");
                        setShowLeaveAllocationModal(false);
                        setLeaveAllocationForm({
                          employeeId: "",
                          employeeName: "",
                          annualLeave: 20,
                          sickLeave: 10,
                          personalLeave: 5,
                          unpaidLeave: 0,
                          year: new Date().getFullYear(),
                          managerId: "",
                          managerName: "",
                        });
                        fetchAll();
                      } catch (error) {
                        toast.error(
                          error.message || "Failed to allocate leave"
                        );
                      } finally {
                        setLeaveAllocationLoading(false);
                      }
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <label className="flex flex-col w-full md:col-span-2">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Employee <span className="text-red-500">*</span>
                        </p>
                        <select
                          required
                          value={leaveAllocationForm.employeeId}
                          onChange={(e) => {
                            const selectedEmp = employees.find(
                              (emp) => emp.id === e.target.value
                            );
                            setLeaveAllocationForm({
                              ...leaveAllocationForm,
                              employeeId: e.target.value,
                              employeeName: selectedEmp?.name || "",
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 appearance-none focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="">Select Employee</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} - {emp.department}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Annual Leave (days){" "}
                          <span className="text-red-500">*</span>
                        </p>
                        <input
                          type="number"
                          min="0"
                          required
                          value={leaveAllocationForm.annualLeave}
                          onChange={(e) =>
                            setLeaveAllocationForm({
                              ...leaveAllocationForm,
                              annualLeave: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </label>

                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Sick Leave (days){" "}
                          <span className="text-red-500">*</span>
                        </p>
                        <input
                          type="number"
                          min="0"
                          required
                          value={leaveAllocationForm.sickLeave}
                          onChange={(e) =>
                            setLeaveAllocationForm({
                              ...leaveAllocationForm,
                              sickLeave: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </label>

                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Personal Leave (days)
                        </p>
                        <input
                          type="number"
                          min="0"
                          value={leaveAllocationForm.personalLeave}
                          onChange={(e) =>
                            setLeaveAllocationForm({
                              ...leaveAllocationForm,
                              personalLeave: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </label>

                      <label className="flex flex-col w-full">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Year <span className="text-red-500">*</span>
                        </p>
                        <input
                          type="number"
                          min="2020"
                          max="2030"
                          required
                          value={leaveAllocationForm.year}
                          onChange={(e) =>
                            setLeaveAllocationForm({
                              ...leaveAllocationForm,
                              year:
                                parseInt(e.target.value) ||
                                new Date().getFullYear(),
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                      </label>

                      <label className="flex flex-col w-full md:col-span-2">
                        <p className="text-slate-700 text-sm font-medium pb-2">
                          Assign Manager <span className="text-red-500">*</span>
                        </p>
                        <select
                          required
                          value={leaveAllocationForm.managerId}
                          onChange={(e) => {
                            const selectedManager = employees.find(
                              (emp) => emp.id === e.target.value
                            );
                            setLeaveAllocationForm({
                              ...leaveAllocationForm,
                              managerId: e.target.value,
                              managerName: selectedManager?.name || "",
                            });
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 h-12 px-4 appearance-none focus:outline-0 focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                        >
                          <option value="">Select Manager</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} - {emp.role}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </form>
                </div>

                <div className="border-t border-slate-200 p-6 bg-slate-50 flex flex-col-reverse sm:flex-row justify-end gap-3 z-10">
                  <button
                    onClick={() => setShowLeaveAllocationModal(false)}
                    disabled={leaveAllocationLoading}
                    className="flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const form = document.querySelector("form");
                      form?.dispatchEvent(
                        new Event("submit", { bubbles: true })
                      );
                    }}
                    disabled={leaveAllocationLoading}
                    className="flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all gap-2 disabled:opacity-50"
                  >
                    <i className="fa-solid fa-check text-lg"></i>
                    {leaveAllocationLoading ? "Saving..." : "Save Allocation"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRManagement;
