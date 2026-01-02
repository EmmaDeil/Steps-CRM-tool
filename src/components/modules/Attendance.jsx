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
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3 text-secondary">Loading attendance data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="alert alert-danger">
          <h5 className="alert-heading">❌ Unable to Connect</h5>
          <p className="mb-2">Failed to connect to the attendance backend.</p>
          <p className="mb-0 small text-secondary">{error}</p>
          <hr />
          <button
            className="btn btn-sm btn-outline-danger"
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
        <div className="row g-3 mt-2">
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Present Today</h5>
              <p className="h3 mb-0 text-success">{stats.present}</p>
              <small className="text-success">
                {attendanceRate}% attendance rate
              </small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">On Leave</h5>
              <p className="h3 mb-0 text-warning">{stats.onLeave}</p>
              <small className="text-secondary">Approved leaves</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Absent</h5>
              <p className="h3 mb-0 text-danger">{stats.absent}</p>
              <small className="text-danger">Unexcused</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Late Arrivals</h5>
              <p className="h3 mb-0 text-info">{stats.late}</p>
              <small className="text-secondary">Today</small>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4>Today's Check-ins</h4>
          {attendanceData?.records && attendanceData.records.length > 0 ? (
            <div className="list-group">
              {attendanceData.records.map((record, index) => (
                <div key={index} className="list-group-item">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{record.name || `Employee ${index + 1}`}</strong>
                      <div className="small text-secondary">
                        {record.employeeId
                          ? `Employee ID: ${record.employeeId}`
                          : ""}
                      </div>
                    </div>
                    <div className="text-end">
                      <span
                        className={`badge bg-${
                          record.status === "present" ||
                          record.status === "on-time"
                            ? "success"
                            : record.status === "late"
                            ? "warning"
                            : record.status === "leave" ||
                              record.status === "on-leave"
                            ? "info"
                            : "danger"
                        }`}
                      >
                        {record.status
                          ? record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)
                          : "Unknown"}
                      </span>
                      {record.checkInTime && (
                        <div className="small text-secondary mt-1">
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
            <div className="alert alert-info">
              No attendance records available for today.
            </div>
          )}
        </div>

        <div className="mt-4">
          <h4>Quick Actions</h4>
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary"
              onClick={() => toast.info("Mark Attendance feature coming soon")}
            >
              Mark Attendance
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => toast.info("View Reports feature coming soon")}
            >
              View Reports
            </button>
            <button
              className="btn btn-outline-primary"
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
