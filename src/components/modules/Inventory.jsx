import React, { useState, useEffect, useMemo, useCallback } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import DataTable from "../common/DataTable";

const CATEGORIES = ["Electronics", "Furniture", "Supplies", "Network"];
const PAGE_SIZE = 20;

const Inventory = () => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit" | "restock"
  const [activeItem, setActiveItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State — edit form no longer includes quantity (that's restock's job)
  const [formData, setFormData] = useState({
    name: "",
    category: "Electronics",
    maxStock: 100,
    reorderPoint: 20,
    location: "",
    description: "",
    unit: "pcs",
    // restock-only field:
    addQuantity: 1,
  });

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchInventory = useCallback(async (pageNum = 1, search = "", category = "All") => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        limit: PAGE_SIZE,
      });
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);

      const res = await apiService.get(`/api/inventory?${params.toString()}`);
      setInventoryItems(res?.items || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setPage(pageNum);
    } catch (_err) {
      toast.error("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory(1, searchQuery, filterCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search — wait 400ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory(1, searchQuery, filterCategory);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, filterCategory, fetchInventory]);

  // ── Stats (computed from current page, shown as global indicator) ──────────

  const stats = useMemo(() => {
    let totalQty = 0, lowStock = 0, outOfStock = 0;
    inventoryItems.forEach((item) => {
      totalQty += item.quantity;
      if (item.quantity === 0) outOfStock++;
      else if (item.quantity <= (item.reorderPoint ?? 20)) lowStock++;
    });
    return { totalQty, lowStock, outOfStock };
  }, [inventoryItems]);

  // ── Status Badge ───────────────────────────────────────────────────────────

  const getStatusBadge = (item) => {
    const threshold = item.reorderPoint ?? 20;
    if (item.quantity === 0)
      return (
        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
          <i className="fa-solid fa-triangle-exclamation mr-1"></i>Out of Stock
        </span>
      );
    if (item.quantity <= threshold)
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
          <i className="fa-solid fa-bell mr-1"></i>Low Stock
        </span>
      );
    return (
      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
        <i className="fa-solid fa-circle-check mr-1"></i>In Stock
      </span>
    );
  };

  // ── Modal & Form Handlers ──────────────────────────────────────────────────

  const handleOpenModal = (mode, item = null) => {
    setModalMode(mode);
    setActiveItem(item);
    if (mode === "add") {
      setFormData({
        name: "",
        category: "Electronics",
        maxStock: 100,
        reorderPoint: 20,
        location: "",
        description: "",
        unit: "pcs",
        addQuantity: 0,
      });
    } else if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        maxStock: item.maxStock,
        reorderPoint: item.reorderPoint ?? 20,
        location: item.location,
        description: item.description || "",
        unit: item.unit || "pcs",
        addQuantity: 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveItem(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["maxStock", "reorderPoint", "addQuantity"].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        // quantity starts at 0; user can restock separately if needed
        const payload = {
          name: formData.name,
          category: formData.category,
          maxStock: formData.maxStock,
          reorderPoint: formData.reorderPoint,
          location: formData.location,
          description: formData.description,
          unit: formData.unit,
          quantity: formData.addQuantity, // initial stock
        };
        await apiService.post("/api/inventory", payload);
        toast.success("Item added successfully");
      } else if (modalMode === "edit") {
        // Edit only updates metadata — not quantity
        const payload = {
          name: formData.name,
          category: formData.category,
          maxStock: formData.maxStock,
          reorderPoint: formData.reorderPoint,
          location: formData.location,
          description: formData.description,
          unit: formData.unit,
        };
        await apiService.put(`/api/inventory/${activeItem._id}`, payload);
        toast.success("Item updated successfully");
      } else if (modalMode === "restock") {
        // Restock INCREMENTS quantity — never overwrites
        if (formData.addQuantity <= 0) {
          toast.error("Restock quantity must be a positive number");
          setIsSubmitting(false);
          return;
        }
        await apiService.post(`/api/inventory/${activeItem._id}/restock`, {
          addQuantity: formData.addQuantity,
          notes: formData.notes || "",
        });
        toast.success(`Restocked ${formData.addQuantity} unit(s)`);
      }
      fetchInventory(page, searchQuery, filterCategory);
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${modalMode} item`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?\nThe item will be soft-deleted and can be recovered."))
      return;
    setDeletingId(id);
    try {
      await apiService.delete(`/api/inventory/${id}`);
      toast.success("Item deleted successfully");
      fetchInventory(page, searchQuery, filterCategory);
    } catch (_err) {
      toast.error("Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Table Columns ──────────────────────────────────────────────────────────

  const inventoryColumns = [
    {
      header: "Product Details",
      accessorKey: "name",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 shrink-0">
            {item.category === "Electronics" ? (
              <i className="fa-solid fa-laptop text-gray-500"></i>
            ) : item.category === "Furniture" ? (
              <i className="fa-solid fa-chair text-gray-500"></i>
            ) : item.category === "Network" ? (
              <i className="fa-solid fa-network-wired text-gray-500"></i>
            ) : (
              <i className="fa-solid fa-stapler text-gray-500"></i>
            )}
          </div>
          <div>
            <p className="font-semibold text-[#111418] leading-tight">{item.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.itemId}</p>
            {item.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{item.description}</p>
            )}
          </div>
        </div>
      ),
    },
    { header: "Category", accessorKey: "category" },
    { header: "Location", accessorKey: "location" },
    {
      header: "Stock Level",
      accessorKey: "quantity",
      cell: (item) => {
        const pct = Math.min(100, Math.max(0, (item.quantity / item.maxStock) * 100));
        const color =
          item.quantity === 0
            ? "bg-red-500"
            : item.quantity <= (item.reorderPoint ?? 20)
            ? "bg-yellow-400"
            : "bg-green-500";
        return (
          <div className="flex flex-col gap-1 w-36">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>{item.quantity} {item.unit || "pcs"}</span>
              <span>/ {item.maxStock}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
            </div>
            <p className="text-[10px] text-gray-400">Reorder at {item.reorderPoint ?? 20}</p>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (item) => getStatusBadge(item),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      className: "text-right",
      cellClassName: "text-right",
      cell: (item) => (
        <div className="flex items-center justify-end gap-2 text-gray-400">
          <button
            onClick={() => handleOpenModal("edit", item)}
            disabled={deletingId === item._id}
            className="p-2 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Edit Item"
          >
            <i className="fa-solid fa-pen"></i>
          </button>
          <button
            onClick={() => handleOpenModal("restock", item)}
            disabled={deletingId === item._id}
            className="p-2 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Restock"
          >
            <i className="fa-solid fa-boxes-packing"></i>
          </button>
          <button
            onClick={() => handleDelete(item._id)}
            disabled={deletingId === item._id}
            className="p-2 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete"
          >
            {deletingId === item._id ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-trash-can"></i>
            )}
          </button>
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1 relative">
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
              Track and manage your organisation's inventory, stock levels, and supply locations.
            </p>
          </div>
          <button
            onClick={() => handleOpenModal("add")}
            className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i> Add New Item
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Items", value: total.toLocaleString(), icon: "fa-boxes-stacked", color: "blue" },
            { label: "Active SKUs (this page)", value: inventoryItems.length, icon: "fa-layer-group", color: "green" },
            { label: "Low Stock Alerts", value: stats.lowStock, icon: "fa-triangle-exclamation", color: "yellow" },
            { label: "Out of Stock", value: stats.outOfStock, icon: "fa-ban", color: "red" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-center">
              <div className={`w-12 h-12 bg-${color}-100 rounded-full flex items-center justify-center mr-4`}>
                <i className={`fa-solid ${icon} text-${color}-600 text-xl`}></i>
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <h4 className={`text-2xl font-bold ${color === "blue" ? "text-[#111418]" : `text-${color}-600`}`}>{value}</h4>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Controls */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search item name or ID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 w-full sm:w-auto text-sm"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Data */}
          <DataTable
            columns={inventoryColumns}
            data={inventoryItems}
            isLoading={isLoading}
            emptyMessage="No inventory items found. Add some to get started!"
            keyExtractor={(item) => item._id}
          />

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600 bg-gray-50">
            <p>
              Showing{" "}
              <span className="font-semibold text-gray-900">
                {inventoryItems.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-900">{total}</span> entries
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => fetchInventory(page - 1, searchQuery, filterCategory)}
                disabled={page <= 1 || isLoading}
                className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-2 py-1.5 text-gray-400">…</span>
                    )}
                    <button
                      onClick={() => fetchInventory(p, searchQuery, filterCategory)}
                      disabled={isLoading}
                      className={`px-3 py-1.5 border border-gray-300 rounded transition-colors ${
                        p === page
                          ? "bg-blue-600 text-white font-medium hover:bg-blue-700"
                          : "hover:bg-white bg-gray-100"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => fetchInventory(page + 1, searchQuery, filterCategory)}
                disabled={page >= totalPages || isLoading}
                className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {modalMode === "add"
                  ? "Add New Item"
                  : modalMode === "edit"
                  ? "Edit Item"
                  : "Restock Inventory"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {/* Restock mode — only shows item name (read-only) and addQuantity */}
              {modalMode === "restock" ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-800">{activeItem?.name}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Current: {activeItem?.quantity} / {activeItem?.maxStock} {activeItem?.unit || "pcs"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Units to Add
                      <span className="ml-2 text-xs text-green-600 font-normal">
                        (will be added to current stock)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="addQuantity"
                      min="1"
                      max={activeItem ? activeItem.maxStock - activeItem.quantity : undefined}
                      value={formData.addQuantity}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {activeItem && (
                      <p className="text-xs text-gray-400 mt-1">
                        Max you can add: {activeItem.maxStock - activeItem.quantity} {activeItem.unit || "pcs"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleFormChange}
                      placeholder="e.g. Monthly replenishment"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                /* Add / Edit mode */
                <>
                  {modalMode === "add" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU Code
                        <span className="ml-2 text-xs text-blue-500 font-normal">Auto-generated by server</span>
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-mono text-sm">
                        INV-XXXXX (assigned on save)
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      required
                      placeholder="Product title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      placeholder="Optional short description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        name="unit"
                        value={formData.unit}
                        onChange={handleFormChange}
                        placeholder="pcs"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location *</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleFormChange}
                      required
                      placeholder="e.g. Server Room A"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity *</label>
                      <input
                        type="number"
                        name="maxStock"
                        min="1"
                        value={formData.maxStock}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reorder At
                        <span className="ml-1 text-xs text-gray-400">(low-stock threshold)</span>
                      </label>
                      <input
                        type="number"
                        name="reorderPoint"
                        min="0"
                        value={formData.reorderPoint}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  {modalMode === "add" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
                      <input
                        type="number"
                        name="addQuantity"
                        min="0"
                        value={formData.addQuantity}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className={modalMode === "restock" ? "fa-solid fa-box" : "fa-solid fa-check"}></i>
                  )}
                  {isSubmitting
                    ? modalMode === "add"
                      ? "Creating…"
                      : modalMode === "edit"
                      ? "Saving…"
                      : "Restocking…"
                    : modalMode === "add"
                    ? "Create Item"
                    : modalMode === "edit"
                    ? "Save Changes"
                    : "Confirm Restock"}
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
