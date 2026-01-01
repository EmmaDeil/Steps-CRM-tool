import React from "react";
import Breadcrumb from "../Breadcrumb";

const FM = () => {
  return (
    <div className="w-full">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench" },
        ]}
      />
      <h2 className="mb-3">Facility Maintenance</h2>
      <p className="text-secondary mb-4">
        Track maintenance requests, schedules, and facility management.
      </p>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Open Tickets</h5>
            <p className="h3 mb-0 text-warning">12</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">In Progress</h5>
            <p className="h3 mb-0 text-info">7</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Completed</h5>
            <p className="h3 mb-0 text-success">143</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Urgent</h5>
            <p className="h3 mb-0 text-danger">2</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Maintenance Tickets</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>AC Repair - Floor 3</strong>
                <div className="small text-secondary">Priority: High</div>
              </div>
              <span className="badge bg-warning">Open</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Plumbing Issue - Restroom B2</strong>
                <div className="small text-secondary">Priority: Medium</div>
              </div>
              <span className="badge bg-info">In Progress</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Light Replacement - Parking Lot</strong>
                <div className="small text-secondary">Priority: Low</div>
              </div>
              <span className="badge bg-warning">Open</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button className="btn btn-primary">Create New Ticket</button>
      </div>
    </div>
  );
};

export default FM;
