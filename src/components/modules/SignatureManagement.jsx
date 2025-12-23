import React, { useState, useEffect } from "react";
import { apiService } from "../../services/api";

const SignatureManagement = () => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/signatures");
      setSignatures(response.data || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch signatures:", err);
      setError("Failed to load signatures");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid p-4">
        <div className="text-center">Loading signatures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid p-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Signature Management</h2>
        <button className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          Add Signature
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Document Type</th>
                  <th>Signer</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {signatures.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No signatures found. Add your first signature to get
                      started.
                    </td>
                  </tr>
                ) : (
                  signatures.map((sig) => (
                    <tr key={sig.id}>
                      <td>{sig.id}</td>
                      <td>{sig.documentType}</td>
                      <td>{sig.signer}</td>
                      <td>
                        <span
                          className={`badge ${
                            sig.status === "signed"
                              ? "bg-success"
                              : sig.status === "pending"
                              ? "bg-warning"
                              : "bg-secondary"
                          }`}
                        >
                          {sig.status}
                        </span>
                      </td>
                      <td>{sig.date}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary me-2">
                          View
                        </button>
                        <button className="btn btn-sm btn-outline-secondary">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">
                Total Signatures
              </h6>
              <h3 className="card-title">{signatures.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Pending</h6>
              <h3 className="card-title text-warning">
                {signatures.filter((s) => s.status === "pending").length}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Completed</h6>
              <h3 className="card-title text-success">
                {signatures.filter((s) => s.status === "signed").length}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureManagement;
