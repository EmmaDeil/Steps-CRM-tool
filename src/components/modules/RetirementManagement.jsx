import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const RetirementManagement = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [lineItems, setLineItems] = useState([]);
  const [newItem, setNewItem] = useState({
    description: "",
    cost: "",
  });

  const handleAddLineItem = () => {
    if (
      !newItem.description.trim() ||
      !newItem.cost ||
      parseFloat(newItem.cost) <= 0
    ) {
      toast.error("Please enter a valid description and cost");
      return;
    }

    const item = {
      id: Date.now(),
      description: newItem.description.trim(),
      cost: parseFloat(newItem.cost),
    };

    setLineItems([...lineItems, item]);
    setNewItem({ description: "", cost: "" });
    toast.success("Line item added");
  };

  const handleRemoveLineItem = (id) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
    toast.success("Line item removed");
  };

  const handleSubmit = async () => {
    if (lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      const request = {
        userId: user?.id,
        employeeName: user?.fullName || "Employee",
        lineItems: lineItems,
        totalAmount: calculateTotal(),
        submittedDate: new Date().toISOString().split("T")[0],
        status: "pending",
      };

      await apiService.post("/api/retirement-requests", request);
      toast.success("Retirement request submitted successfully");
      navigate("/home/1");
    } catch (error) {
      toast.error("Failed to submit retirement request");
      console.error(error);
    }
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.cost, 0);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0f172a] dark:to-[#1e293b] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-[#111418] dark:text-white mb-2 flex items-center gap-3">
              <i className="fa-solid fa-handshake text-purple-600 text-4xl"></i>
              Retirement Management
            </h1>
            <p className="text-[#617589] dark:text-gray-400 text-lg">
              Add line items for your retirement settlement
            </p>
          </div>
          <button
            onClick={() => navigate("/home/1")}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <i className="fa-solid fa-times mr-2"></i>
            Close
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-[#dbe0e6] dark:border-gray-700 shadow-lg p-8">
          {/* Add Line Item Section */}
          <div className="mb-8 pb-8 border-b border-[#dbe0e6] dark:border-gray-700">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white mb-6">
              Add Line Item
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Description Input */}
              <div>
                <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  placeholder="e.g., Gratuity, Medical Benefits"
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-[#0f172a] text-[#111418] dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Cost Input */}
              <div>
                <label className="block text-sm font-semibold text-[#111418] dark:text-white mb-2">
                  Cost (USD)
                </label>
                <input
                  type="number"
                  value={newItem.cost}
                  onChange={(e) =>
                    setNewItem({ ...newItem, cost: e.target.value })
                  }
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-[#dbe0e6] dark:border-gray-600 rounded-lg bg-white dark:bg-[#0f172a] text-[#111418] dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddLineItem}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:shadow-lg transition-all font-semibold flex items-center justify-center gap-2 h-10"
              >
                <i className="fa-solid fa-plus"></i>
                Add Item
              </button>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#111418] dark:text-white mb-6">
              Line Items ({lineItems.length})
            </h2>

            {lineItems.length === 0 ? (
              <div className="text-center py-12 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-dashed border-purple-300 dark:border-purple-800">
                <i className="fa-solid fa-inbox text-4xl text-[#617589] dark:text-gray-400 mb-3"></i>
                <p className="text-[#617589] dark:text-gray-400">
                  No line items added yet. Add items to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-purple-50 dark:bg-purple-900/20">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-gray-700">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-gray-700">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-gray-700 w-20">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`${
                          idx % 2 === 0
                            ? "bg-white dark:bg-[#1e293b]"
                            : "bg-purple-50 dark:bg-purple-900/10"
                        } hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors`}
                      >
                        <td className="px-6 py-4 text-sm text-[#111418] dark:text-white border border-[#dbe0e6] dark:border-gray-700">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-right text-green-600 dark:text-green-400 border border-[#dbe0e6] dark:border-gray-700">
                          {formatCurrency(item.cost)}
                        </td>
                        <td className="px-6 py-4 text-center border border-[#dbe0e6] dark:border-gray-700">
                          <button
                            onClick={() => handleRemoveLineItem(item.id)}
                            className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-sm"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Total Section */}
          {lineItems.length > 0 && (
            <div className="mb-8 pb-8 border-t border-[#dbe0e6] dark:border-gray-700 pt-8">
              <div className="flex justify-end items-center gap-8">
                <div className="text-xl font-bold text-[#111418] dark:text-white">
                  Total Amount:
                </div>
                <div className="text-3xl font-bold text-gradient bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  {formatCurrency(calculateTotal())}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => navigate("/home/1")}
              className="px-6 py-3 border border-[#dbe0e6] dark:border-gray-600 text-[#111418] dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={lineItems.length === 0}
              className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                lineItems.length === 0
                  ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg"
              }`}
            >
              <i className="fa-solid fa-check"></i>
              Submit Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetirementManagement;
