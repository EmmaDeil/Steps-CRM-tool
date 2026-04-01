import React from "react";

const ModuleLoader = ({ moduleName = "Module", subtitle, className = "" }) => {
  const safeName = moduleName || "Module";

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center bg-white px-4 ${className}`.trim()}
    >
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mb-4"></div>
        <h3 className="text-lg font-semibold mb-1 text-[#111418]">
          Loading... {safeName || " "} Please wait.
        </h3>
        <h3>
        <p className="text-sm text-[#617589]">
          Fetching data for {safeName || "this module"}.
        </p>
        </h3>
        {subtitle ? <p className="text-sm text-[#617589]">{subtitle}</p> : null}
      </div>
    </div>
  );
};

export default ModuleLoader;
