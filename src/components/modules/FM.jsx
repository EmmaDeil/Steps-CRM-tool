import React from "react";
import Breadcrumb from "../Breadcrumb";

const FM = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench" },
        ]}
      />
      <div className="p-4">
        <h2 className="text-2xl font-bold mb-3">Facility Maintenance</h2>
        <p className="text-gray-600 mb-4">
          Track maintenance requests, schedules, and facility management.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Open Tickets</h5>
            <p className="text-3xl font-bold mb-0 text-yellow-500">12</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">In Progress</h5>
            <p className="text-3xl font-bold mb-0 text-blue-500">7</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Completed</h5>
            <p className="text-3xl font-bold mb-0 text-green-500">143</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <h5 className="text-lg font-semibold mb-2">Urgent</h5>
            <p className="text-3xl font-bold mb-0 text-red-500">2</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-xl font-semibold mb-3">Maintenance Tickets</h4>
          <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <strong className="text-gray-900">AC Repair - Floor 3</strong>
                  <div className="text-sm text-gray-600">Priority: High</div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 w-fit">
                  Open
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <strong className="text-gray-900">
                    Plumbing Issue - Restroom B2
                  </strong>
                  <div className="text-sm text-gray-600">Priority: Medium</div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 w-fit">
                  In Progress
                </span>
              </div>
            </div>
            <div className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <strong className="text-gray-900">
                    Light Replacement - Parking Lot
                  </strong>
                  <div className="text-sm text-gray-600">Priority: Low</div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 w-fit">
                  Open
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Create New Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

export default FM;
