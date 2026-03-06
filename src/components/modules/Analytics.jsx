import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { useDepartments } from "../../context/useDepartments";
import { useAuth } from "../../context/useAuth";
import { apiService } from "../../services/api";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const Analytics = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState(
    location.state?.defaultSearch || "",
  );
  const [reportType, setReportType] = useState(
    location.state?.defaultReport || "Facility Usage Report",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const { departments, loading: departmentsLoading } = useDepartments();
  const [includeDrafts, setIncludeDrafts] = useState(false);

  useEffect(() => {
    if (location.state?.defaultSearch) {
      setSearchQuery(location.state.defaultSearch);
    }
    if (location.state?.defaultReport) {
      setReportType(location.state.defaultReport);
    }
  }, [location.state]);

  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportTypes, setReportTypes] = useState([]);
  const [loadingReportTypes, setLoadingReportTypes] = useState(true);

  // --- Dynamic Datasets for Charts ---
  const [datasets, setDatasets] = useState({
    facilityData: [],
    financialData: [],
    attendanceData: [],
    approvalData: [],
    stats: {},
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await apiService.get("/api/analytics/reports");
        if (response?.data) {
          setDatasets({
            facilityData: response.data.facilityData || [],
            financialData: response.data.financialData || [],
            attendanceData: response.data.attendanceData || [],
            approvalData: response.data.approvalData || [],
            stats: response.data.stats || {},
          });
        }
      } catch (err) {
        console.error("Failed to load analytics data", err);
        toast.error("Failed to fetch live analytics data.");
      } finally {
        setLoadingAnalytics(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Fetch available report types
  useEffect(() => {
    const fetchReportTypes = async () => {
      try {
        const response = await apiService.get("/api/reports/types/available");
        if (response?.reportTypes) {
          setReportTypes(response.reportTypes);
          // Set default report type if not already set from location state
          if (
            !location.state?.defaultReport &&
            response.reportTypes.length > 0
          ) {
            setReportType(response.reportTypes[0].value);
          }
        }
      } catch (err) {
        console.error("Failed to load report types", err);
        // Fallback to default types
        const fallbackTypes = [
          { value: "Facility Usage Report", label: "Facility Usage Report" },
          { value: "Financial Report", label: "Financial Report" },
          { value: "Attendance Report", label: "Attendance Report" },
          { value: "Approval Statistics", label: "Approval Statistics" },
          { value: "Custom Report", label: "Custom Report" },
        ];
        setReportTypes(fallbackTypes);
        if (!location.state?.defaultReport) {
          setReportType(fallbackTypes[0].value);
        }
      } finally {
        setLoadingReportTypes(false);
      }
    };
    fetchReportTypes();
  }, [location.state?.defaultReport]);

  // Fetch reports from API
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoadingReports(true);
        const response = await apiService.get("/api/reports", {
          params: {
            reportType: reportType !== "All" ? reportType : undefined,
            department:
              department !== "All Departments" ? department : undefined,
            startDate,
            endDate,
          },
        });
        if (response?.reports) {
          setReports(response.reports);
        }
      } catch (err) {
        console.error("Failed to load reports", err);
        toast.error("Failed to fetch reports.");
      } finally {
        setLoadingReports(false);
      }
    };
    fetchReports();
  }, [reportType, department, startDate, endDate]);

  // Dynamically compute stats depending on the selected reportType
  const getDynamicStats = () => {
    switch (reportType) {
      case "Financial Report":
        return {
          title1: "Total Revenue",
          val1: datasets.stats?.financialRevenue || "$0",
          icon1: "fa-dollar-sign",
          color1: "green",
          growth1: datasets.stats?.reportsGrowth || "No data",
          title2: "Total Expenses",
          val2: datasets.stats?.financialExpenses || "$0",
          icon2: "fa-credit-card",
          color2: "red",
          status2: "Tracking normal",
          title3: "Net Profit",
          val3: datasets.stats?.netProfit || "$0",
          icon3: "fa-chart-pie",
          color3: "orange",
          growth3:
            parseInt(datasets.stats?.netProfit?.replace(/[^0-9-]/g, "")) > 0
              ? "Positive"
              : "Negative",
          title4: "Avg Transaction",
          val4: datasets.stats?.avgTransaction || "$0",
          icon4: "fa-receipt",
          color4: "blue",
          status4: "Stable",
        };
      case "Attendance Report":
        return {
          title1: "Avg Attendance",
          val1: datasets.stats?.avgAttendance || "0%",
          icon1: "fa-user-check",
          color1: "green",
          growth1: "Stable",
          title2: "Total Absences",
          val2: datasets.stats?.totalAbsences || 0,
          icon2: "fa-user-xmark",
          color2: "red",
          status2:
            (datasets.stats?.totalAbsences || 0) > 10
              ? "Needs attention"
              : "Normal",
          title3: "Late Arrivals",
          val3: datasets.stats?.lateArrivals || 0,
          icon3: "fa-clock",
          color3: "orange",
          growth3: "Improving",
          title4: "Total Employees",
          val4: datasets.stats?.totalEmployees || 0,
          icon4: "fa-users",
          color4: "blue",
          status4:
            datasets.stats?.totalEmployees > 0 ? "Fully Staffed" : "No data",
        };
      case "Approval Statistics":
        return {
          title1: "Total Approvals",
          val1: datasets.stats?.totalApprovals || 0,
          icon1: "fa-thumbs-up",
          color1: "blue",
          growth1: datasets.stats?.reportsGrowth || "No data",
          title2: "Pending Requests",
          val2: datasets.stats?.pendingApprovals || 0,
          icon2: "fa-hourglass-half",
          color2: "orange",
          status2: datasets.stats?.approvalStatus || "N/A",
          title3: "Rejection Rate",
          val3: datasets.stats?.rejectionRate || "0%",
          icon3: "fa-thumbs-down",
          color3: "red",
          growth3: datasets.stats?.rejectionRate
            ? `${datasets.stats.rejectionRate} rate`
            : "No data",
          title4: "Avg Process Time",
          val4: datasets.stats?.avgProcessingTime || "N/A",
          icon4: "fa-stopwatch",
          color4: "green",
          status4: datasets.stats?.slaStatus || "N/A",
        };
      case "Custom Report":
      case "Facility Usage Report":
      default:
        return {
          title1: "Total Reports Generated",
          val1: datasets.stats?.totalReports || 0,
          icon1: "fa-chart-bar",
          color1: "blue",
          growth1: datasets.stats?.reportsGrowth || "N/A",
          title2: "Pending Approvals",
          val2: datasets.stats?.pendingApprovals || 0,
          icon2: "fa-clock",
          color2: "orange",
          status2: datasets.stats?.approvalStatus || "N/A",
          title3: "Facility Usage",
          val3: datasets.stats?.facilityUsage || "0%",
          icon3: "fa-building",
          color3: "purple",
          growth3: datasets.stats?.usageChange || "N/A",
          title4: "Avg Processing Time",
          val4: datasets.stats?.avgProcessingTime || "N/A",
          icon4: "fa-hourglass-half",
          color4: "blue",
          status4: datasets.stats?.slaStatus || "N/A",
        };
    }
  };

  const stats = getDynamicStats();

  // Filter reports based on search query
  const filteredReports = reports.filter(
    (report) =>
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reportType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.module?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getStatusColor = (status) => {
    const colors = {
      Ready: "bg-green-100 text-green-700",
      Processing: "bg-yellow-100 text-yellow-700",
      Archived: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusIcon = (status) => {
    const icons = {
      Ready: "fa-circle-check",
      Processing: "fa-clock",
      Archived: "fa-box-archive",
    };
    return icons[status] || "fa-circle";
  };

  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);

      const reportData = {
        name: `${reportType} - ${new Date().toLocaleDateString()}`,
        reportType,
        department,
        startDate,
        endDate,
        includeDrafts,
        generatedBy: user?.email || user?.name || "System",
      };

      const response = await apiService.post("/api/reports", reportData);

      if (response?.success) {
        toast.success(
          "Report generation started! It will appear in the list shortly.",
        );

        // Refresh reports list after a delay to show the new report
        setTimeout(async () => {
          try {
            const reportsResponse = await apiService.get("/api/reports");
            if (reportsResponse?.reports) {
              setReports(reportsResponse.reports);
            }
          } catch (err) {
            console.error("Failed to refresh reports", err);
          }
        }, 2500);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to delete this report?",
      );
      if (!confirmed) return;

      const response = await apiService.delete(`/api/reports/${reportId}`);

      if (response?.success) {
        toast.success("Report deleted successfully");
        setReports(reports.filter((r) => r._id !== reportId));
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  const handleResetFilters = () => {
    setReportType(
      reportTypes.length > 0 ? reportTypes[0].value : "Facility Usage Report",
    );
    setStartDate("");
    setEndDate("");
    setDepartment("All Departments");
    setIncludeDrafts(false);
    toast.success("Filters reset");
  };

  // Departments now provided by useDepartments()

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Analytics & Reports", icon: "fa-chart-line" },
        ]}
      />

      <div className="w-full p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#111418] mb-2">
              Analytics & Reporting
            </h1>
            <p className="text-gray-600">
              Generate comprehensive reports for facility usage, financials, and
              approval statistics. Export data in multiple formats for offline
              analysis.
            </p>
          </div>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2">
            <i className="fa-solid fa-bookmark"></i>
            Saved Reports
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stats.title1}</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.val1}
                </p>
              </div>
              <div
                className={`w-10 h-10 bg-${stats.color1}-100 rounded-lg flex items-center justify-center`}
              >
                <i
                  className={`fa-solid ${stats.icon1} text-${stats.color1}-600`}
                ></i>
              </div>
            </div>
            {stats.growth1 && (
              <p className="text-sm text-green-600 font-medium">
                <i className="fa-solid fa-arrow-up mr-1"></i>
                {stats.growth1}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stats.title2}</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.val2}
                </p>
              </div>
              <div
                className={`w-10 h-10 bg-${stats.color2}-100 rounded-lg flex items-center justify-center`}
              >
                <i
                  className={`fa-solid ${stats.icon2} text-${stats.color2}-600`}
                ></i>
              </div>
            </div>
            {stats.status2 && (
              <p className={`text-sm text-${stats.color2}-600 font-medium`}>
                {stats.status2}
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stats.title3}</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.val3}
                </p>
              </div>
              <div
                className={`w-10 h-10 bg-${stats.color3}-100 rounded-lg flex items-center justify-center`}
              >
                <i
                  className={`fa-solid ${stats.icon3} text-${stats.color3}-600`}
                ></i>
              </div>
            </div>
            <p className={`text-sm text-${stats.color3}-600 font-medium`}>
              {stats.growth3 && (
                <i className="fa-solid fa-arrow-trend-up mr-1"></i>
              )}
              {stats.growth3 || stats.status3}
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stats.title4}</p>
                <p className="text-3xl font-bold text-[#111418]">
                  {stats.val4}
                </p>
              </div>
              <div
                className={`w-10 h-10 bg-${stats.color4}-100 rounded-lg flex items-center justify-center`}
              >
                <i
                  className={`fa-solid ${stats.icon4} text-${stats.color4}-600`}
                ></i>
              </div>
            </div>
            {stats.status4 && (
              <p className={`text-sm text-${stats.color4}-600 font-medium`}>
                {stats.status4}
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Recharts Visualization */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <h3 className="text-xl font-bold text-[#111418] mb-4">
            {reportType} Overview
          </h3>
          <div className="w-full h-[350px]">
            {loadingAnalytics ? (
              <div className="w-full h-full flex items-center justify-center">
                <div role="status" className="animate-spin text-blue-600">
                  <i className="fa-solid fa-circle-notch text-3xl"></i>
                  <span className="sr-only">Loading...</span>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {reportType === "Facility Usage Report" ? (
                  <AreaChart
                    data={datasets.facilityData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorUsage"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8884d8"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8884d8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorMaint"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#82ca9d"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#82ca9d"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="usage"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorUsage)"
                      name="Usage (%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="maintenance"
                      stroke="#82ca9d"
                      fillOpacity={1}
                      fill="url(#colorMaint)"
                      name="Maintenance (hrs)"
                    />
                  </AreaChart>
                ) : reportType === "Financial Report" ? (
                  <LineChart
                    data={datasets.financialData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      activeDot={{ r: 8 }}
                      name="Revenue ($)"
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#ef4444"
                      strokeWidth={3}
                      name="Expenses ($)"
                    />
                  </LineChart>
                ) : reportType === "Attendance Report" ? (
                  <BarChart
                    data={datasets.attendanceData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Legend />
                    <Bar
                      dataKey="present"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      name="Present"
                    />
                    <Bar
                      dataKey="absent"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      name="Absent"
                    />
                    <Bar
                      dataKey="late"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                      name="Late"
                    />
                  </BarChart>
                ) : (
                  <BarChart
                    data={datasets.approvalData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: "transparent" }} />
                    <Legend />
                    <Bar
                      dataKey="approved"
                      stackId="a"
                      fill="#10b981"
                      name="Approved"
                    />
                    <Bar
                      dataKey="pending"
                      stackId="a"
                      fill="#f59e0b"
                      name="Pending"
                    />
                    <Bar
                      dataKey="rejected"
                      stackId="a"
                      fill="#ef4444"
                      name="Rejected"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Main Content - Report Configuration and Recent Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Report Configuration Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-sliders text-blue-600"></i>
                </div>
                <h3 className="text-lg font-bold text-[#111418]">
                  Report Configuration
                </h3>
              </div>

              <div className="space-y-4">
                {/* Report Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    disabled={loadingReportTypes}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingReportTypes ? (
                      <option>Loading report types...</option>
                    ) : (
                      reportTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="mm/c/□"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="mm/c/□"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option>All Departments</option>
                    {departmentsLoading ? (
                      <option disabled>Loading departments...</option>
                    ) : (
                      departments.map((dept) => (
                        <option key={dept.id} value={dept.name}>
                          {dept.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Include Drafts */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeDrafts"
                    checked={includeDrafts}
                    onChange={(e) => setIncludeDrafts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="includeDrafts"
                    className="text-sm text-gray-700"
                  >
                    Include Drafts
                  </label>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingReport ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-wand-magic-sparkles"></i>
                      Generate Report
                    </>
                  )}
                </button>

                {/* Reset Filters */}
                <button
                  onClick={handleResetFilters}
                  className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Recent Reports Table */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#111418]">
                    Recent Reports
                  </h3>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <i className="fa-solid fa-list"></i>
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <i className="fa-solid fa-print"></i>
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Report Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Module
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date Generated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loadingReports ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3"></div>
                            <p className="text-sm text-gray-500">
                              Loading reports...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <i className="fa-solid fa-folder-open text-4xl text-gray-400 mb-3"></i>
                            <p className="text-sm text-gray-500">
                              {searchQuery
                                ? "No reports match your search"
                                : "No reports generated yet"}
                            </p>
                            {!searchQuery && (
                              <p className="text-xs text-gray-400 mt-1">
                                Use the configuration panel to generate your
                                first report
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredReports.map((report) => (
                        <tr key={report._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 ${report.iconColor} rounded-lg flex items-center justify-center`}
                              >
                                <i className={`fa-solid ${report.icon}`}></i>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {report.name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  ID: #{report._id.slice(-8).toUpperCase()}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">
                              {report.module}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">
                              {new Date(report.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                report.status,
                              )}`}
                            >
                              <i
                                className={`fa-solid ${getStatusIcon(
                                  report.status,
                                )}`}
                              ></i>
                              {report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Report"
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                              <button
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Download Report"
                              >
                                <i className="fa-solid fa-download"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Report"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {filteredReports.length > 0 ? "1" : "0"} to{" "}
                  {filteredReports.length} of {reports.length} results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium">
                    1
                  </button>
                  <button
                    disabled
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
