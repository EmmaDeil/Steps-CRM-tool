import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import ModuleLoader from "../common/ModuleLoader";

const StockMovements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMovements = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const res = await apiService.get(
        `/api/inventory-movements?page=${pageNum}&limit=50`,
      );
      setMovements(res?.movements || res || []);
      setTotalPages(res?.totalPages || 1);
      setPage(pageNum);
    } catch {
      toast.error("Failed to load stock movements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">Stock Movement History</h3>
        <p className="text-xs text-gray-500 mt-1">
          Audit trail of all inventory changes
        </p>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <ModuleLoader moduleName="Stock Movements" />
        ) : movements.length === 0 ? (
          <div className="text-center py-10">
            <i className="fa-solid fa-timeline text-4xl text-gray-200 mb-3"></i>
            <p className="text-gray-500 font-medium">
              No stock movements found
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Change
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map((m) => {
                const isPositive = m.quantityChange > 0;
                return (
                  <tr key={m._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(m.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {m.inventoryItemId?.name || (
                        <span className="text-gray-400 italic">
                          Unknown Item
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {m.movementType}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${isPositive ? "text-green-600" : m.quantityChange < 0 ? "text-red-600" : "text-gray-400"}`}
                    >
                      {isPositive ? "+" : ""}
                      {m.quantityChange}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate"
                      title={m.notes}
                    >
                      {m.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="p-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500 bg-gray-50">
          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => fetchMovements(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => fetchMovements(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockMovements;
