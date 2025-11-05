import React from "react";

const HRManagement = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">HR Management</h2>
      <p className="text-secondary mb-4">
        Manage employee records, attendance, and human resources.
      </p>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Total Employees</h5>
            <p className="h3 mb-0 text-primary">247</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Present Today</h5>
            <p className="h3 mb-0 text-success">235</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">On Leave</h5>
            <p className="h3 mb-0 text-warning">8</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Absent</h5>
            <p className="h3 mb-0 text-danger">4</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Quick Actions</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-primary">Add Employee</button>
          <button className="btn btn-outline-primary">View Attendance</button>
          <button className="btn btn-outline-primary">Leave Requests</button>
        </div>
      </div>

      <div className="mt-4">
        <h4>Recent Updates</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <span>John Doe - Leave Approved</span>
              <span className="text-secondary">1 hour ago</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <span>Jane Smith - New Employee Added</span>
              <span className="text-secondary">3 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRManagement;
