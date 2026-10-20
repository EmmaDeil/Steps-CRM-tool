import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";

const CATEGORY_OPTIONS = [
  "HVAC",
  "Electrical",
  "Plumbing",
  "IT Equipment",
  "Vehicle",
  "Furniture",
  "Safety Equipment",
  "Machinery",
  "Other",
];

const STATUS_COLORS = {
  Operational: "bg-green-100 text-green-800",
  "Under Maintenance": "bg-yellow-100 text-yellow-800",
  "Out of Service": "bg-red-100 text-red-800",
  Retired: "bg-gray-100 text-gray-800",
  Disposed: "bg-gray-100 text-gray-500",
};

const MaintenanceAssets = ({ onBack }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", status: "", search: "" });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      const response = await apiService.get(`/api/maintenance/assets?${params}`);
      setAssets(response.assets || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0,
      }));
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to load assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleViewAsset = async (assetId) => {
    try {
      const response = await apiService.get(`/api/maintenance/assets/${assetId}`);
      setSelectedAsset(response);
    } catch (error) {
      console.error("Error fetching asset details:", error);
      toast.error("Failed to load asset details");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Facility Maintenance", icon: "fa-wrench", onClick: onBack },
          { label: "Equipment & Assets", icon: "fa-toolbox" },
        ]}
      />

      <div className="p-6">
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Equipment & Assets</h2>
            <p className="text-gray-600 mt-1">Registry of facility equipment and assets</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="items-center px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <i className="fa-solid fa-plus mr-2"></i>
            New Asset
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange("category", e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  {Object.keys(STATUS_COLORS).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                <p className="text-gray-600">Loading assets...</p>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-12">
                <i className="fa-solid fa-box-open text-6xl text-gray-300 mb-4"></i>
                <p className="text-gray-600 text-lg">No assets found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div
                    key={asset._id}
                    onClick={() => handleViewAsset(asset._id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {asset.assetTag}
                          </span>
                          <h3 className="text-base font-semibold text-gray-900">{asset.name}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <i className="fa-solid fa-tag mr-1"></i>
                            {asset.category}
                          </span>
                          <span className="flex items-center">
                            <i className="fa-solid fa-location-dot mr-1"></i>
                            {asset.location?.building}
                            {asset.location?.floor && `, Floor ${asset.location.floor}`}
                          </span>
                          {asset.custodian && (
                            <span className="flex items-center">
                              <i className="fa-solid fa-user mr-1"></i>
                              {asset.custodian.firstName} {asset.custodian.lastName}
                            </span>
                          )}
                          {asset.warrantyExpiryDate && (
                            <span className="flex items-center">
                              <i className="fa-solid fa-shield mr-1"></i>
                              Warranty until {new Date(asset.warrantyExpiryDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                          STATUS_COLORS[asset.status] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {asset.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pagination.pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} assets
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateAssetModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAssets();
          }}
        />
      )}

      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onUpdate={() => {
            fetchAssets();
            handleViewAsset(selectedAsset._id);
          }}
        />
      )}
    </div>
  );
};

const CreateAssetModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    location: { building: "", floor: "", room: "", specificLocation: "" },
    purchaseDate: "",
    purchaseCost: "",
    warrantyProvider: "",
    warrantyExpiryDate: "",
    department: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        purchaseCost: formData.purchaseCost ? Number(formData.purchaseCost) : undefined,
      };
      await apiService.post("/api/maintenance/assets", payload);
      toast.success("Asset created successfully!");
      onSuccess();
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error(error.serverData?.error || "Failed to create asset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Create Asset</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Serial Number</label>
            <input
              type="text"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Building <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.location.building}
                onChange={(e) =>
                  setFormData({ ...formData, location: { ...formData.location, building: e.target.value } })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Floor</label>
              <input
                type="text"
                value={formData.location.floor}
                onChange={(e) =>
                  setFormData({ ...formData, location: { ...formData.location, floor: e.target.value } })
                }
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Purchase Cost</label>
              <input
                type="number"
                min="0"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Warranty Provider</label>
              <input
                type="text"
                value={formData.warrantyProvider}
                onChange={(e) => setFormData({ ...formData, warrantyProvider: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Warranty Expiry</label>
              <input
                type="date"
                value={formData.warrantyExpiryDate}
                onChange={(e) => setFormData({ ...formData, warrantyExpiryDate: e.target.value })}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department / Custodian Notes</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating..." : "Create Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AssetDetailModal = ({ asset, onClose, onUpdate }) => {
  const [history, setHistory] = useState(null);
  const [updatedAsset, setUpdatedAsset] = useState(asset);

  useEffect(() => {
    apiService
      .get(`/api/maintenance/assets/${asset._id}/history`)
      .then(setHistory)
      .catch((error) => console.error("Error fetching asset history:", error));
  }, [asset._id]);

  const handleStatusChange = async (status) => {
    try {
      const response = await apiService.put(`/api/maintenance/assets/${asset._id}`, { status });
      setUpdatedAsset(response.asset);
      toast.success("Status updated successfully");
      onUpdate();
    } catch (error) {
      console.error("Error updating asset status:", error);
      toast.error(error.serverData?.error || "Failed to update status");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{updatedAsset.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{updatedAsset.assetTag}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-3 mb-6">
            <select
              value={updatedAsset.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              {Object.keys(STATUS_COLORS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
              <p className="text-gray-900">{updatedAsset.category}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
              <p className="text-gray-900">
                {updatedAsset.location?.building}
                {updatedAsset.location?.floor && `, ${updatedAsset.location.floor}`}
              </p>
            </div>
            {updatedAsset.manufacturer && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Manufacturer / Model</label>
                <p className="text-gray-900">
                  {updatedAsset.manufacturer} {updatedAsset.model}
                </p>
              </div>
            )}
            {updatedAsset.serialNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Serial Number</label>
                <p className="text-gray-900">{updatedAsset.serialNumber}</p>
              </div>
            )}
            {updatedAsset.warrantyExpiryDate && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Warranty Expiry</label>
                <p className="text-gray-900">{new Date(updatedAsset.warrantyExpiryDate).toLocaleDateString()}</p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Maintenance History</h4>
            {!history ? (
              <p className="text-gray-500 text-sm">Loading history...</p>
            ) : history.tickets.length === 0 && history.schedules.length === 0 ? (
              <p className="text-gray-500 text-sm">No maintenance history recorded for this asset yet.</p>
            ) : (
              <div className="space-y-4">
                {history.schedules.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Preventive Maintenance Schedules</p>
                    <ul className="space-y-1">
                      {history.schedules.map((s) => (
                        <li key={s._id} className="text-sm bg-gray-50 px-3 py-2 rounded-lg flex justify-between">
                          <span>{s.title}</span>
                          <span className="text-gray-500">
                            Next due {new Date(s.nextDueDate).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {history.tickets.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Tickets</p>
                    <ul className="space-y-1">
                      {history.tickets.map((t) => (
                        <li key={t._id} className="text-sm bg-gray-50 px-3 py-2 rounded-lg flex justify-between">
                          <span>
                            {t.ticketNumber} - {t.title}
                          </span>
                          <span className="text-gray-500">{t.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceAssets;
