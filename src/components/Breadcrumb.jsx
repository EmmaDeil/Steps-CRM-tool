import React from "react";
import { useNavigate } from "react-router-dom";

const Breadcrumb = ({ items }) => {
  const navigate = useNavigate();

  return (
    <nav className="w-full bg-white border-b border-[#dbe0e6] px-4 py-3 sm:px-6 lg:px-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm min-w-0">
        {items.map((item, index) => (
          <li key={index} className="flex min-w-0 items-center gap-2">
            {item.href ? (
              <>
                <button
                  onClick={() => navigate(item.href)}
                  className="min-w-0 max-w-full text-left text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                    <i className={`fa-solid ${item.icon}`}></i>
                    <span className="truncate">{item.label}</span>
                  </span>
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
                  className="min-w-0 max-w-full text-left text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                    <i className={`fa-solid ${item.icon}`}></i>
                    <span className="truncate">{item.label}</span>
                  </span>
                </button>
                {index < items.length - 1 && (
                  <span className="text-[#617589]">
                    <i className="fa-solid fa-chevron-right text-xs"></i>
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="min-w-0 max-w-full text-[#111418] font-medium">
                  <span className="inline-flex min-w-0 max-w-full items-center gap-1">
                    <i className={`fa-solid ${item.icon}`}></i>
                    <span className="truncate">{item.label}</span>
                  </span>
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
