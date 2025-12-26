import React, { useState, useEffect } from "react";
import { apiService } from "../../services/api";
import Pagination from "../Pagination";
import Skeleton from "../Skeleton";
import EmptyState from "../EmptyState";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";

const Finance = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(
        "/api/purchase-orders/pending-payment"
      );
      setPendingPayments(response.data || []);
    } catch {
      // Error is handled by finally block
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (poId) => {
    if (
      !window.confirm(
        "Are you sure you want to mark this purchase order as paid?"
      )
    ) {
      return;
    }

    try {
      await apiService.post(`/api/purchase-orders/${poId}/mark-paid`);
      toast.success("Payment recorded successfully");
      fetchPendingPayments();
    } catch (err) {
      console.error("Error recording payment:", err);
      toast.error("Failed to record payment");
    }
  };

  return (
    <div className="w-full p-3">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins" },
        ]}
      />
      <h2 className="mb-3">Finance</h2>
      <p className="text-secondary mb-4">
        Manage financial operations, budgets, and payment processing.
      </p>

      {/* Pending Payments Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">
            <i className="bi bi-cash-stack me-2 text-warning"></i>
            Pending Payments
          </h4>
          <span className="badge bg-warning text-dark">
            {pendingPayments.length} Orders
          </span>
        </div>
        {loading ? (
          <div className="card p-4">
            <Skeleton count={5} height={50} />
          </div>
        ) : pendingPayments.length === 0 ? (
          <EmptyState
            icon="💳"
            title="No pending payments"
            description="All payment orders have been processed. Great work!"
          />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>PO Number</th>
                    <th>Vendor</th>
                    <th>Requester</th>
                    <th>Order Date</th>
                    <th>Amount</th>
                    <th>Review Notes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments
                    .slice(
                      (currentPage - 1) * itemsPerPage,
                      currentPage * itemsPerPage
                    )
                    .map((po) => (
                      <tr key={po._id}>
                        <td>
                          <strong>{po.poNumber}</strong>
                        </td>
                        <td>{po.vendor}</td>
                        <td>{po.requester}</td>
                        <td>
                          {po.orderDate
                            ? new Date(po.orderDate).toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td className="fw-bold text-success">
                          {formatCurrency(po.totalAmount || 0)}
                        </td>
                        <td>
                          {po.reviewNotes ? (
                            <small className="text-muted">
                              {po.reviewNotes}
                            </small>
                          ) : (
                            <small className="text-muted fst-italic">
                              No notes
                            </small>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkAsPaid(po._id)}
                          >
                            <i className="bi bi-check-circle me-1"></i>
                            Mark as Paid
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(pendingPayments.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={pendingPayments.length}
            />
          </>
        )}
      </div>

      <hr className="my-4" />

      {/* Accounting Overview */}
      <div className="mb-4">
        <h4 className="mb-3">Accounting Overview</h4>
        <div className="row g-3">
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Total Income</h5>
              <p className="h3 mb-0 text-success">{formatCurrency(325450)}</p>
              <small className="text-success">+15% this month</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Total Expenses</h5>
              <p className="h3 mb-0 text-danger">{formatCurrency(198320)}</p>
              <small className="text-danger">+8% this month</small>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Accounts Payable</h5>
              <p className="h3 mb-0 text-warning">{formatCurrency(45670)}</p>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card p-3">
              <h5 className="mb-2">Accounts Receivable</h5>
              <p className="h3 mb-0 text-info">{formatCurrency(78920)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mb-4">
        <h4>Recent Transactions</h4>
        <div className="list-group">
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Payment Received - Client ABC</strong>
                <div className="small text-secondary">Invoice #12345</div>
              </div>
              <span className="text-success fw-bold">
                +{formatCurrency(12500)}
              </span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Vendor Payment - Office Supplies</strong>
                <div className="small text-secondary">Invoice #67890</div>
              </div>
              <span className="text-danger fw-bold">
                -{formatCurrency(3450)}
              </span>
            </div>
          </div>
          <div className="list-group-item">
            <div className="d-flex justify-content-between">
              <div>
                <strong>Salary Payment - Batch Processing</strong>
                <div className="small text-secondary">Monthly Payroll</div>
              </div>
              <span className="text-danger fw-bold">
                -{formatCurrency(85000)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Reports Section */}
      <div className="row g-3">
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Total Revenue</h5>
            <p className="h3 mb-0 text-success">{formatCurrency(245890)}</p>
            <small className="text-success">+12% from last month</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Total Expenses</h5>
            <p className="h3 mb-0 text-danger">{formatCurrency(178420)}</p>
            <small className="text-danger">+5% from last month</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h5 className="mb-2">Net Profit</h5>
            <p className="h3 mb-0 text-primary">{formatCurrency(67470)}</p>
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
        <div className="d-flex gap-2">
          <button className="btn btn-primary">New Transaction</button>
          <button className="btn btn-outline-primary">
            Generate New Report
          </button>
          <button className="btn btn-outline-primary">Export Data</button>
        </div>
      </div>
    </div>
  );
};

export default Finance;
