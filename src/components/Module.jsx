import React, { Suspense, lazy } from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";

// sample module metadata; componentName optionally points to a real component file under ./modules/
const sampleModules = [
  { id: 1, name: "Accounting", componentName: "Accounting" },
  { id: 2, name: "Inventory" },
  { id: 3, name: "HR Management" },
  { id: 4, name: "Facility Maintenance", componentName: "Facility" },
  { id: 5, name: "Finance Reports" },
  { id: 6, name: "Security Logs" },
  { id: 7, name: "Admin Controls" },
];

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

const Module = ({ searchQuery }) => {
  const { id } = useParams();

  if (id) {
    const mid = parseInt(id, 10);
    const found = sampleModules.find((m) => m.id === mid);
    if (!found) {
      return (
        <div className="p-4 text-center">
          <h3 className="mb-2">Module Not Found</h3>
          <p className="text-secondary">No module with id {id}</p>
        </div>
      );
    }

    const ModuleComp = loadModuleComponent(found.componentName);
    if (ModuleComp) {
      return (
        <Suspense fallback={<div className="p-4">Loading module...</div>}>
          <ModuleComp />
        </Suspense>
      );
    }

    return (
      <div className="p-4 text-center">
        <h3 className="mb-2">{found.name}</h3>
        <p className="text-secondary">Details for module {found.name}</p>
      </div>
    );
  }

  const query = (searchQuery || "").toLowerCase();
  const filtered = sampleModules.filter((m) =>
    m.name.toLowerCase().includes(query)
  );

  return (
    <div className="p-3">
      <h3 className="mb-3">Modules</h3>
      <div className="row g-3">
        {filtered.map((m) => (
          <div key={m.id} className="col-12 col-md-6">
            <div className="card p-3 h-100">
              <h5 className="mb-1">{m.name}</h5>
              <p className="small text-secondary mb-0">Module ID: {m.id}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-12 text-center text-secondary">
            No modules matched your search.
          </div>
        )}
      </div>
    </div>
  );
};

Module.propTypes = {
  searchQuery: PropTypes.string,
};

Module.defaultProps = {
  searchQuery: "",
};

export default Module;
