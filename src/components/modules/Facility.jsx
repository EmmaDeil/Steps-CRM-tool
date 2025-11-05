import React from "react";

const Facility = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">Facility Management</h2>
      <p className="text-secondary mb-4">
        Manage facilities, spaces, and maintenance operations.
      </p>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Total Facilities</h5>
            <p className="h3 mb-0 text-primary">8</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Active Bookings</h5>
            <p className="h3 mb-0 text-success">24</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Maintenance Due</h5>
            <p className="h3 mb-0 text-warning">5</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Utilization Rate</h5>
            <p className="h3 mb-0 text-info">78%</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Facility Status</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Conference Room A</strong>
                <div className="small text-secondary">
                  Floor 3 - Capacity: 20
                </div>
              </div>
              <span className="badge bg-success">Available</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Training Hall B</strong>
                <div className="small text-secondary">
                  Floor 2 - Capacity: 50
                </div>
              </div>
              <span className="badge bg-danger">Booked</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Meeting Room C</strong>
                <div className="small text-secondary">
                  Floor 1 - Capacity: 10
                </div>
              </div>
              <span className="badge bg-warning">Maintenance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="d-flex gap-2">
          <button className="btn btn-primary">Book Facility</button>
          <button className="btn btn-outline-primary">View Calendar</button>
        </div>
      </div>
    </div>
  );
};

export default Facility;
