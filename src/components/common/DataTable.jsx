import React from "react";

const DataTable = ({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No records found.",
  keyExtractor = (item, index) => item._id || item.id || index,
}) => {
  return (
    <div className="overflow-x-auto overflow-y-visible">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.accessorKey || index}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 overflow-visible">
          {isLoading ? (
            // Loading Skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={`skeleton-${i}`} className="animate-pulse">
                {columns.map((col, j) => (
                  <td key={j} className="px-4 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            // Empty State
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500 font-medium"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            // Data Rows
            data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`px-4 py-3 text-sm text-gray-900 ${col.cellClassName || ""}`}
                  >
                    {col.cell ? col.cell(item, index) : item[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
