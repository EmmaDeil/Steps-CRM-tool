import React from "react";
import PropTypes from "prop-types";

/**
 * Pagination Component
 * Handles page navigation for large datasets
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
  itemsPerPage = 10,
  totalItems = 0,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    onPageChange(page);
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust start page if we're at the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push("...");
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 py-4 border-t border-gray-300 mt-4">
      <div className="text-sm text-gray-600 text-center">
        Showing {startItem} to {endItem} of {totalItems} items
      </div>
      <nav className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-2 flex-wrap">
        <button
          className="px-3 py-2 border border-gray-300 bg-white text-blue-600 cursor-pointer rounded text-sm transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-500 w-full sm:w-auto"
          onClick={handlePrevious}
          disabled={currentPage === 1}
        >
          ← Previous
        </button>

        <div className="flex gap-1 flex-wrap justify-center w-full sm:w-auto">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-2 text-gray-600 font-medium"
              >
                {page}
              </span>
            ) : (
              <button
                key={page}
                className={`min-w-[36px] px-3 py-2 border text-center text-sm rounded transition-all ${
                  currentPage === page
                    ? "bg-blue-600 text-white border-blue-600 font-semibold hover:bg-blue-700 hover:border-blue-700"
                    : "border-gray-300 bg-white text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600"
                }`}
                onClick={() => handlePageClick(page)}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          className="px-3 py-2 border border-gray-300 bg-white text-blue-600 cursor-pointer rounded text-sm transition-all hover:bg-blue-600 hover:text-white hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-500 w-full sm:w-auto"
          onClick={handleNext}
          disabled={currentPage === totalPages}
        >
          Next →
        </button>
      </nav>
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  itemsPerPage: PropTypes.number,
  totalItems: PropTypes.number,
};

export default Pagination;
