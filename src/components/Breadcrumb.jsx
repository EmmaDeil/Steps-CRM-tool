import React from "react";
import { useNavigate } from "react-router-dom";

const Breadcrumb = ({ items }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white dark:bg-[#1e293b] border-b border-[#dbe0e6] dark:border-gray-700 px-6 py-3">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {item.href ? (
              <>
                <button
                  onClick={() => navigate(item.href)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                >
                  <i className={`fa-solid ${item.icon} mr-1`}></i>
                  {item.label}
                </button>
                {index < items.length - 1 && (
                  <span className="text-[#617589] dark:text-gray-400">
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-[#111418] dark:text-white font-medium">
                  <i className={`fa-solid ${item.icon} mr-1`}></i>
                  {item.label}
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
