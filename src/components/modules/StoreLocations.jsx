import React, { useState, useEffect, useCallback } from "react";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";

const StoreLocations = () => {
  const [locations, setLocations] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ code: "", name: "", address: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateLocationCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "LOC-";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const fetchLocationsAndStock = useCallback(async () => {
    try {
      setLoading(true);
      const [resLoc, resInv] = await Promise.all([
        apiService.get("/api/store-locations"),
        apiService.get("/api/inventory?limit=500"), // Fetching up to 500 items to calculate quantities
      ]);
      setLocations(resLoc?.locations || resLoc || []);
      setInventoryItems(resInv?.items || []);
    } catch {
      toast.error("Failed to load store locations data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocationsAndStock();
  }, [fetchLocationsAndStock]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiService.post("/api/store-locations", formData);
      toast.success("Store location added");
      setFormData({ code: "", name: "", address: "", description: "" });
      setIsModalOpen(false);
      fetchLocationsAndStock();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add location");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLocationStats = (locId) => {
    let quantity = 0;
    let uniqueItems = 0;
    inventoryItems.forEach(item => {
      // Check for stock specific to this location if multi-location is supported
      const stockLevel = item.stockLevels?.find(sl => sl.locationId === locId);
      if (stockLevel) {
        if (stockLevel.quantity > 0) uniqueItems++;
        quantity += stockLevel.quantity;
      } else if (item.locationId === locId || item.location === locations.find(l => l._id === locId)?.name) {
        if (item.quantity > 0) uniqueItems++;
        quantity += item.quantity;
      }
    });
    return { quantity, uniqueItems };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-bold text-gray-800">Store Locations</h3>
        <button onClick={() => {
          setFormData({ code: generateLocationCode(), name: "", address: "", description: "" });
          setIsModalOpen(true);
        }} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors">
          <i className="fa-solid fa-plus"></i> Add Location
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center py-12 text-gray-400"><i className="fa-solid fa-spinner fa-spin text-2xl"></i></div>
        ) : locations.length === 0 ? (
          <div className="text-center py-10">
            <i className="fa-solid fa-map-location-dot text-4xl text-gray-200 mb-3"></i>
            <p className="text-gray-500 font-medium">No store locations defined yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map(loc => {
              const stats = getLocationStats(loc._id);
              return (
              <div key={loc._id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <i className="fa-solid fa-warehouse text-gray-500"></i>
                    {loc.name}
                  </h4>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">{loc.code}</span>
                </div>
                {loc.address && <p className="text-sm text-gray-500 mb-2 whitespace-pre-wrap"><i className="fa-solid fa-location-dot mr-1 text-gray-400"></i>{loc.address}</p>}
                {loc.description && <p className="text-xs text-gray-400 mb-2"><i className="fa-solid fa-circle-info mr-1 text-gray-300"></i>{loc.description}</p>}
                
                <div className="mt-auto pt-3 flex gap-2">
                   <div className="flex-1 bg-green-50 border border-green-100 rounded p-2 text-center">
                      <p className="text-xl font-bold text-green-700">{stats.quantity}</p>
                      <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Total Units</p>
                   </div>
                   <div className="flex-1 bg-blue-50 border border-blue-100 rounded p-2 text-center">
                      <p className="text-xl font-bold text-blue-700">{stats.uniqueItems}</p>
                      <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Unique Items</p>
                   </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                  <span>ID: <code className="bg-gray-50 px-1 rounded">{loc._id.toString().slice(-6)}</code></span>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Add Location</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Code *</label>
                <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded text-sm font-mono text-gray-600 flex items-center justify-between">
                  <span>{formData.code}</span>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-sans">Auto-generated</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Main Warehouse" className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea rows="2" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium flex gap-2">
                  {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreLocations;
