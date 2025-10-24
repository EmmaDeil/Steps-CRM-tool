import React from "react";
import PropTypes from "prop-types";
import { useParams } from "react-router-dom";

const sampleModules = [
  { id: 1, name: "Accounting" },
  { id: 2, name: "Inventory" },
  { id: 3, name: "HR Management" },
  { id: 4, name: "Facility Maintenance" },
  { id: 5, name: "Finance Reports" },
  { id: 6, name: "Security Logs" },
  { id: 7, name: "Admin Controls" },
];

const Module = ({ searchQuery }) => {
  const { id } = useParams();

  if (id) {
    const mid = parseInt(id, 10);
    const found = sampleModules.find((m) => m.id === mid);
    return (
      <div className="p-4 text-center">
        <h3 className="mb-2">{found ? found.name : "Module Not Found"}</h3>
        <p className="text-secondary">
          {found
            ? `Details for module ${found.name}`
            : `No module with id ${id}`}
        </p>
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
