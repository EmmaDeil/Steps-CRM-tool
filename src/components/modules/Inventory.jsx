import React from "react";

const Inventory = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">Inventory Management</h2>
      <p className="text-secondary mb-4">
        Track and manage your organization's inventory and stock levels.
      </p>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Total Items</h5>
            <p className="h3 mb-0 text-primary">1,234</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Low Stock</h5>
            <p className="h3 mb-0 text-warning">23</p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Out of Stock</h5>
            <p className="h3 mb-0 text-danger">5</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Recent Activity</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <span>Office Supplies - Restock</span>
              <span className="text-secondary">2 hours ago</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <span>IT Equipment - New Purchase</span>
              <span className="text-secondary">5 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
