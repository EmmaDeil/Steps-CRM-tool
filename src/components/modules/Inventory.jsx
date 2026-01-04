import React from "react";
import Breadcrumb from "../Breadcrumb";

const Inventory = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Inventory", icon: "fa-boxes" },
        ]}
      />
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-3">Inventory Management</h2>
        <p className="text-gray-600 mb-4">
          Track and manage your organization's inventory and stock levels.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Total Items</h5>
            <p className="text-3xl font-bold mb-0 text-blue-600">1,234</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Low Stock</h5>
            <p className="text-3xl font-bold mb-0 text-yellow-500">23</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Out of Stock</h5>
            <p className="text-3xl font-bold mb-0 text-red-600">5</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-xl font-semibold mb-3">Recent Activity</h4>
          <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <span className="text-gray-900">Office Supplies - Restock</span>
                <span className="text-gray-600 text-sm sm:text-right">
                  2 hours ago
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between gap-2">
                <span className="text-gray-900">
                  IT Equipment - New Purchase
                </span>
                <span className="text-gray-600 text-sm sm:text-right">
                  5 hours ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
