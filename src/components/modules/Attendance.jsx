import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import AuthContext from "../../context/AuthContext";
import ModuleLoader from "../common/ModuleLoader";

import axios from "axios";

const Attendance = () => {
  const { user: authUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markForm, setMarkForm] = useState({
    name: "",
    employeeId: "",
    status: "present",
  });
  const [isMarking, setIsMarking] = useState(false);

  // Determine if the user has elevated permissions to view reports/export data
  const isElevatedUser =
    authUser?.role === "Admin" ||
    authUser?.role === "Administrator" ||
    authUser?.department === "HR" ||
    authUser?.department === "Human Resources";

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Bypass the global apiService to avoid the strict 10s interceptor timeout
      const token = localStorage.getItem("authToken");
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

      const response = await axios.get(`${API_BASE_URL}/api/attendance`, {
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.data) {
        throw new Error("Failed to load attendance data");
      }

      setAttendanceData(response.data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch attendance");
      toast.error("Failed to connect to attendance backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const handleExportData = () => {
    if (!attendanceData?.records || attendanceData.records.length === 0) {
      toast.error("No attendance data to export.");
      return;
    }
    const headers = ["Name", "Employee ID", "Status", "Check-in Time"];
    const csvRows = [headers.join(",")];
    attendanceData.records.forEach((record) => {
      const time = record.checkInTime
        ? new Date(record.checkInTime).toLocaleString()
        : "";
      csvRows.push(
        `"${record.name || ""}","${record.employeeId || ""}","${record.status || ""}","${time}"`,
      );
    });
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance data exported successfully");
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!markForm.name || !markForm.employeeId) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      setIsMarking(true);
      const token = localStorage.getItem("authToken");
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

      await axios.post(`${API_BASE_URL}/api/attendance`, markForm, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      toast.success("Attendance marked successfully");
      setShowMarkModal(false);
      setMarkForm({ name: "", employeeId: "", status: "present" });
      await fetchAttendanceData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to mark attendance");
    } finally {
      setIsMarking(false);
    }
  };

  if (loading) {
    return <ModuleLoader moduleName="Attendance" />;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative">
          <h5 className="font-bold text-lg mb-2">❌ Unable to Connect</h5>
          <p className="mb-2">Failed to connect to the attendance backend.</p>
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <hr className="my-3 border-red-200" />
          <button
            className="px-3 py-1.5 text-sm bg-white text-red-700 border border-red-400 rounded hover:bg-red-50 transition-colors"
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Calculate statistics from the attendance data
  const stats = {
    present: attendanceData?.presentCount || 0,
    onLeave: attendanceData?.leaveCount || 0,
    absent: attendanceData?.absentCount || 0,
    late: attendanceData?.lateCount || 0,
    total: attendanceData?.totalEmployees || 0,
  };

  const attendanceRate =
    stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Attendance", icon: "fa-calendar-check" },
        ]}
      />
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Present Today</h5>
            <p className="text-3xl font-bold mb-0 text-green-600">
              {stats.present}
            </p>
            <small className="text-green-600">
              {attendanceRate}% attendance rate
            </small>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">On Leave</h5>
            <p className="text-3xl font-bold mb-0 text-yellow-500">
              {stats.onLeave}
            </p>
            <small className="text-gray-600">Approved leaves</small>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Absent</h5>
            <p className="text-3xl font-bold mb-0 text-red-600">
              {stats.absent}
            </p>
            <small className="text-red-600">Unexcused</small>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Late Arrivals</h5>
            <p className="text-3xl font-bold mb-0 text-blue-500">
              {stats.late}
            </p>
            <small className="text-gray-600">Today</small>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-xl font-semibold mb-3">Today's Check-ins</h4>
          {attendanceData?.records && attendanceData.records.length > 0 ? (
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {attendanceData.records.map((record, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <strong className="text-gray-900">
                        {record.name || `Employee ${index + 1}`}
                      </strong>
                      <div className="text-sm text-gray-600">
                        {record.employeeId
                          ? `Employee ID: ${record.employeeId}`
                          : ""}
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          record.status === "present" ||
                          record.status === "on-time"
                            ? "bg-green-100 text-green-800"
                            : record.status === "late"
                              ? "bg-yellow-100 text-yellow-800"
                              : record.status === "leave" ||
                                  record.status === "on-leave"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {record.status
                          ? record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)
                          : "Unknown"}
                      </span>
                      {record.checkInTime && (
                        <div className="text-sm text-gray-600 mt-1">
                          Check-in:{" "}
                          {new Date(record.checkInTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            },
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg">
              No attendance records available for today.
            </div>
          )}
        </div>

        <div className="mt-4">
          <h4 className="text-xl font-semibold mb-3">Quick Actions</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={() => setShowMarkModal(true)}
            >
              Mark Attendance
            </button>
            {isElevatedUser && (
              <>
                <button
                  className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  onClick={() =>
                    navigate("/home/12", {
                      state: {
                        defaultSearch: "Attendance",
                        defaultReport: "Attendance Report",
                      },
                    })
                  }
                >
                  View Reports
                </button>
                <button
                  className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                  onClick={handleExportData}
                >
                  Export Data
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showMarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                Mark Attendance
              </h3>
              <button
                onClick={() => setShowMarkModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <form onSubmit={handleMarkAttendance} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee Name *
                </label>
                <input
                  type="text"
                  required
                  value={markForm.name}
                  onChange={(e) =>
                    setMarkForm({ ...markForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee ID *
                </label>
                <input
                  type="text"
                  required
                  value={markForm.employeeId}
                  onChange={(e) =>
                    setMarkForm({ ...markForm, employeeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. EMP-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={markForm.status}
                  onChange={(e) =>
                    setMarkForm({ ...markForm, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="present">Present (On Time)</option>
                  <option value="late">Late</option>
                  <option value="leave">On Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMarkModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMarking}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 transition-colors"
                >
                  {isMarking ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
