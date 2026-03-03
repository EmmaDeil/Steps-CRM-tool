import React, { useState, useEffect, useMemo } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";

const Inventory = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit" | "restock"
  const [activeItem, setActiveItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    itemId: "",
    name: "",
    category: "Electronics",
    quantity: 0,
    maxStock: 100,
    location: "",
  });

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      const res = await apiService.get("/api/inventory");
      setInventoryItems(res || []);
    } catch (err) {
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // --- Dynamic Stats Computation ---
  const stats = useMemo(() => {
    let total = 0, lowStock = 0, outOfStock = 0;
    inventoryItems.forEach(item => {
      total += item.quantity;
      if (item.quantity === 0) outOfStock++;
      else if (item.quantity < 20) lowStock++;
    });
    return { total, lowStock, outOfStock };
  }, [inventoryItems]);

  // --- Filtering Logic ---
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const searchStr = searchQuery.toLowerCase();
      const matchSearch = item.name?.toLowerCase().includes(searchStr) || item.itemId?.toLowerCase().includes(searchStr);
      const matchCategory = filterCategory === "All" || item.category === filterCategory;
      return matchSearch && matchCategory;
    });
  }, [inventoryItems, searchQuery, filterCategory]);

  const getStatusBadge = (qty) => {
    if (qty === 0) return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full"><i className="fa-solid fa-triangle-exclamation mr-1"></i>Out of Stock</span>;
    if (qty < 20) return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full"><i className="fa-solid fa-bell mr-1"></i>Low Stock</span>;
    return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full"><i className="fa-solid fa-circle-check mr-1"></i>In Stock</span>;
  };

  // --- Modal & API Actions ---
  const handleOpenModal = (mode, item = null) => {
    setModalMode(mode);
    setActiveItem(item);
    if (mode === "add") {
      setFormData({
        itemId: `INV-${Math.floor(Math.random() * 9000) + 1000}`,
        name: "",
        category: "Electronics",
        quantity: 0,
        maxStock: 100,
        location: "",
      });
    } else if (item) {
      setFormData({ ...item });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ["quantity", "maxStock"].includes(name) ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        await apiService.post("/api/inventory", formData);
        toast.success("Item added successfully");
      } else if (modalMode === "edit" || modalMode === "restock") {
        await apiService.put(`/api/inventory/${activeItem._id}`, formData);
        toast.success(`Item ${modalMode === "restock" ? "restocked" : "updated"} successfully`);
      }
      fetchInventory();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${modalMode} item`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this item?")) return;
    try {
      await apiService.delete(`/api/inventory/${id}`);
      toast.success("Item deleted successfully");
      fetchInventory();
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Inventory", icon: "fa-boxes" },
        ]}
      />
      
      <div className="p-6 w-full max-w-8xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#111418] mb-2">Inventory Management</h2>
            <p className="text-gray-600">
              Track and manage your organization's inventory, stock levels, and supply locations.
            </p>
          </div>
          <button 
            onClick={() => handleOpenModal("add")}
            className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> Add New Item
          </button>
        </div>

        {/* Dynamic Top Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <i className="fa-solid fa-boxes-stacked text-blue-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Items</p>
              <h4 className="text-2xl font-bold text-[#111418]">{stats.total.toLocaleString()}</h4>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <i className="fa-solid fa-layer-group text-green-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active SKUs</p>
              <h4 className="text-2xl font-bold text-[#111418]">{inventoryItems.length}</h4>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
              <i className="fa-solid fa-triangle-exclamation text-yellow-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Low Stock Alerts</p>
              <h4 className="text-2xl font-bold text-yellow-600">{stats.lowStock}</h4>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
              <i className="fa-solid fa-ban text-red-600 text-xl"></i>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Out of Stock</p>
              <h4 className="text-2xl font-bold text-red-600">{stats.outOfStock}</h4>
            </div>
          </div>
        </div>

        {/* Inventory Table Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          
          {/* Table Header Controls */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
             <div className="relative w-full sm:w-80">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input
                  type="text"
                  placeholder="Search item name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 w-full sm:w-auto text-sm"
                >
                  <option value="All">All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Supplies">Supplies</option>
                </select>
                <button className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors bg-white shadow-sm flex items-center gap-2 text-sm font-medium">
                  <i className="fa-solid fa-filter"></i> Filters
                </button>
              </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto min-h-[300px]">
            {isLoading ? (
               <div className="flex justify-center items-center h-64">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
               </div>
            ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Product details</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock Level</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-gray-500">
                          <i className="fa-solid fa-box-open text-4xl mb-3 text-gray-300 block"></i>
                          No inventory items found. Add some to get started!
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map(item => (
                       <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
                                {item.category === "Electronics" ? <i className="fa-solid fa-laptop text-gray-500"></i> : 
                                 item.category === "Furniture" ? <i className="fa-solid fa-chair text-gray-500"></i> : 
                                 <i className="fa-solid fa-stapler text-gray-500"></i>}
                              </div>
                              <div>
                                <p className="font-semibold text-[#111418] leading-tight">{item.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{item.itemId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">
                             {item.category}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-600">
                             {item.location}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1 w-32">
                               <div className="flex justify-between text-xs text-gray-600 font-medium">
                                 <span>{item.quantity}</span>
                                 <span>/ {item.maxStock}</span>
                               </div>
                               <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 overflow-hidden">
                                 <div 
                                   className={`h-1.5 rounded-full ${item.quantity === 0 ? 'bg-red-500' : item.quantity < 20 ? 'bg-yellow-400' : 'bg-green-500'}`}
                                   style={{ width: `${Math.min(100, Math.max(0, (item.quantity / item.maxStock) * 100))}%` }}>
                                 </div>
                               </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                             {getStatusBadge(item.quantity)}
                          </td>
                          <td className="py-4 px-6 text-right">
                             <div className="flex items-center justify-end gap-2 text-gray-400">
                               <button onClick={() => handleOpenModal("edit", item)} className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Item">
                                 <i className="fa-solid fa-pen"></i>
                               </button>
                               <button onClick={() => handleOpenModal("restock", item)} className="p-2 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title="Restock">
                                 <i className="fa-solid fa-boxes-packing"></i>
                               </button>
                               <button onClick={() => handleDelete(item._id)} className="p-2 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                                 <i className="fa-solid fa-trash-can"></i>
                               </button>
                             </div>
                          </td>
                       </tr>
                      ))
                    )}
                  </tbody>
                </table>
            )}
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600 bg-gray-50">
            <p>Showing <span className="font-semibold text-gray-900">{filteredItems.length}</span> of <span className="font-semibold text-gray-900">{inventoryItems.length}</span> entries</p>
            <div className="flex gap-1">
               <button className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white transition-colors bg-gray-100 text-gray-400 cursor-not-allowed" disabled>Prev</button>
               <button className="px-3 py-1.5 border border-gray-300 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors">1</button>
               <button className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white transition-colors bg-gray-100 text-gray-400 cursor-not-allowed" disabled>Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* CRUD Modal Array */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {modalMode === "add" ? "Add New Item" : modalMode === "edit" ? "Edit Item" : "Restock Inventory"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                {modalMode !== "restock" && (
                  <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item ID</label>
                        <input type="text" name="itemId" value={formData.itemId} onChange={handleFormChange} required placeholder="e.g. INV-001" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Product Title" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select name="category" value={formData.category} onChange={handleFormChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none">
                          <option value="Electronics">Electronics</option>
                          <option value="Furniture">Furniture</option>
                          <option value="Supplies">Supplies</option>
                          <option value="Network">Network Hardware</option>
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                        <input type="text" name="location" value={formData.location} onChange={handleFormChange} required placeholder="e.g. Server Room A" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>
                  </>
                )}

                {(modalMode === "add" || modalMode === "restock") && (
                  <div className="mb-4 flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {modalMode === "restock" ? "Target Stock Overwrite" : "Initial Quantity"}
                      </label>
                      <input type="number" name="quantity" min="0" value={formData.quantity} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    {modalMode !== "restock" && (
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                        <input type="number" name="maxStock" min="1" value={formData.maxStock} onChange={handleFormChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      </div>
                    )}
                  </div>
                )}
                
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2">
                  <i className={modalMode === "restock" ? "fa-solid fa-box" : "fa-solid fa-check"}></i>
                  {modalMode === "add" ? "Create Item" : modalMode === "edit" ? "Save Changes" : "Confirm Restock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
