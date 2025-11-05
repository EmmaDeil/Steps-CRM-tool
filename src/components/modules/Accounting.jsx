import React from "react";

const Accounting = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">Accounting Module</h2>
      <p className="text-secondary mb-4">
        Manage financial transactions, accounts, and bookkeeping.
      </p>

      <div className="row g-3">
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Total Income</h5>
            <p className="h3 mb-0 text-success">$325,450</p>
            <small className="text-success">+15% this month</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Total Expenses</h5>
            <p className="h3 mb-0 text-danger">$198,320</p>
            <small className="text-danger">+8% this month</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Accounts Payable</h5>
            <p className="h3 mb-0 text-warning">$45,670</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5 className="mb-2">Accounts Receivable</h5>
            <p className="h3 mb-0 text-info">$78,920</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Recent Transactions</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Payment Received - Client ABC</strong>
                <div className="small text-secondary">Invoice #12345</div>
              </div>
              <span className="text-success fw-bold">+$12,500</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Vendor Payment - Office Supplies</strong>
                <div className="small text-secondary">Invoice #67890</div>
              </div>
              <span className="text-danger fw-bold">-$3,450</span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Salary Payment - Batch Processing</strong>
                <div className="small text-secondary">Monthly Payroll</div>
              </div>
              <span className="text-danger fw-bold">-$85,000</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="d-flex gap-2">
          <button className="btn btn-primary">New Transaction</button>
          <button className="btn btn-outline-primary">View Reports</button>
          <button className="btn btn-outline-primary">Export Data</button>
        </div>
      </div>
    </div>
  );
};

export default Accounting;
