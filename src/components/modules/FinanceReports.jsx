import React from "react";

const FinanceReports = () => {
  return (
    <div className="p-4">
      <h2 className="mb-3">Finance Reports</h2>
      <p className="text-secondary mb-4">
        View and generate financial reports, budgets, and analytics.
      </p>

      <div className="row g-3">
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Total Revenue</h5>
            <p className="h3 mb-0 text-success">$245,890</p>
            <small className="text-success">+12% from last month</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Total Expenses</h5>
            <p className="h3 mb-0 text-danger">$178,420</p>
            <small className="text-danger">+5% from last month</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Net Profit</h5>
            <p className="h3 mb-0 text-primary">$67,470</p>
            <small className="text-success">+23% from last month</small>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h4>Available Reports</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Monthly Financial Statement</strong>
                <div className="small text-secondary">October 2025</div>
              </div>
              <button className="btn btn-sm btn-outline-primary">
                Download
              </button>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Quarterly Budget Report</strong>
                <div className="small text-secondary">Q3 2025</div>
              </div>
              <button className="btn btn-sm btn-outline-primary">
                Download
              </button>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Tax Summary Report</strong>
                <div className="small text-secondary">Year 2025</div>
              </div>
              <button className="btn btn-sm btn-outline-primary">
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button className="btn btn-primary">Generate New Report</button>
      </div>
    </div>
  );
};

export default FinanceReports;
