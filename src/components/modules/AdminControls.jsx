import React from "react";

const AdminControls = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">Admin Controls</h2>
      <p className="text-secondary mb-4">
        System configuration, user management, and administrative settings.
      </p>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card p-3">
            <h5 className="mb-3">User Management</h5>
            <div className="d-flex flex-column gap-2">
              <button className="btn btn-outline-primary">Manage Users</button>
              <button className="btn btn-outline-primary">Manage Roles</button>
              <button className="btn btn-outline-primary">
                Manage Permissions
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-3">
            <h5 className="mb-3">System Settings</h5>
            <div className="d-flex flex-column gap-2">
              <button className="btn btn-outline-primary">
                General Settings
              </button>
              <button className="btn btn-outline-primary">
                Security Settings
              </button>
              <button className="btn btn-outline-primary">
                Email Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-3">
        <div className="col-md-6">
          <div className="card p-3">
            <h5 className="mb-3">Database Management</h5>
            <div className="d-flex flex-column gap-2">
              <button className="btn btn-outline-primary">
                Backup Database
              </button>
              <button className="btn btn-outline-primary">
                Restore Database
              </button>
              <button className="btn btn-outline-primary">
                Database Stats
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card p-3">
            <h5 className="mb-3">System Maintenance</h5>
            <div className="d-flex flex-column gap-2">
              <button className="btn btn-outline-primary">Clear Cache</button>
              <button className="btn btn-outline-primary">System Logs</button>
              <button className="btn btn-outline-primary">Update System</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="card p-3 bg-danger bg-opacity-10">
          <h5 className="text-danger mb-3">Danger Zone</h5>
          <div className="d-flex flex-column gap-2">
            <button className="btn btn-outline-danger">
              Reset All Settings
            </button>
            <button className="btn btn-danger">Factory Reset</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminControls;
