import React, { Suspense, lazy, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useAppContext } from "../context/useAppContext";
import Navbar from "./Navbar";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";
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
        <div className="px-4 py-10 text-center">
          <h3 className="text-xl font-bold mb-2 text-[#111418] dark:text-white">
            Module Not Found
          </h3>
          <p className="text-sm text-[#617589] dark:text-gray-400">
            No module with id {id}
          </p>
          <button
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={() => navigate("/home")}
          >
            <span className="material-symbols-outlined text-base">home</span>
            Home
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
          <div className="px-4 py-10 text-center">
            <div className="inline-block rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200 px-6 py-4">
              <h3 className="text-lg font-bold mb-2">🔒 Access Denied</h3>
              <p className="text-sm mb-3 text-[#617589] dark:text-gray-400">
                You do not have permission to access the{" "}
                <strong>{found.name}</strong> module.
              </p>
              <button
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => navigate("/home")}
              >
                <span className="material-symbols-outlined text-base">
                  home
                </span>
                Home
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
        <div className="px-4 py-10 text-center">
          <div className="inline-block rounded-md border border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200 px-6 py-4">
            <h3 className="text-lg font-bold mb-2">⚠️ Module Not Available</h3>
            <p className="text-sm mb-3 text-[#617589] dark:text-gray-400">
              The <strong>{found.name}</strong> module is currently under
              development.
            </p>
            <button
              className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => navigate("/home")}
            >
              <span className="material-symbols-outlined text-base">home</span>
              Home
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
    <div className="min-h-screen w-full flex flex-col">
      {showNavbar && <Navbar user={user} />}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-[#111418] dark:text-white">
            Available Modules
          </h2>
          <p className="text-sm text-[#617589] dark:text-gray-400">
            {filtered.length} {filtered.length === 1 ? "module" : "modules"}{" "}
            available
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="relative flex flex-col items-center p-8 bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dbe0e6] dark:border-gray-700 shadow-sm h-[260px]"
              >
                <div className="size-24 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-6" />
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded-full mb-2" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center">
            <div className="inline-block rounded-md border border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-200 px-6 py-4">
              <div className="text-lg font-semibold mb-2">
                Oops! Something went wrong
              </div>
              <p className="text-sm mb-3">
                We couldn't load the modules. Please try again later.
              </p>
              <button
                className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center">
            <div className="inline-block rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] px-6 py-4">
              <div className="text-lg font-semibold mb-2">No modules found</div>
              <p className="text-sm text-[#617589] dark:text-gray-400">
                Your search didn't match any modules. Try adjusting your search
                terms.
              </p>
            </div>
          </div>
        )}

        {/* Module Cards Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map((m) => (
              <Link
                key={m.id}
                to={`/modules/${m.id}`}
                className="group relative flex flex-col items-center p-8 bg-white dark:bg-[#1e293b] rounded-2xl border border-[#dbe0e6] dark:border-gray-700 shadow-sm h-[260px] hover:shadow-xl transition-shadow"
              >
                {/* Icon */}
                <div className="text-5xl mb-4">
                  {moduleIcons[m.name] || "📦"}
                </div>
                {/* Title */}
                <h5 className="text-xl font-bold text-[#111418] dark:text-white mb-2 text-center">
                  {m.name}
                </h5>
                {/* Description */}
                <p className="text-sm text-[#617589] dark:text-gray-400 text-center flex-1">
                  {moduleDescriptions[m.name] || "Click to access this module"}
                </p>
                {/* Action */}
                <div className="mt-3 py-1 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                  Open
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Module Count Summary */}
        {!loading && !error && filtered.length > 0 && (
          <div className="text-center mt-10 border-t border-[#dbe0e6] dark:border-gray-800 pt-6">
            <p className="text-sm text-[#617589] dark:text-gray-400">
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
