import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";

const API_BASE_URL = "https://attendance-app-swart-iota.vercel.app";

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try multiple possible endpoints
        const endpoints = [
          `${API_BASE_URL}/api/attendance`,
          `${API_BASE_URL}/api/employees`,
          `${API_BASE_URL}/attendance`,
          `${API_BASE_URL}/`,
        ];

        let data = null;
        let lastError = null;

        // Try each endpoint until one works
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint);
            if (response.ok) {
              data = await response.json();
              break;
            }
            lastError = new Error(
              `Endpoint ${endpoint} returned ${response.status}`
            );
          } catch (err) {
            lastError = err;
          }
        }

        if (!data) {
          throw lastError || new Error("All API endpoints failed");
        }

        setAttendanceData(data);
      } catch (err) {
        setError(err.message);
        toast.error("Failed to connect to attendance backend");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div
          className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
          role="status"
        >
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-gray-600">Loading attendance data...</p>
      </div>
    );
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
    <div className="min-h-screen bg-gray-50">
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
                            }
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
              onClick={() => toast.info("Mark Attendance feature coming soon")}
            >
              Mark Attendance
            </button>
            <button
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              onClick={() => toast.info("View Reports feature coming soon")}
            >
              View Reports
            </button>
            <button
              className="px-4 py-2 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              onClick={() => toast.info("Export Data feature coming soon")}
            >
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
