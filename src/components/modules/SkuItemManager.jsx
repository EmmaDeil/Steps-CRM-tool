import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";
import bwipjs from "bwip-js/browser"; // For generating printable barcodes in the browser

const SkuItemManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModal, setDeleteModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategorySubmitting, setIsCategorySubmitting] = useState(false);
  const [formData, setFormData] = useState(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "ITEM-";
    for (let i = 0; i < 8; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    return {
      name: "",
      sku: code,
      category: "",
      description: "",
      unitPrice: "",
      unit: "Pieces",
      isActive: true,
    };
  });

  const unitOptions = [
    "Pieces",
    "Boxes",
    "Cartons",
    "Pallets",
    "Sets",
    "Units",
    "Kilograms",
    "Liters",
    "Meters",
    "Square Meters",
  ];

  const categoryOptions = categories.map((cat) => cat.name).filter(Boolean);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/sku-items");
      setItems(response.data || response || []);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiService.get("/api/sku-categories");
      setCategories(response.data || response || []);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const generateSku = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "ITEM-";
    for (let i = 0; i < 8; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: generateSku(),
      category: categoryOptions[0] || "",
      description: "",
      unitPrice: "",
      unit: "Pieces",
      isActive: true,
    });
    setEditItem(null);
    setShowForm(false);
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Category name is required");
      return;
    }

    setIsCategorySubmitting(true);
    try {
      const created = await apiService.post("/api/sku-categories", { name });
      const createdName = created?.name || name;
      toast.success("Category created");
      setShowCategoryForm(false);
      setNewCategoryName("");
      await fetchCategories();
      setFormData((prev) => ({ ...prev, category: createdName }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create category");
    } finally {
      setIsCategorySubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      toast.error("Item name and SKU code are required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editItem) {
        await apiService.put(`/api/sku-items/${editItem._id}`, formData);
        toast.success("Item updated successfully");
      } else {
        await apiService.post("/api/sku-items", formData);
        toast.success("Item created successfully");
      }
      resetForm();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category || "",
      description: item.description || "",
      unitPrice: item.unitPrice || "",
      unit: item.unit || "Pieces",
      isActive: item.isActive !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await apiService.delete(`/api/sku-items/${deleteModal._id}`);
      toast.success("Item deleted");
      setDeleteModal(null);
      fetchItems();
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handlePrintLabel = (item) => {
    try {
      const canvas = document.createElement("canvas");
      bwipjs.toCanvas(canvas, {
        bcid: "code128", // Barcode type
        text: item.sku, // Text to encode
        scale: 3, // 3x scaling factor
        height: 12, // Bar height, in millimeters
        includetext: true, // Show human-readable text
        textxalign: "center", // Always good to set this
      });

      const dataUrl = canvas.toDataURL("image/png");

      const printWindow = window.open("", "_blank", "width=600,height=400");
      if (!printWindow) {
        toast.error("Please allow popups to print labels");
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Label - ${item.sku}</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 1cm; }
                .no-print { display: none !important; }
              }
              body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding-top: 40px; background: #f9fafb; }
              .label-card { background: white; display: inline-block; padding: 24px 32px; border: 1px dashed #cbd5e1; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
              .company { font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px; }
              .name { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; }
              img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
              .print-btn { margin-top: 30px; padding: 10px 24px; background: #137fec; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 16px; }
              .print-btn:hover { background: #0e65c0; }
            </style>
          </head>
          <body>
            <div class="label-card">
              <div class="company">STEPS INVENTORY</div>
              <div class="name">${item.name}</div>
              <img src="${dataUrl}" alt="Barcode for ${item.sku}" />
            </div>
            <br />
            <button class="print-btn no-print" onclick="window.print()">Print Label</button>
            <script>
              window.onload = () => { setTimeout(() => { window.print(); }, 300); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate barcode");
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#111418]">
            Item / SKU Management
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage items available for material requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryForm(true)}
            className="px-4 py-2 bg-white text-[#137fec] border border-[#137fec] rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium text-sm"
          >
            <i className="fa-solid fa-tags"></i>
            Create Category
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium text-sm"
          >
            <i className="fa-solid fa-plus"></i>
            Add New Item
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search items by name, SKU, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <i className="fa-solid fa-spinner fa-spin text-2xl text-blue-500"></i>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <i className="fa-solid fa-box-open text-4xl mb-3 opacity-30"></i>
            <p className="text-sm">
              {searchQuery
                ? "No items match your search"
                : "No items added yet"}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  SKU Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-[#111418]">
                    {item.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.category || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.unit}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.unitPrice
                      ? Number(item.unitPrice).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handlePrintLabel(item)}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Print Barcode Label"
                      >
                        <i className="fa-solid fa-print text-sm"></i>
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-gray-500 hover:text-[#137fec] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen-to-square text-sm"></i>
                      </button>
                      <button
                        onClick={() => setDeleteModal(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111418]">
                {editItem ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. A4 Printing Paper"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU Code <span className="text-red-500">*</span>
                  </label>
                  {editItem ? (
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="e.g. OFF-PAP-001"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none"
                      required
                    />
                  ) : (
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-mono uppercase text-gray-600">
                      {formData.sku}
                      <span className="ml-2 text-xs text-gray-400 normal-case">
                        {/* (Auto-generated) */}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none appearance-none"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none appearance-none"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price
                  </label>
                  <input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of the item..."
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm text-gray-700">Active</span>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#137fec] hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  )}
                  {isSubmitting
                    ? editItem
                      ? "Updating..."
                      : "Creating..."
                    : editItem
                      ? "Update Item"
                      : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCategoryForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111418]">
                Create Category
              </h3>
              <button
                onClick={() => {
                  setShowCategoryForm(false);
                  setNewCategoryName("");
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Medical Supplies"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#137fec]/20 focus:border-[#137fec] outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setNewCategoryName("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCategorySubmitting}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#137fec] hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCategorySubmitting && (
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                  )}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <i className="fa-solid fa-trash text-red-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-bold text-[#111418] mb-2">
                Delete Item
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                Are you sure you want to delete{" "}
                <strong>{deleteModal.name}</strong>?
              </p>
              <p className="text-xs text-gray-500 mb-6">
                SKU: {deleteModal.sku} — This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkuItemManager;
