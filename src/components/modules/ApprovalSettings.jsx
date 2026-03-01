import React, { useState } from "react";
import { toast } from "react-hot-toast";

const ApprovalSettings = () => {
  const [rules, setRules] = useState([
    {
      id: 1,
      moduleType: "Advance Requests",
      condition: "Amount > $1,000",
      levels: [
        { level: 1, approverRole: "Direct Manager" },
        { level: 2, approverRole: "Finance Head" },
      ],
      status: "Active",
    },
    {
      id: 2,
      moduleType: "Leave Requests",
      condition: "Duration > 3 Days",
      levels: [
        { level: 1, approverRole: "Direct Manager" },
        { level: 2, approverRole: "HR Manager" },
      ],
      status: "Active",
    },
    {
      id: 3,
      moduleType: "Refund Requests",
      condition: "All",
      levels: [{ level: 1, approverRole: "Finance Administrator" }],
      status: "Inactive",
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#111418] mb-2">
            Approval Flow Settings
          </h2>
          <p className="text-gray-600">
            Define multi-level approval matrices and routing rules for various
            requests.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold leading-normal shadow-sm transition-colors"
        >
          <i className="fa-solid fa-plus mr-2"></i>
          Create Rule
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Request Module
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Condition
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Approval Chain
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-[#111418]">
                      {rule.moduleType}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                      {rule.condition}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {rule.levels.map((level, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span
                            className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2.5 py-1 rounded-full cursor-help whitespace-nowrap"
                            title={`Level ${level.level}: ${level.approverRole}`}
                          >
                            {level.level}. {level.approverRole}
                          </span>
                          {idx < rule.levels.length - 1 && (
                            <i className="fa-solid fa-arrow-right text-gray-400 text-[10px]"></i>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rule.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rule.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 transition-colors ml-1">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#111418]">
                Create Approval Rule
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Module
                </label>
                <select className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500">
                  <option>Advance Requests</option>
                  <option>Leave Requests</option>
                  <option>Refund Requests</option>
                  <option>Purchase Orders</option>
                  <option>Material Requests</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Condition (Optional)
                </label>
                <div className="flex gap-2">
                  <select className="w-1/3 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500">
                    <option>Amount</option>
                    <option>Duration (Days)</option>
                    <option>Quantity</option>
                  </select>
                  <select className="w-1/4 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500">
                    <option>Is Greater Than</option>
                    <option>Is Less Than</option>
                    <option>Equals</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Value..."
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-800">
                    Approval Sequence
                  </h4>
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1">
                    <i className="fa-solid fa-plus"></i>
                    Add Level
                  </button>
                </div>

                {/* Level 1 */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3 relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white">
                    1
                  </div>
                  <div className="ml-4 flex gap-3 items-center">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Approver Role / Group
                      </label>
                      <select className="w-full h-9 px-3 rounded border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500">
                        <option>Direct Manager</option>
                        <option>Department Head</option>
                        <option>Finance Manager</option>
                        <option>HR Director</option>
                        <option>Specific User...</option>
                      </select>
                    </div>
                    <button className="mt-5 text-gray-400 hover:text-red-500 p-2">
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Rule saved successfully!");
                  setShowAddModal(false);
                }}
                className="px-4 py-2 bg-[#137fec] text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalSettings;
