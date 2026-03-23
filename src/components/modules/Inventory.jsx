import React, { useState, useEffect, useCallback } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import DataTable from "../common/DataTable";
import StockTransfer from "./StockTransfer";
import StockMovements from "./StockMovements";
import StoreLocations from "./StoreLocations";
import { useAuth } from "../../context/useAuth";
import useBarcodeScanner from "../../hooks/useBarcodeScanner";
import BarcodeScannerModal from "./BarcodeScannerModal";

const PAGE_SIZE = 20;
const DEFAULT_UNIT_OPTIONS = [];

const formatDateForInput = (value) => {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
};

const parseUnitFromName = (name) => {
  const match = String(name || "").match(
    /\bof\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\b/i,
  );
  if (!match) return null;
  const qty = Number(match[1]);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return {
    baseQuantity: qty,
    baseUnitLabel: String(match[2] || "")
      .trim()
      .toLowerCase(),
  };
};

const Inventory = () => {
  const { user } = useAuth();
  const isAdmin = ["admin", "administrator"].includes(
    String(user?.role || "")
      .trim()
      .toLowerCase(),
  );

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("items"); // "items" | "transfers"

  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [expiringWindowDays, setExpiringWindowDays] = useState(30);
  const [expiringItems, setExpiringItems] = useState([]);
  const [isExpiringLoading, setIsExpiringLoading] = useState(false);
  const [unitOptions, setUnitOptions] = useState(DEFAULT_UNIT_OPTIONS);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([]);
  const [isUnitsLoading, setIsUnitsLoading] = useState(false);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [isUnitSubmitting, setIsUnitSubmitting] = useState(false);
  const [unitForm, setUnitForm] = useState({
    name: "",
    symbol: "",
    description: "",
    unitCategory: "custom",
    baseQuantity: 1,
    baseUnitLabel: "unit",
    sortOrder: 0,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" | "edit" | "restock" | "issue" | "transfer"
  const [activeItem, setActiveItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    maxStock: 100,
    reorderPoint: 20,
    location: "",
    description: "",
    unit: "",
    addQuantity: 1,
    lotNumber: "",
    refNumber: "",
    notes: "",
    issueTo: "",
    issueToType: "department",
    manufacturingDate: "",
    expiryDate: "",
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // ── Scanner Logic ──────────────────────────────────────────────────────────

  const handleBarcodeScan = async (code) => {
    setIsScannerOpen(false); // Close camera if open

    const loadingToast = toast.loading(`Scanning ${code}...`);
    try {
      const res = await apiService.get(`/api/inventory/scan/${code}`);
      toast.dismiss(loadingToast);

      if (res.found && res.item) {
        toast.success(`Found: ${res.item.name}`);
        handleOpenModal("restock", res.item);
      } else if (res.isNewSku) {
        toast.success("New SKU Detected");
        handleOpenModal("add");
        setFormData((prev) => ({
          ...prev,
          name: res.skuData.name,
          category: res.skuData.category || categoryOptions[0] || "",
          description: res.skuData.description || "",
        }));
      }
    } catch (err) {
      toast.dismiss(loadingToast);
      if (err.response?.status === 404) {
        toast.error(`No item found for barcode ${code}`);
      } else {
        toast.error("Error processing scan");
      }
    }
  };

  useBarcodeScanner(handleBarcodeScan);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchInventory = useCallback(
    async (pageNum = 1, search = "", category = "All") => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams({ page: pageNum, limit: PAGE_SIZE });
        if (search) params.set("search", search);
        if (category !== "All") params.set("category", category);
        const res = await apiService.get(`/api/inventory?${params.toString()}`);
        const items = res?.items || [];
        setInventoryItems(items);
        setTotal(res?.total || 0);
        setTotalPages(res?.totalPages || 1);
        setPage(pageNum);

        // Fallback categories from existing inventory records.
        setCategoryOptions((prev) => {
          if (prev.length > 0) return prev;
          const derived = Array.from(
            new Set(
              items
                .map((it) => String(it?.category || "").trim())
                .filter(Boolean),
            ),
          );
          return derived;
        });
      } catch {
        toast.error("Failed to load inventory data");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const [locations, setLocations] = useState([]);
  const fetchCategoryOptions = useCallback(async () => {
    try {
      const res = await apiService.get("/api/sku-categories");
      const names = (res?.data || res || [])
        .map((c) => String(c?.name || "").trim())
        .filter(Boolean);
      const unique = Array.from(new Set(names));
      setCategoryOptions(unique);
      setFormData((prev) => {
        if (prev.category) return prev;
        return { ...prev, category: unique[0] || "" };
      });
    } catch {
      // Keep UI usable if categories endpoint is temporarily unavailable.
    }
  }, []);
  const fetchExpiringItems = useCallback(
    async (days = expiringWindowDays) => {
      try {
        setIsExpiringLoading(true);
        const response = await apiService.get(
          `/api/inventory/alerts/expiring?days=${days}`,
        );
        setExpiringItems(response?.items || []);
      } catch {
        toast.error("Failed to load expiring inventory items");
      } finally {
        setIsExpiringLoading(false);
      }
    },
    [expiringWindowDays],
  );

  const fetchUnitsOfMeasure = useCallback(
    async ({ includeInactive = false } = {}) => {
      try {
        setIsUnitsLoading(true);
        const endpoint = includeInactive
          ? "/api/inventory/units?includeInactive=true"
          : "/api/inventory/units";
        const res = await apiService.get(endpoint);
        const units = Array.isArray(res?.items) ? res.items : [];
        setUnitsOfMeasure(units);

        const activeNames = units
          .filter((unit) => unit?.isActive !== false)
          .map((unit) => String(unit?.name || "").trim())
          .filter(Boolean);

        const merged = Array.from(new Set([...activeNames]));
        setUnitOptions(merged.length > 0 ? merged : DEFAULT_UNIT_OPTIONS);

        setFormData((prev) => {
          if (prev.unit && merged.includes(prev.unit)) return prev;
          return { ...prev, unit: merged[0] || "" };
        });
      } catch {
        setUnitOptions(DEFAULT_UNIT_OPTIONS);
      } finally {
        setIsUnitsLoading(false);
      }
    },
    [],
  );

  const fetchLocations = useCallback(async () => {
    try {
      const res = await apiService.get("/api/store-locations");
      setLocations(res);
    } catch {
      // silently fail if no permission or network
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchLocations();
    fetchCategoryOptions();
  }, [fetchInventory, fetchLocations, fetchCategoryOptions]);

  useEffect(() => {
    fetchUnitsOfMeasure({ includeInactive: isAdmin });
  }, [fetchUnitsOfMeasure, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(
      () => fetchInventory(1, searchQuery, filterCategory),
      400,
    );
    return () => clearTimeout(timer);
  }, [searchQuery, filterCategory, fetchInventory]);

  useEffect(() => {
    if (activeTab === "expiring") {
      fetchExpiringItems(expiringWindowDays);
    }
  }, [activeTab, expiringWindowDays, fetchExpiringItems]);

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

  // ── Modal Handlers ─────────────────────────────────────────────────────────

  const handleOpenModal = (mode, item = null) => {
    setModalMode(mode);
    setActiveItem(item);
    if (mode === "add") {
      setFormData({
        name: "",
        category: categoryOptions[0] || "",
        maxStock: 100,
        reorderPoint: 20,
        location: locations.length > 0 ? locations[0].name : "General Store",
        description: "",
        unit: unitOptions[0] || "",
        addQuantity: 0,
        lotNumber: "",
        refNumber: "",
        notes: "",
        issueTo: "",
        issueToType: "department",
        destinationName: "",
        manufacturingDate: "",
        expiryDate: "",
      });
    } else if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        maxStock: item.maxStock,
        reorderPoint: item.reorderPoint ?? 20,
        location:
          item.location ||
          (locations.length > 0 ? locations[0].name : "General Store"),
        description: item.description || "",
        unit: item.unit || unitOptions[0] || "",
        addQuantity: 1,
        lotNumber: item.lotNumber || "",
        refNumber: item.refNumber || "",
        notes: "",
        issueTo: "",
        issueToType: "department",
        destinationName: "",
        manufacturingDate: formatDateForInput(
          item.manufacturingDate || item.productionDate,
        ),
        expiryDate: formatDateForInput(item.expiryDate),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setActiveItem(null);
  };

  const handleOpenUnitModal = (unit = null) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit?.name || "",
      symbol: unit?.symbol || "",
      description: unit?.description || "",
      unitCategory: unit?.unitCategory || "custom",
      baseQuantity: Number(unit?.baseQuantity || 1),
      baseUnitLabel: unit?.baseUnitLabel || "unit",
      sortOrder: Number(unit?.sortOrder || 0),
    });
    setIsUnitModalOpen(true);
  };

  const handleCloseUnitModal = () => {
    setIsUnitModalOpen(false);
    setEditingUnit(null);
    setUnitForm({
      name: "",
      symbol: "",
      description: "",
      unitCategory: "custom",
      baseQuantity: 1,
      baseUnitLabel: "unit",
      sortOrder: 0,
    });
  };

  const handleUnitFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      const parsed = parseUnitFromName(value);
      setUnitForm((prev) => ({
        ...prev,
        name: value,
        baseQuantity:
          parsed && (prev.baseQuantity === 1 || !prev.baseQuantity)
            ? parsed.baseQuantity
            : prev.baseQuantity,
        baseUnitLabel:
          parsed && !String(prev.baseUnitLabel || "").trim()
            ? parsed.baseUnitLabel || prev.baseUnitLabel
            : prev.baseUnitLabel,
      }));
      return;
    }
    setUnitForm((prev) => ({
      ...prev,
      [name]: ["sortOrder", "baseQuantity"].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const name = String(unitForm.name || "").trim();
    if (!name) {
      toast.error("Unit name is required");
      return;
    }
    if (
      !Number.isFinite(Number(unitForm.baseQuantity)) ||
      Number(unitForm.baseQuantity) <= 0
    ) {
      toast.error("Base quantity must be a positive number");
      return;
    }
    if (!String(unitForm.baseUnitLabel || "").trim()) {
      toast.error("Base unit is required");
      return;
    }

    try {
      setIsUnitSubmitting(true);
      const payload = {
        name,
        symbol: String(unitForm.symbol || "").trim(),
        description: String(unitForm.description || "").trim(),
        unitCategory: String(unitForm.unitCategory || "custom").trim(),
        baseQuantity: Number(unitForm.baseQuantity || 1),
        baseUnitLabel: String(unitForm.baseUnitLabel || "unit").trim(),
        sortOrder: Number(unitForm.sortOrder || 0),
      };

      if (editingUnit?._id) {
        await apiService.put(
          `/api/inventory/units/${editingUnit._id}`,
          payload,
        );
        toast.success("Unit of measure updated");
      } else {
        await apiService.post("/api/inventory/units", payload);
        toast.success("Unit of measure created");
      }

      // Refresh both active units (for form dropdown) and all units (for admin modal)
      await fetchUnitsOfMeasure({ includeInactive: false });
      await fetchUnitsOfMeasure({ includeInactive: true });
      handleCloseUnitModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save unit");
    } finally {
      setIsUnitSubmitting(false);
    }
  };

  const handleDeactivateUnit = async (unitId) => {
    if (!isAdmin) return;
    const confirmed = window.confirm("Deactivate this unit of measure?");
    if (!confirmed) return;

    try {
      await apiService.delete(`/api/inventory/units/${unitId}`);
      toast.success("Unit of measure deactivated");
      // Refresh both active and inactive lists
      await fetchUnitsOfMeasure({ includeInactive: false });
      await fetchUnitsOfMeasure({ includeInactive: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to deactivate unit");
    }
  };

  const handleReactivateUnit = async (unit) => {
    if (!isAdmin || !unit?._id) return;

    try {
      await apiService.put(`/api/inventory/units/${unit._id}`, {
        isActive: true,
      });
      toast.success("Unit of measure reactivated");
      // Refresh both active and inactive lists
      await fetchUnitsOfMeasure({ includeInactive: false });
      await fetchUnitsOfMeasure({ includeInactive: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reactivate unit");
    }
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
      if ((modalMode === "add" || modalMode === "edit") && !formData.unit) {
        toast.error("Select a unit from Unit Setup before saving this item");
        setIsSubmitting(false);
        return;
      }

      if (modalMode === "add") {
        await apiService.post("/api/inventory", {
          name: formData.name,
          category: formData.category,
          maxStock: formData.maxStock,
          reorderPoint: formData.reorderPoint,
          location: formData.location || "General Store",
          description: formData.description,
          unit: formData.unit,
          quantity: formData.addQuantity,
          lotNumber: formData.lotNumber || "",
          refNumber: formData.refNumber || "",
          productionDate: formData.manufacturingDate || null,
          manufacturingDate: formData.manufacturingDate || null,
          expiryDate: formData.expiryDate || null,
        });
        toast.success("Item added successfully");
      } else if (modalMode === "edit") {
        await apiService.put(`/api/inventory/${activeItem._id}`, {
          name: formData.name,
          category: formData.category,
          maxStock: formData.maxStock,
          reorderPoint: formData.reorderPoint,
          location: formData.location,
          description: formData.description,
          unit: formData.unit,
          lotNumber: formData.lotNumber || "",
          refNumber: formData.refNumber || "",
          productionDate: formData.manufacturingDate || null,
          manufacturingDate: formData.manufacturingDate || null,
          expiryDate: formData.expiryDate || null,
        });
        toast.success("Item updated successfully");
      } else if (modalMode === "restock") {
        if (formData.addQuantity <= 0) {
          toast.error("Restock quantity must be positive");
          setIsSubmitting(false);
          return;
        }
        await apiService.post(`/api/inventory/${activeItem._id}/restock`, {
          addQuantity: formData.addQuantity,
          notes: formData.notes || "",
          lotNumber: formData.lotNumber || "",
          refNumber: formData.refNumber || "",
          productionDate: formData.manufacturingDate || null,
          manufacturingDate: formData.manufacturingDate || null,
          expiryDate: formData.expiryDate || null,
          locationName: activeItem.location,
        });
        toast.success(`Restocked ${formData.addQuantity} unit(s)`);
      } else if (modalMode === "issue") {
        if (formData.addQuantity <= 0) {
          toast.error("Issue quantity must be positive");
          setIsSubmitting(false);
          return;
        }
        await apiService.post(`/api/inventory-issues`, {
          issuedTo: formData.issueTo,
          issuedToType: formData.issueToType,
          notes: formData.notes,
          lineItems: [
            { inventoryItemId: activeItem._id, qty: formData.addQuantity },
          ],
        });
        toast.success(
          `Issued ${formData.addQuantity} unit(s) to ${formData.issueTo}`,
        );
      } else if (modalMode === "transfer") {
        if (formData.addQuantity <= 0) {
          toast.error("Transfer quantity must be positive");
          setIsSubmitting(false);
          return;
        }
        if (!formData.issueTo) {
          toast.error("Destination location ID is required");
          setIsSubmitting(false);
          return;
        }
        if (!formData.destinationName) {
          toast.error("Destination location name is required");
          setIsSubmitting(false);
          return;
        }

        await apiService.post("/api/stock-transfers", {
          fromLocationId: activeItem.locationId || "unspecified",
          fromLocationName: activeItem.location || "General Store",
          toLocationId: formData.issueTo,
          toLocationName: formData.destinationName,
          lineItems: [
            {
              inventoryItemId: activeItem._id,
              itemName: activeItem.name,
              itemCode: activeItem.itemId,
              unit: activeItem.unit || "pcs",
              requestedQty: formData.addQuantity,
            },
          ],
          notes: formData.notes || `Transfer from inventory list.`,
        });
        toast.success(
          `Transfer request created for ${formData.addQuantity} unit(s)`,
        );
      }
      fetchInventory(page, searchQuery, filterCategory);
      handleCloseModal();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || `Failed to ${modalMode} item`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this item? It will be soft-deleted and recoverable.",
      )
    )
      return;
    setDeletingId(id);
    try {
      await apiService.delete(`/api/inventory/${id}`);
      toast.success("Item deleted successfully");
      fetchInventory(page, searchQuery, filterCategory);
    } catch {
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
            <p className="font-semibold text-[#111418] leading-tight">
              {item.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{item.itemId}</p>
            {item.description && (
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                {item.description}
              </p>
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
        const pct = Math.min(
          100,
          Math.max(0, (item.quantity / item.maxStock) * 100),
        );
        const color =
          item.quantity === 0
            ? "bg-red-500"
            : item.quantity <= (item.reorderPoint ?? 20)
              ? "bg-yellow-400"
              : "bg-green-500";
        const hasLocations = item.stockLevels && item.stockLevels.length > 0;
        return (
          <div className="flex flex-col gap-1 w-40">
            <div className="flex justify-between text-xs text-gray-600 font-medium">
              <span>
                {item.quantity} {item.unit || "pcs"}
              </span>
              <span>/ {item.maxStock}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${color}`}
                style={{ width: `${pct}%` }}
              ></div>
            </div>
            {hasLocations ? (
              <div className="mt-1 space-y-0.5">
                {item.stockLevels.map((sl, i) => (
                  <div
                    key={i}
                    className="flex justify-between text-[10px] text-gray-500"
                  >
                    <span
                      className="truncate max-w-[90px]"
                      title={sl.locationName}
                    >
                      {sl.locationName}
                    </span>
                    <span className="font-medium text-gray-700">
                      {sl.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-400">
                Reorder at {item.reorderPoint ?? 20}
              </p>
            )}
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
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={() => handleOpenModal("edit", item)}
            disabled={deletingId === item._id}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Edit Item"
          >
            <i className="fa-solid fa-pen text-sm"></i>
          </button>

          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>

          <button
            onClick={() => handleOpenModal("restock", item)}
            disabled={deletingId === item._id}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
            title="Restock Item"
          >
            <i className="fa-solid fa-boxes-packing text-sm"></i>
          </button>

          <button
            onClick={() => handleOpenModal("issue", item)}
            disabled={deletingId === item._id || item.quantity === 0}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
            title="Issue Stock"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-sm"></i>
          </button>

          <div className="w-px h-4 bg-gray-200 hidden sm:block"></div>

          <button
            onClick={() => handleOpenModal("transfer", item)}
            disabled={deletingId === item._id || item.quantity === 0}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
            title="Transfer Stock"
          >
            <i className="fa-solid fa-right-left text-sm"></i>
          </button>

          <button
            onClick={() => handleDelete(item._id)}
            disabled={deletingId === item._id}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete Item"
          >
            {deletingId === item._id ? (
              <i className="fa-solid fa-spinner fa-spin text-sm"></i>
            ) : (
              <i className="fa-solid fa-trash-can text-sm"></i>
            )}
          </button>
        </div>
      ),
    },
  ];

  const expiringColumns = [
    {
      header: "Product",
      accessorKey: "name",
      cell: (item) => (
        <div>
          <p className="font-semibold text-[#111418]">{item.name}</p>
          <p className="text-xs text-gray-500">{item.itemId}</p>
        </div>
      ),
    },
    {
      header: "Category",
      accessorKey: "category",
      cell: (item) => item.category || "-",
    },
    {
      header: "Qty",
      accessorKey: "quantity",
      cell: (item) => item.quantity ?? 0,
    },
    {
      header: "Batches",
      accessorKey: "batches",
      cell: (item) => (Array.isArray(item.batches) ? item.batches.length : 0),
    },
    {
      header: "Next Expiry",
      accessorKey: "nextExpiry",
      cell: (item) => {
        if (!item.nextExpiry) return "-";
        const expiryDate = new Date(item.nextExpiry);
        const dayDiff = Math.ceil(
          (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        const colorClass =
          dayDiff <= 7
            ? "text-red-600"
            : dayDiff <= 14
              ? "text-amber-600"
              : "text-gray-700";
        return (
          <div>
            <p className={`font-medium ${colorClass}`}>
              {expiryDate.toLocaleDateString()}
            </p>
            <p className="text-xs text-gray-500">{dayDiff} day(s) left</p>
          </div>
        );
      },
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
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#111418] mb-2">
              Inventory Management
            </h2>
            <p className="text-gray-600">
              Track and manage your organisation's inventory, stock levels, and
              supply locations.
            </p>
          </div>
          {activeTab === "items" && (
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => handleOpenUnitModal()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-ruler-combined"></i> Unit Setup
                </button>
              )}
              <button
                onClick={() => handleOpenModal("add")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i> Add New Item
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              {
                key: "items",
                label: "Inventory Items",
                icon: "fa-boxes-stacked",
              },
              {
                key: "transfers",
                label: "Stock Transfers",
                icon: "fa-arrow-right-arrow-left",
              },
              ...(isAdmin
                ? [
                    {
                      key: "locations",
                      label: "Store Locations",
                      icon: "fa-map-location-dot",
                    },
                  ]
                : []),
              {
                key: "movements",
                label: "Stock Movements",
                icon: "fa-clock-rotate-left",
              },
              {
                key: "expiring",
                label: "Expiring Items",
                icon: "fa-hourglass-end",
              },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── Items Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "items" && (
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
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

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
                of <span className="font-semibold text-gray-900">{total}</span>{" "}
                entries
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    fetchInventory(page - 1, searchQuery, filterCategory)
                  }
                  disabled={page <= 1 || isLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                  )
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-2 py-1.5 text-gray-400">…</span>
                      )}
                      <button
                        onClick={() =>
                          fetchInventory(p, searchQuery, filterCategory)
                        }
                        disabled={isLoading}
                        className={`px-3 py-1.5 border border-gray-300 rounded transition-colors ${p === page ? "bg-blue-600 text-white font-medium hover:bg-blue-700" : "hover:bg-white bg-gray-100"}`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  onClick={() =>
                    fetchInventory(page + 1, searchQuery, filterCategory)
                  }
                  disabled={page >= totalPages || isLoading}
                  className="px-3 py-1.5 border border-gray-300 rounded hover:bg-white transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Transfers Tab ─────────────────────────────────────────────────── */}
        {activeTab === "transfers" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <StockTransfer />
          </div>
        )}

        {/* ── Expiring Items Tab ─────────────────────────────────────────────── */}
        {activeTab === "expiring" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111418]">
                  Expiry Watchlist
                </h3>
                <p className="text-sm text-gray-600">
                  Items with stock batches nearing expiry.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={expiringWindowDays}
                  onChange={(e) =>
                    setExpiringWindowDays(Number(e.target.value))
                  }
                  className="px-3 py-2 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value={7}>Next 7 days</option>
                  <option value={14}>Next 14 days</option>
                  <option value={30}>Next 30 days</option>
                  <option value={60}>Next 60 days</option>
                  <option value={90}>Next 90 days</option>
                </select>
                <button
                  onClick={() => fetchExpiringItems(expiringWindowDays)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  <i className="fa-solid fa-rotate-right mr-1"></i>Refresh
                </button>
              </div>
            </div>

            <DataTable
              columns={expiringColumns}
              data={expiringItems}
              isLoading={isExpiringLoading}
              emptyMessage="No expiring items in the selected window."
              keyExtractor={(item) => item._id}
            />
          </div>
        )}

        {/* ── Locations Tab ─────────────────────────────────────────────────── */}
        {activeTab === "locations" && isAdmin && <StoreLocations />}

        {/* ── Movements Tab ─────────────────────────────────────────────────── */}
        {activeTab === "movements" && <StockMovements />}
      </div>

      {/* ── Units of Measure Modal (Admin) ─────────────────────────────────── */}
      {isUnitModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Unit Setup</h3>
              <button
                onClick={handleCloseUnitModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="text-base font-semibold text-gray-800 mb-3">
                  {editingUnit ? "Edit Unit Option" : "Create Unit Option"}
                </h4>
                <form onSubmit={handleSaveUnit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={unitForm.name}
                      onChange={handleUnitFormChange}
                      placeholder="e.g. Pack of 12"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      This is what users will see in item forms.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Short Label (optional)
                    </label>
                    <input
                      type="text"
                      name="symbol"
                      value={unitForm.symbol}
                      onChange={handleUnitFormChange}
                      placeholder="e.g. pack"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        name="unitCategory"
                        value={unitForm.unitCategory}
                        onChange={handleUnitFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="count">Count</option>
                        <option value="volume">Volume</option>
                        <option value="weight">Weight</option>
                        <option value="length">Length</option>
                        <option value="area">Area</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base Quantity *
                      </label>
                      <input
                        type="number"
                        name="baseQuantity"
                        min="0.000001"
                        step="any"
                        value={unitForm.baseQuantity}
                        onChange={handleUnitFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Base Unit *
                      </label>
                      <input
                        type="text"
                        name="baseUnitLabel"
                        value={unitForm.baseUnitLabel}
                        onChange={handleUnitFormChange}
                        placeholder="pcs, ltrs, kg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 -mt-1">
                    Example: Pack of 12 = 12 pcs, Carton of 23 = 23 pcs, Gallon
                    of 50L = 50 ltrs.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      value={unitForm.description}
                      onChange={handleUnitFormChange}
                      placeholder="Optional note for admins"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      name="sortOrder"
                      value={unitForm.sortOrder}
                      onChange={handleUnitFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isUnitSubmitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {isUnitSubmitting
                        ? "Saving..."
                        : editingUnit
                          ? "Update Unit"
                          : "Create Unit"}
                    </button>
                    {editingUnit && (
                      <button
                        type="button"
                        onClick={() => handleOpenUnitModal()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-semibold text-gray-800">
                    Existing Unit Options
                  </h4>
                  <button
                    onClick={() =>
                      fetchUnitsOfMeasure({ includeInactive: true })
                    }
                    className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <i className="fa-solid fa-rotate-right mr-1"></i>Refresh
                  </button>
                </div>

                <div className="max-h-80 overflow-auto divide-y divide-gray-100">
                  {unitsOfMeasure.length === 0 ? (
                    <p className="text-sm text-gray-500 py-8 text-center">
                      No units found yet.
                    </p>
                  ) : (
                    unitsOfMeasure.map((unit) => (
                      <div
                        key={unit._id}
                        className="py-2.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {unit.name}
                            {unit.symbol ? (
                              <span className="text-gray-500">
                                {" "}
                                ({unit.symbol})
                              </span>
                            ) : null}
                          </p>
                          <p className="text-xs text-blue-700">
                            1 {unit.name} = {Number(unit.baseQuantity || 1)}{" "}
                            {unit.baseUnitLabel || "unit"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {unit.description || "No description"}
                          </p>
                          {!unit.isActive && (
                            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenUnitModal(unit)}
                            className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          {unit.isActive ? (
                            <button
                              onClick={() => handleDeactivateUnit(unit._id)}
                              className="px-2.5 py-1.5 text-xs border border-red-200 text-red-700 rounded-md hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateUnit(unit)}
                              className="px-2.5 py-1.5 text-xs border border-green-200 text-green-700 rounded-md hover:bg-green-50"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CRUD Modal ────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`bg-white rounded-xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[90vh] ${
              modalMode === "add" || modalMode === "edit"
                ? "max-w-4xl"
                : "max-w-lg"
            }`}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">
                {modalMode === "add"
                  ? "Add New Item"
                  : modalMode === "edit"
                    ? "Edit Item"
                    : modalMode === "transfer"
                      ? "Transfer Stock"
                      : "Restock Inventory"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto space-y-4"
            >
              {modalMode === "restock" ||
              modalMode === "issue" ||
              modalMode === "transfer" ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-800">
                      {activeItem?.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Current: {activeItem?.quantity} / {activeItem?.maxStock}{" "}
                      {activeItem?.unit || "pcs"}
                    </p>
                    {activeItem?.stockLevels?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {activeItem.stockLevels.map((sl, i) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs text-blue-700"
                          >
                            <span>{sl.locationName}</span>
                            <span className="font-bold">{sl.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {modalMode === "issue" && (
                    <div className="flex gap-3 mb-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Issue To *
                        </label>
                        <input
                          type="text"
                          name="issueTo"
                          value={formData.issueTo}
                          onChange={handleFormChange}
                          required
                          placeholder="Name of department, person, or project"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type
                        </label>
                        <select
                          name="issueToType"
                          value={formData.issueToType}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        >
                          <option value="department">Department</option>
                          <option value="person">Person</option>
                          <option value="project">Project</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                  {modalMode === "transfer" && (
                    <div className="mb-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Destination Location *
                      </label>
                      <select
                        name="issueTo"
                        value={formData.issueTo}
                        onChange={(e) => {
                          const loc = locations.find(
                            (l) => l._id === e.target.value,
                          );
                          setFormData((prev) => ({
                            ...prev,
                            issueTo: e.target.value,
                            destinationName: loc ? loc.name : "",
                          }));
                        }}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm cursor-pointer bg-white"
                      >
                        <option value="" disabled>
                          Select destination...
                        </option>
                        {locations.map((loc) => (
                          <option key={loc._id} value={loc._id}>
                            {loc.name} {loc.code ? `(${loc.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {modalMode === "issue"
                        ? "Units to Issue"
                        : modalMode === "transfer"
                          ? "Units to Transfer"
                          : modalMode === "restock"
                            ? "Units to Restock"
                            : "Units to Add"}{" "}
                      <span className="text-xs text-green-600 font-normal">
                        (
                        {modalMode === "issue" || modalMode === "transfer"
                          ? "deducted from"
                          : "added to"}{" "}
                        current stock)
                      </span>
                    </label>
                    <input
                      type="number"
                      name="addQuantity"
                      min="1"
                      max={
                        modalMode === "issue" || modalMode === "transfer"
                          ? activeItem?.quantity
                          : undefined
                      }
                      value={formData.addQuantity}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />

                    {activeItem &&
                      (modalMode === "issue" || modalMode === "transfer") && (
                        <p className="text-xs text-gray-400 mt-1">
                          Available after {modalMode}:{" "}
                          <strong className="text-blue-600">
                            {Math.max(
                              0,
                              activeItem.quantity -
                                (Number(formData.addQuantity) || 0),
                            )}
                          </strong>{" "}
                          {activeItem.unit || "pcs"}
                        </p>
                      )}
                  </div>
                  {modalMode === "restock" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lot Number
                        </label>
                        <input
                          type="text"
                          name="lotNumber"
                          value={formData.lotNumber || ""}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ref Number
                        </label>
                        <input
                          type="text"
                          name="refNumber"
                          value={formData.refNumber || ""}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Manufacturing Date (Production Date)
                        </label>
                        <input
                          type="date"
                          name="manufacturingDate"
                          value={formData.manufacturingDate || ""}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          name="expiryDate"
                          value={formData.expiryDate || ""}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleFormChange}
                      placeholder={
                        modalMode === "transfer"
                          ? "e.g. Reason for transfer"
                          : "e.g. Monthly replenishment"
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {modalMode === "add" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        SKU Code{" "}
                        <span className="ml-1 text-xs text-blue-500">
                          Auto-generated
                        </span>
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 font-mono text-sm">
                        INV-XXXXX (assigned on save)
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location *
                      </label>
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white cursor-pointer"
                      >
                        <option value="" disabled>
                          Select a location
                        </option>
                        {locations.length === 0 && (
                          <option value="General Store">General Store</option>
                        )}
                        {locations.map((loc) => (
                          <option key={loc._id} value={loc.name}>
                            {loc.name} {loc.code ? `(${loc.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-36">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleFormChange}
                        disabled={unitOptions.length === 0}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-white"
                      >
                        {unitOptions.length === 0 && (
                          <option value="">No active units configured</option>
                        )}
                        {Array.from(
                          new Set(
                            [...(unitOptions || []), formData.unit].filter(
                              Boolean,
                            ),
                          ),
                        ).map((unit) => (
                          <option key={unit} value={unit}>
                            {(() => {
                              const meta = (unitsOfMeasure || []).find(
                                (row) =>
                                  String(row?.name || "").trim() === unit,
                              );
                              if (!meta) return unit;
                              return `${unit} (1 = ${Number(meta.baseQuantity || 1)} ${meta.baseUnitLabel || "unit"})`;
                            })()}
                          </option>
                        ))}
                      </select>
                      {isUnitsLoading && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Loading units...
                        </p>
                      )}
                      {!isUnitsLoading && unitOptions.length === 0 && (
                        <p className="text-[11px] text-amber-700 mt-1">
                          Ask an admin to add unit options in Unit Setup.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Lot Number
                      </label>
                      <input
                        type="text"
                        name="lotNumber"
                        value={formData.lotNumber || ""}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ref Number
                      </label>
                      <input
                        type="text"
                        name="refNumber"
                        value={formData.refNumber || ""}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Manufacturing Date (Production Date) *
                      </label>
                      <input
                        type="date"
                        name="manufacturingDate"
                        value={formData.manufacturingDate || ""}
                        onChange={handleFormChange}
                        required={modalMode === "add"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate || ""}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Capacity *
                      </label>
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
                        Reorder At{" "}
                        <span className="text-xs text-gray-400">
                          (threshold)
                        </span>
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Quantity
                      </label>
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
                    <i
                      className={
                        modalMode === "restock"
                          ? "fa-solid fa-box"
                          : modalMode === "issue" || modalMode === "transfer"
                            ? "fa-solid fa-arrow-right-from-bracket"
                            : "fa-solid fa-check"
                      }
                    ></i>
                  )}
                  {isSubmitting
                    ? modalMode === "add"
                      ? "Creating…"
                      : modalMode === "edit"
                        ? "Saving…"
                        : modalMode === "issue"
                          ? "Issuing…"
                          : modalMode === "transfer"
                            ? "Transferring…"
                            : "Restocking…"
                    : modalMode === "add"
                      ? "Create Item"
                      : modalMode === "edit"
                        ? "Save Changes"
                        : modalMode === "issue"
                          ? "Confirm Issue"
                          : modalMode === "transfer"
                            ? "Confirm Transfer"
                            : "Confirm Restock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Floating Barcode Button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#137fec] text-white rounded-full shadow-lg hover:bg-blue-600 hover:scale-105 transition-all flex items-center justify-center z-40 group"
        title="Scan Barcode / QR Code"
      >
        <i className="fa-solid fa-qrcode text-2xl group-hover:scale-110 transition-transform"></i>
      </button>

      {/* Camera Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScan={handleBarcodeScan}
        />
      )}
    </div>
  );
};

export default Inventory;
