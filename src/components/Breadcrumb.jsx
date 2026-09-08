import React from "react";
import { useNavigate } from "react-router-dom";

const Breadcrumb = ({ items }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-[#dbe0e6] px-6 py-3">
      <ol className="flex items-center gap-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            {item.href ? (
              <>
                <button
                  onClick={() => navigate(item.href)}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <i className={`fa-solid ${item.icon} mr-1`}></i>
                  {item.label}
                </button>
                {index < items.length - 1 && (
                  <span className="text-[#617589]">
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </span>
                )}
              </>
            ) : item.onClick ? (
              <>
                <button
                  onClick={item.onClick}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <i className={`fa-solid ${item.icon} mr-1`}></i>
                  {item.label}
                </button>
                {index < items.length - 1 && (
                  <span className="text-[#617589]">
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-[#111418] font-medium">
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
