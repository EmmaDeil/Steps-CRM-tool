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
  useAuth();
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
  const [customModules, setCustomModules] = useState([]);
  const [moduleSearch, setModuleSearch] = useState("");
  const customModuleOptions = [
    { value: "Attendance", label: "Attendance", icon: "fa-calendar-check" },
    { value: "Approvals", label: "Approvals", icon: "fa-thumbs-up" },
    { value: "Finance", label: "Finance", icon: "fa-dollar-sign" },
    {
      value: "Leave",
      label: "Leave Requests",
      icon: "fa-person-walking-arrow-right",
    },
    { value: "Travel", label: "Travel Requests", icon: "fa-plane" },
    {
      value: "Materials",
      label: "Material Requests",
      icon: "fa-boxes-stacked",
    },
  ];
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

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

  const [reportTypes, setReportTypes] = useState([]);
  const [loadingReportTypes, setLoadingReportTypes] = useState(true);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [expiringInventory, setExpiringInventory] = useState([]);
  const [loadingInventorySummary, setLoadingInventorySummary] = useState(true);

  // --- Dynamic Datasets for Charts ---
  const [datasets, setDatasets] = useState({
    facilityData: [],
    financialData: [],
    attendanceData: [],
    approvalData: [],
    customData: [],
    moduleDetails: {},
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
            customData: response.data.customData || [],
            moduleDetails: response.data.moduleDetails || {},
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

  useEffect(() => {
    const fetchInventoryAnalytics = async () => {
      try {
        setLoadingInventorySummary(true);
        const [summary, expiring] = await Promise.all([
          apiService.get("/api/inventory/summary?days=30"),
          apiService.get("/api/inventory/alerts/expiring?days=30"),
        ]);

        setInventorySummary(summary || null);
        setExpiringInventory(expiring?.items || []);
      } catch (err) {
        console.error("Failed to load inventory summary data", err);
      } finally {
        setLoadingInventorySummary(false);
      }
    };

    fetchInventoryAnalytics();
  }, []);

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
            includeDrafts: includeDrafts || undefined,
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
  }, [reportType, department, startDate, endDate, includeDrafts]);

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
          status2:
            datasets.stats?.financialExpenses !== "$0" ? "Tracking" : "No data",
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
          status4:
            datasets.stats?.avgTransaction !== "$0" ? "Active" : "No data",
        };
      case "Attendance Report":
        return {
          title1: "Avg Attendance",
          val1: datasets.stats?.avgAttendance || "0%",
          icon1: "fa-user-check",
          color1: "green",
          growth1:
            datasets.stats?.avgAttendance &&
            datasets.stats.avgAttendance !== "0%"
              ? "Tracking"
              : "No data",
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
          growth3:
            (datasets.stats?.lateArrivals || 0) > 0 ? "Tracking" : "No data",
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
      case "Custom Report": {
        const filteredCustom =
          customModules.length > 0
            ? (datasets.customData || []).filter((d) =>
                customModules.includes(d.name),
              )
            : datasets.customData || [];
        const customTotal = filteredCustom.reduce(
          (sum, d) => sum + (d.total || 0),
          0,
        );
        const customActive = filteredCustom.reduce(
          (sum, d) => sum + (d.active || 0),
          0,
        );
        const customIssues = filteredCustom.reduce(
          (sum, d) => sum + (d.issues || 0),
          0,
        );
        const moduleCount = filteredCustom.length;
        return {
          title1: "Total Records",
          val1: customTotal,
          icon1: "fa-database",
          color1: "blue",
          growth1:
            customTotal > 0
              ? `Across ${moduleCount} module${moduleCount !== 1 ? "s" : ""}`
              : "No data",
          title2: "Active/Approved",
          val2: customActive,
          icon2: "fa-circle-check",
          color2: "green",
          status2:
            customTotal > 0
              ? `${((customActive / customTotal) * 100).toFixed(0)}% success rate`
              : "No data",
          title3: "Issues/Rejected",
          val3: customIssues,
          icon3: "fa-triangle-exclamation",
          color3: "red",
          growth3:
            customTotal > 0
              ? `${((customIssues / customTotal) * 100).toFixed(0)}% issue rate`
              : "No data",
          title4: "Modules Tracked",
          val4: moduleCount,
          icon4: "fa-cubes",
          color4: "purple",
          status4: moduleCount > 0 ? "Active" : "No modules",
        };
      }
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

  const handleDeleteReport = async (reportId) => {
    try {
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
    setCustomModules([]);
    setModuleSearch("");
    toast.success("Filters reset");
  };

  // Departments now provided by useDepartments()

  const handleExport = (format) => {
    setShowExportMenu(false);
    const exportData =
      filteredReports.length > 0
        ? filteredReports.map((r) => ({
            Name: r.name,
            Module: r.module || "",
            Type: r.reportType || "",
            Status: r.status || "",
            Department: r.department || "",
            DateGenerated: r.createdAt
              ? new Date(r.createdAt).toLocaleDateString()
              : "",
          }))
        : [{ Info: "No reports to export" }];

    const filename = `analytics-export-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(","),
        ...exportData.map((row) =>
          headers
            .map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`)
            .join(","),
        ),
      ];
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as CSV");
    } else if (format === "json") {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as JSON");
    } else if (format === "pdf") {
      // Print-based PDF export
      const printContent = `
        <html><head><title>${filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p { font-size: 12px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
        </style></head><body>
        <h1>Analytics & Reporting Export</h1>
        <p>Report Type: ${reportType} | Department: ${department} | Exported: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead><tr>${Object.keys(exportData[0])
            .map((h) => `<th>${h}</th>`)
            .join("")}</tr></thead>
          <tbody>${exportData
            .map(
              (row) =>
                `<tr>${Object.values(row)
                  .map((v) => `<td>${v}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody>
        </table>
        </body></html>`;
      const win = window.open("", "_blank");
      win.document.write(printContent);
      win.document.close();
      win.print();
      toast.success("PDF print dialog opened");
    }
  };

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
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
            >
              <i className="fa-solid fa-file-export"></i>
              Export
              <i className="fa-solid fa-chevron-down text-xs"></i>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-48 py-1">
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <i className="fa-solid fa-file-csv text-green-600"></i>
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <i className="fa-solid fa-file-code text-blue-600"></i>
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                >
                  <i className="fa-solid fa-file-pdf text-red-600"></i>
                  Export as PDF
                </button>
              </div>
            )}
          </div>
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

        {/* Inventory Summary Cards (moved from Inventory Management) */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#111418]">
              Inventory Overview
            </h3>
            <span className="text-xs text-gray-500">
              Last 30-day expiry window
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              {
                label: "Total Items",
                value: inventorySummary?.totalItems ?? 0,
                icon: "fa-boxes-stacked",
                color: "text-blue-600 bg-blue-100",
              },
              {
                label: "Total Units",
                value: inventorySummary?.totalUnits ?? 0,
                icon: "fa-layer-group",
                color: "text-green-600 bg-green-100",
              },
              {
                label: "Low Stock Alerts",
                value: inventorySummary?.lowStock ?? 0,
                icon: "fa-triangle-exclamation",
                color: "text-amber-600 bg-amber-100",
              },
              {
                label: "Expiring Soon",
                value: inventorySummary?.expiringSoon ?? 0,
                icon: "fa-hourglass-end",
                color: "text-red-600 bg-red-100",
              },
            ].map((card) => (
              <div
                key={card.label}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{card.label}</p>
                    <p className="text-2xl font-bold text-[#111418] mt-1">
                      {loadingInventorySummary ? "..." : card.value}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}
                  >
                    <i className={`fa-solid ${card.icon}`}></i>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {expiringInventory.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700 mb-2">
                <i className="fa-solid fa-bell mr-2"></i>
                Expiry Notification: {expiringInventory.length} item(s) have
                stock expiring within 30 days.
              </p>
              <div className="space-y-1">
                {expiringInventory.slice(0, 3).map((item) => (
                  <p key={item._id} className="text-sm text-red-700">
                    {item.name} ({item.itemId}) -{" "}
                    {new Date(item.nextExpiry).toLocaleDateString()}
                  </p>
                ))}
              </div>
            </div>
          )}
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
              (() => {
                const currentData =
                  reportType === "Facility Usage Report"
                    ? datasets.facilityData
                    : reportType === "Financial Report"
                      ? datasets.financialData
                      : reportType === "Attendance Report"
                        ? datasets.attendanceData
                        : reportType === "Custom Report"
                          ? customModules.length > 0
                            ? (datasets.customData || []).filter((d) =>
                                customModules.includes(d.name),
                              )
                            : datasets.customData
                          : datasets.approvalData;

                return !currentData || currentData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                    <i className="fa-solid fa-chart-simple text-5xl mb-3"></i>
                    <p className="text-lg font-medium">No data available</p>
                    <p className="text-sm mt-1">
                      Data will appear here once records are added to the
                      system.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={350} minWidth={0}>
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
                    ) : reportType === "Custom Report" ? (
                      <BarChart
                        data={
                          customModules.length > 0
                            ? (datasets.customData || []).filter((d) =>
                                customModules.includes(d.name),
                              )
                            : datasets.customData
                        }
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip cursor={{ fill: "transparent" }} />
                        <Legend />
                        <Bar
                          dataKey="total"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                          name="Total"
                        />
                        <Bar
                          dataKey="active"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          name="Active/Approved"
                        />
                        <Bar
                          dataKey="issues"
                          fill="#ef4444"
                          radius={[4, 4, 0, 0]}
                          name="Issues/Rejected"
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
                );
              })()
            )}
          </div>
        </div>

        {/* Per-Module Detailed Stats for Custom Report */}
        {reportType === "Custom Report" &&
          (() => {
            const moduleDetails = datasets.moduleDetails || {};
            const modulesToShow =
              customModules.length > 0
                ? customModules
                : Object.keys(moduleDetails);
            if (modulesToShow.length === 0) return null;

            const colorMap = {
              blue: {
                bg: "bg-blue-50",
                text: "text-blue-600",
                icon: "bg-blue-100",
              },
              green: {
                bg: "bg-green-50",
                text: "text-green-600",
                icon: "bg-green-100",
              },
              red: {
                bg: "bg-red-50",
                text: "text-red-600",
                icon: "bg-red-100",
              },
              orange: {
                bg: "bg-orange-50",
                text: "text-orange-600",
                icon: "bg-orange-100",
              },
            };

            return (
              <div className="space-y-4">
                {modulesToShow.map((modName) => {
                  const detail = moduleDetails[modName];
                  if (!detail) return null;
                  const opt = customModuleOptions.find(
                    (o) => o.value === modName,
                  );
                  return (
                    <div
                      key={modName}
                      className="bg-white rounded-lg border border-gray-200 p-5"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <i
                            className={`fa-solid ${opt?.icon || "fa-cube"} text-blue-600 text-sm`}
                          ></i>
                        </div>
                        <h4 className="text-base font-bold text-[#111418]">
                          {opt?.label || modName}
                        </h4>
                        {detail.rate && (
                          <span className="ml-auto text-sm font-medium text-gray-500">
                            {detail.rateLabel}:{" "}
                            <span className="text-blue-600 font-bold">
                              {detail.rate}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {detail.stats.map((stat, idx) => {
                          const colors = colorMap[stat.color] || colorMap.blue;
                          return (
                            <div
                              key={idx}
                              className={`${colors.bg} rounded-lg p-3`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <div
                                  className={`w-6 h-6 ${colors.icon} rounded flex items-center justify-center`}
                                >
                                  <i
                                    className={`fa-solid ${stat.icon} ${colors.text} text-xs`}
                                  ></i>
                                </div>
                                <span className="text-xs font-medium text-gray-500">
                                  {stat.label}
                                </span>
                              </div>
                              <p className={`text-lg font-bold ${colors.text}`}>
                                {stat.value}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
                      reportTypes.map((type, idx) => (
                        <option
                          key={`${type.value || type.label || "report"}-${idx}`}
                          value={type.value}
                        >
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
                      departments.map((dept, idx) => (
                        <option
                          key={dept._id || dept.id || `${dept.name}-${idx}`}
                          value={dept.name}
                        >
                          {dept.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Custom Report Module Selector */}
                {reportType === "Custom Report" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modules to Analyze
                    </label>
                    <div className="relative">
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 bg-white">
                        {/* Selected module tags */}
                        <div className="flex flex-wrap gap-1 mb-1">
                          {customModules.map((mod) => {
                            const opt = customModuleOptions.find(
                              (o) => o.value === mod,
                            );
                            return (
                              <span
                                key={mod}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                              >
                                <i
                                  className={`fa-solid ${opt?.icon || "fa-cube"} text-[10px]`}
                                ></i>
                                {opt?.label || mod}
                                <button
                                  onClick={() =>
                                    setCustomModules(
                                      customModules.filter((m) => m !== mod),
                                    )
                                  }
                                  className="ml-0.5 hover:text-blue-900"
                                >
                                  <i className="fa-solid fa-xmark text-[10px]"></i>
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        {/* Search input */}
                        <input
                          type="text"
                          value={moduleSearch}
                          onChange={(e) => setModuleSearch(e.target.value)}
                          placeholder={
                            customModules.length === 0
                              ? "Search modules... (all selected by default)"
                              : "Add more modules..."
                          }
                          className="w-full text-sm outline-none bg-transparent"
                        />
                      </div>
                      {/* Dropdown options */}
                      {moduleSearch && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {customModuleOptions
                            .filter(
                              (opt) =>
                                !customModules.includes(opt.value) &&
                                opt.label
                                  .toLowerCase()
                                  .includes(moduleSearch.toLowerCase()),
                            )
                            .map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  setCustomModules([
                                    ...customModules,
                                    opt.value,
                                  ]);
                                  setModuleSearch("");
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-2 text-sm transition-colors"
                              >
                                <i
                                  className={`fa-solid ${opt.icon} text-gray-500 w-4`}
                                ></i>
                                {opt.label}
                              </button>
                            ))}
                          {customModuleOptions.filter(
                            (opt) =>
                              !customModules.includes(opt.value) &&
                              opt.label
                                .toLowerCase()
                                .includes(moduleSearch.toLowerCase()),
                          ).length === 0 && (
                            <p className="px-3 py-2 text-sm text-gray-400">
                              No matching modules
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {customModules.length > 0 && (
                      <button
                        onClick={() => {
                          setCustomModules([]);
                          setModuleSearch("");
                        }}
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        Clear selection (show all)
                      </button>
                    )}
                  </div>
                )}

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
                                onClick={() => setSelectedReport(report)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Report"
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                              <button
                                onClick={() => {
                                  const data = {
                                    Name: report.name,
                                    Module: report.module || "",
                                    Type: report.reportType || "",
                                    Status: report.status || "",
                                    Department: report.department || "",
                                    DateGenerated: report.createdAt
                                      ? new Date(
                                          report.createdAt,
                                        ).toLocaleDateString()
                                      : "",
                                    GeneratedBy: report.generatedBy || "",
                                    ...(report.data || {}),
                                  };
                                  const blob = new Blob(
                                    [JSON.stringify(data, null, 2)],
                                    { type: "application/json" },
                                  );
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `${report.name?.replace(/\s+/g, "-") || "report"}.json`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  toast.success("Report downloaded");
                                }}
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

      {/* View Report Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${selectedReport.iconColor || "bg-blue-100 text-blue-600"} rounded-lg flex items-center justify-center`}
                >
                  <i
                    className={`fa-solid ${selectedReport.icon || "fa-file-lines"}`}
                  ></i>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#111418]">
                    {selectedReport.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    ID: #{selectedReport._id?.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Report Type</p>
                  <p className="text-sm font-medium text-[#111418]">
                    {selectedReport.reportType || "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Module</p>
                  <p className="text-sm font-medium text-[#111418]">
                    {selectedReport.module || "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-sm font-medium text-[#111418]">
                    {selectedReport.department || "All Departments"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReport.status)}`}
                  >
                    <i
                      className={`fa-solid ${getStatusIcon(selectedReport.status)}`}
                    ></i>
                    {selectedReport.status}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Generated By</p>
                  <p className="text-sm font-medium text-[#111418]">
                    {selectedReport.generatedBy || "—"}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Date Generated</p>
                  <p className="text-sm font-medium text-[#111418]">
                    {selectedReport.createdAt
                      ? new Date(selectedReport.createdAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
                {selectedReport.startDate && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Date Range</p>
                    <p className="text-sm font-medium text-[#111418]">
                      {new Date(selectedReport.startDate).toLocaleDateString()}{" "}
                      –{" "}
                      {selectedReport.endDate
                        ? new Date(selectedReport.endDate).toLocaleDateString()
                        : "Present"}
                    </p>
                  </div>
                )}
              </div>

              {/* Report Data */}
              {selectedReport.data &&
                Object.keys(selectedReport.data).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#111418] mb-3">
                      Report Data
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedReport.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  const data = {
                    Name: selectedReport.name,
                    Module: selectedReport.module || "",
                    Type: selectedReport.reportType || "",
                    Status: selectedReport.status || "",
                    Department: selectedReport.department || "",
                    DateGenerated: selectedReport.createdAt
                      ? new Date(selectedReport.createdAt).toLocaleDateString()
                      : "",
                    GeneratedBy: selectedReport.generatedBy || "",
                    ...(selectedReport.data || {}),
                  };
                  const blob = new Blob([JSON.stringify(data, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${selectedReport.name?.replace(/\s+/g, "-") || "report"}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("Report downloaded");
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center gap-2 text-sm"
              >
                <i className="fa-solid fa-download"></i>
                Download
              </button>
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
