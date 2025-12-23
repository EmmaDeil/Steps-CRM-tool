import React, { Suspense, lazy, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useAppContext } from "../context/useAppContext";
import Navbar from "./Navbar";
import "./Module.css";
import { apiService } from "../services/api";

// Modules are now fetched from the backend API (/api/modules). The client no
// longer contains sample module metadata.

const loadModuleComponent = (componentName) => {
  // Try to lazy-load a real component from the modules folder. If it doesn't exist, the import will fail;
  // we catch that by returning null and falling back to sample content.
  if (!componentName) return null;
  try {
    return lazy(() => import(`./modules/${componentName}.jsx`));
  } catch {
    // dynamic import won't throw here synchronously; return null and handle in rendering
    return null;
  }
};

const Module = ({ searchQuery, showNavbar = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { hasModuleAccess } = useAppContext();

  const [modules, setModules] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchModules = async () => {
      setLoading(true);
      try {
        const res = await apiService.get("/api/modules");
        if (mounted) setModules(res.data || []);
      } catch (err) {
        console.error("Failed to fetch modules:", err);
        if (mounted) setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchModules();
    return () => {
      mounted = false;
    };
  }, []);

  if (id) {
    const mid = parseInt(id, 10);
    const found = (modules || []).find((m) => String(m.id) === String(mid));
    if (!found) {
      return (
        <div className="p-4 text-center">
          <h3 className="mb-2">Module Not Found</h3>
          <p className="text-secondary">No module with id {id}</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
        </div>
      );
    }

    // Check access permission
    if (!hasModuleAccess(found.name)) {
      return (
        <div>
          {showNavbar && (
            <Navbar
              user={user}
              showBackButton={true}
              onBack={() => navigate("/dashboard")}
            />
          )}
          <div className="p-4 text-center">
            <div className="alert alert-warning d-inline-block">
              <h3 className="mb-2">🔒 Access Denied</h3>
              <p className="text-secondary mb-3">
                You do not have permission to access the{" "}
                <strong>{found.name}</strong> module.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/dashboard")}
              >
                Go Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    const ModuleComp = loadModuleComponent(found.componentName);
    if (ModuleComp) {
      return (
        <div>
          {showNavbar && (
            <Navbar
              user={user}
              showBackButton={true}
              onBack={() => navigate("/modules")}
            />
          )}
          <Suspense fallback={<div className="p-4">Loading module...</div>}>
            <ModuleComp />
          </Suspense>
        </div>
      );
    }

    return (
      <div>
        {showNavbar && (
          <Navbar
            user={user}
            showBackButton={true}
            onBack={() => navigate("/dashboard")}
          />
        )}
        <div className="p-4 text-center">
          <div className="alert alert-warning d-inline-block">
            <h3 className="mb-2">⚠️ Module Not Available</h3>
            <p className="text-secondary mb-3">
              The <strong>{found.name}</strong> module is currently under
              development.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const query = (searchQuery || "").toLowerCase();
  const filtered = (modules || []).filter((m) =>
    m.name.toLowerCase().includes(query)
  );

  return (
    <div>
      {showNavbar && <Navbar user={user} />}
      <div className="p-3 container">
        <h3 className="mb-5"></h3>

        {loading && <div className="text-center p-4">Loading modules...</div>}

        {error && (
          <div className="text-center p-4 text-danger">
            Failed to load modules. Please try again later.
          </div>
        )}

        {!loading && !error && (
          <div className="row g-1">
            {filtered.map((m) => (
              <div key={m.id} className="col-12 col-md-6 col-lg-3">
                <Link to={`/modules/${m.id}`} className="module-link">
                  <div
                    className="card module-card p-0 h-100"
                    style={{ width: "20rem" }}
                  >
                    <h5 className="mb-0 mx-auto p-4" style={{ fontSize: "1.25rem" }}>
                      {m.name}
                    </h5>
                  </div>
                </Link>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="col-12 text-center text-secondary">
                No modules matched your search.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

Module.propTypes = {
  searchQuery: PropTypes.string,
  showNavbar: PropTypes.bool,
};

Module.defaultProps = {
  searchQuery: "",
  showNavbar: false,
};

export default Module;
