import React, { Suspense, lazy, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useAppContext } from "../context/useAppContext";
import Navbar from "./Navbar";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";
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
            onClick={() => navigate("/home")}
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
              onBack={() => navigate("/home")}
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
                onClick={() => navigate("/home")}
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
            onBack={() => navigate("/home")}
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
              onClick={() => navigate("/home")}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Module icons mapping
  const moduleIcons = {
    Finance: "💰",
    Accounting: "📊",
    "Material Requests": "📦",
    "Purchase Orders": "🛒",
    "HR Management": "👥",
    Analytics: "📈",
    Attendance: "📋",
    Inventory: "📑",
    "Facility Maintenance": "🔧",
    "Security Logs": "🔐",
    "Signature Management": "✍️",
    "Finance Reports": "📄",
    "Admin Controls": "⚙️",
  };

  // Module descriptions
  const moduleDescriptions = {
    Finance: "Manage payments and financial records",
    Accounting: "Handle retirement and advance requests",
    "Material Requests": "Request and track materials",
    "Purchase Orders": "Create and manage purchase orders",
    "HR Management": "Manage employee information",
    Analytics: "View analytics and reports",
    Attendance: "Track employee attendance",
    Inventory: "Manage inventory levels",
    "Facility Maintenance": "Request facility maintenance",
    "Security Logs": "View security logs",
    "Signature Management": "Manage digital signatures",
    "Finance Reports": "Generate financial reports",
    "Admin Controls": "System administration",
  };

  const query = (searchQuery || "").toLowerCase();
  const filtered = (modules || []).filter((m) =>
    m.name.toLowerCase().includes(query)
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {showNavbar && <Navbar user={user} />}
      <div className="modules-container">
        {/* Header */}
        <div className="modules-header">
          <h2 className="modules-title">Available Modules</h2>
          <p className="modules-subtitle">
            {filtered.length} {filtered.length === 1 ? "module" : "modules"}{" "}
            available
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="modules-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="module-card-wrapper">
                <div className="card module-card skeleton-card">
                  <Skeleton height={120} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <EmptyState
            icon="⚠️"
            title="Oops! Something went wrong"
            description="We couldn't load the modules. Please try again later."
            variant="error"
            action={
              <button
                className="btn btn-danger btn-sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            }
          />
        )}

        {/* No Results */}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon="🔍"
            title="No modules found"
            description="Your search didn't match any modules. Try adjusting your search terms."
            variant="search"
          />
        )}

        {/* Module Cards Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="modules-grid">
            {filtered.map((m) => (
              <Link key={m.id} to={`/modules/${m.id}`} className="module-link">
                <div className="module-card-wrapper">
                  <div className="card module-card">
                    {/* Icon */}
                    <div className="module-icon">
                      {moduleIcons[m.name] || "📦"}
                    </div>

                    {/* Title */}
                    <h5 className="module-card-title">{m.name}</h5>

                    {/* Description */}
                    <p className="module-card-description">
                      {moduleDescriptions[m.name] ||
                        "Click to access this module"}
                    </p>

                    {/* Action Indicator */}
                    <div className="module-action">
                      <span className="module-arrow">→</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Module Count Summary */}
        {!loading && !error && filtered.length > 0 && (
          <div className="modules-footer">
            <p className="text-secondary">
              Showing {filtered.length} of {modules?.length || 0} modules
            </p>
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
