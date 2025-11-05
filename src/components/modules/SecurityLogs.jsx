import React from "react";

const SecurityLogs = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">Security Logs</h2>
      <p className="text-secondary mb-4">
        Monitor system access, security events, and audit trails.
      </p>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Today's Logins</h5>
            <p className="h3 mb-0 text-primary">156</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Failed Attempts</h5>
            <p className="h3 mb-0 text-warning">8</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Security Alerts</h5>
            <p className="h3 mb-0 text-danger">2</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Active Sessions</h5>
            <p className="h3 mb-0 text-success">89</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Recent Security Events</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Successful Login</strong>
                <div className="small text-secondary">
                  user@example.com - 192.168.1.10
                </div>
              </div>
              <span className="small text-secondary">2 min ago</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong className="text-warning">Failed Login Attempt</strong>
                <div className="small text-secondary">
                  unknown@test.com - 10.0.0.25
                </div>
              </div>
              <span className="small text-secondary">15 min ago</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>User Logout</strong>
                <div className="small text-secondary">
                  admin@example.com - 192.168.1.5
                </div>
              </div>
              <span className="small text-secondary">1 hour ago</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong className="text-danger">Security Alert</strong>
                <div className="small text-secondary">
                  Unusual activity detected - Multiple login attempts
                </div>
              </div>
              <span className="small text-secondary">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="d-flex gap-2">
          <button className="btn btn-primary">View Full Logs</button>
          <button className="btn btn-outline-primary">Export Report</button>
        </div>
      </div>
    </div>
  );
};

export default SecurityLogs;
