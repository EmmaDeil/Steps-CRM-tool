import React, { useState, useEffect, useRef, useCallback } from "react";
import Breadcrumb from "../Breadcrumb";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";

// ─── Helpers ─────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);

// ─── Progress Bar ─────────────────────────────────────────
const ProgressBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

// ─── Summary Card ─────────────────────────────────────────
const SummaryCard = ({ icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}
    >
      <i className={`fa-solid ${icon} text-white text-lg`}></i>
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  </div>
);

// ─── Icon / color options for new line modal ──────────────
const ICON_OPTIONS = [
  {
    icon: "fa-wallet",
    label: "Wallet",
    color: "text-blue-600",
    bar: "bg-blue-500",
  },
  {
    icon: "fa-people-group",
    label: "People",
    color: "text-indigo-600",
    bar: "bg-indigo-500",
  },
  {
    icon: "fa-gears",
    label: "Operations",
    color: "text-emerald-600",
    bar: "bg-emerald-500",
  },
  {
    icon: "fa-bullhorn",
    label: "Marketing",
    color: "text-purple-600",
    bar: "bg-purple-500",
  },
  {
    icon: "fa-server",
    label: "IT",
    color: "text-cyan-600",
    bar: "bg-cyan-500",
  },
  {
    icon: "fa-plane",
    label: "Travel",
    color: "text-orange-600",
    bar: "bg-orange-500",
  },
  {
    icon: "fa-cart-flatbed",
    label: "Procurement",
    color: "text-rose-600",
    bar: "bg-rose-500",
  },
  {
    icon: "fa-chart-bar",
    label: "Reports",
    color: "text-violet-600",
    bar: "bg-violet-500",
  },
  {
    icon: "fa-building",
    label: "Facilities",
    color: "text-amber-600",
    bar: "bg-amber-500",
  },
  {
    icon: "fa-shield-halved",
    label: "Compliance",
    color: "text-red-600",
    bar: "bg-red-500",
  },
];

// Periods are generated dynamically from a year
const makePeriods = (year) => [
  `Q1 ${year}`,
  `Q2 ${year}`,
  `Q3 ${year}`,
  `Q4 ${year}`,
  `FY ${year}`,
];

const makeEmptyLine = (year) => ({
  name: "",
  allocated: "",
  spent: "",
  period: `Q1 ${year}`,
  description: "",
  iconIdx: 0,
});

// ─── Main Component ───────────────────────────────────────
const Budget = ({ onBack, parentModule }) => {
  // data state
  const [categories, setCategories] = useState([]);
  const [categoryNameOptions, setCategoryNameOptions] = useState([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const periods = makePeriods(selectedYear);
  const [activePeriod, setActivePeriod] = useState(
    `Q1 ${new Date().getFullYear()}`,
  );

  // modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // category being edited

  // new/edit form
  const [newLine, setNewLine] = useState(() =>
    makeEmptyLine(new Date().getFullYear()),
  );
  const [saving, setSaving] = useState(false);

  // upload
  const fileRef = useRef(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────
  const fetchCategories = useCallback(async (period) => {
    setLoading(true);
    try {
      const res = await apiService.get(
        `/api/budget/categories?period=${encodeURIComponent(period)}`,
      );
      const rows = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setCategories(rows);
    } catch {
      toast.error("Failed to load budget categories");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryNameOptions = useCallback(async () => {
    try {
      const res = await apiService.get("/api/budget/categories");
      const rows = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      const names = [
        ...new Set(
          rows.map((r) => String(r.name || "").trim()).filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b));
      setCategoryNameOptions(names);
    } catch {
      setCategoryNameOptions([]);
    }
  }, []);

  useEffect(() => {
    fetchCategories(activePeriod);
  }, [activePeriod, fetchCategories]);

  useEffect(() => {
    fetchCategoryNameOptions();
  }, [fetchCategoryNameOptions]);

  // When year changes, reset activePeriod to Q1 of that year
  const handleYearChange = (yr) => {
    const y = parseInt(yr, 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) {
      setSelectedYear(y);
      setActivePeriod(`Q1 ${y}`);
    }
  };

  // ── Aggregates ────────────────────────────────────────
  const totalAllocated = categories.reduce((s, c) => s + (c.allocated || 0), 0);
  const totalSpent = categories.reduce((s, c) => s + (c.spent || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallPct =
    totalAllocated > 0
      ? ((totalSpent / totalAllocated) * 100).toFixed(1)
      : "0.0";

  // ── Export ────────────────────────────────────────────
  const handleExport = async (format = "csv") => {
    const toastId = toast.loading(`Exporting ${format.toUpperCase()}…`);
    try {
      const res = await apiService.get(
        `/api/budget/export?period=${encodeURIComponent(activePeriod)}&format=${format}`,
        { responseType: "blob" },
      );
      const blob =
        res instanceof Blob
          ? res
          : new Blob([res], {
              type: format === "csv" ? "text/csv" : "application/json",
            });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-${activePeriod}-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded", { id: toastId });
    } catch {
      toast.error("Export failed", { id: toastId });
    }
  };

  // ── Add / Edit ────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setIsCustomCategory(false);
    setNewLine({ ...makeEmptyLine(selectedYear), period: activePeriod });
    setShowAddModal(true);
  };

  const openEdit = (cat) => {
    const iconIdx = ICON_OPTIONS.findIndex((o) => o.icon === cat.icon) ?? 0;
    setEditTarget(cat);
    setIsCustomCategory(!categoryNameOptions.includes(cat.name));
    setNewLine({
      name: cat.name,
      allocated: cat.allocated,
      spent: cat.spent,
      period: cat.period,
      description: cat.description || "",
      iconIdx: iconIdx >= 0 ? iconIdx : 0,
    });
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newLine.name.trim() || newLine.allocated === "") {
      return toast.error("Name and allocated amount are required");
    }

    const isDuplicateNameInPeriod = categories.some(
      (c) =>
        c._id !== editTarget?._id &&
        String(c.period || "").trim() === String(newLine.period || "").trim() &&
        String(c.name || "")
          .trim()
          .toLowerCase() === newLine.name.trim().toLowerCase(),
    );
    if (isDuplicateNameInPeriod) {
      return toast.error(
        "A budget line with this category name already exists for this period",
      );
    }

    setSaving(true);
    const chosen = ICON_OPTIONS[newLine.iconIdx] || ICON_OPTIONS[0];
    const payload = {
      name: newLine.name.trim(),
      allocated: parseFloat(newLine.allocated) || 0,
      spent: parseFloat(newLine.spent) || 0,
      period: newLine.period,
      description: newLine.description,
      icon: chosen.icon,
      color: chosen.color,
      bar: chosen.bar,
    };
    try {
      if (editTarget) {
        await apiService.put(
          `/api/budget/categories/${editTarget._id}`,
          payload,
        );
        toast.success("Budget line updated");
      } else {
        await apiService.post("/api/budget/categories", payload);
        toast.success("Budget line added");
      }
      setShowAddModal(false);
      fetchCategories(activePeriod);
      fetchCategoryNameOptions();
    } catch {
      toast.error(
        editTarget ? "Failed to update" : "Failed to add budget line",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"?`)) return;
    try {
      await apiService.delete(`/api/budget/categories/${cat._id}`);
      toast.success("Deleted");
      fetchCategories(activePeriod);
      fetchCategoryNameOptions();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ── Upload / Import ───────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json") && !file.name.endsWith(".csv")) {
      return toast.error("Only JSON files are supported for import");
    }
    setUploadFile(file);
  };

  const handleImport = async () => {
    if (!uploadFile) return toast.error("Please select a file first");
    setUploading(true);
    try {
      const text = await uploadFile.text();
      let categories = [];

      if (uploadFile.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        categories = Array.isArray(parsed) ? parsed : parsed.categories || [];
      } else {
        // Basic CSV parse: header row assumed same as our export
        const lines = text.trim().split("\n");
        const headers = lines[0]
          .split(",")
          .map((h) => h.replace(/"/g, "").trim());
        categories = lines.slice(1).map((line) => {
          const vals = line.split(",").map((v) => v.replace(/"/g, "").trim());
          return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] }), {});
        });
      }

      const res = await apiService.post("/api/budget/import", {
        categories,
        period: activePeriod,
        replace: replaceMode,
      });
      const importedCount =
        (typeof res?.imported === "number" ? res.imported : null) ??
        (typeof res?.data?.imported === "number" ? res.data.imported : 0);
      toast.success(`Imported ${importedCount} categories`);
      setShowUploadModal(false);
      setUploadFile(null);
      fetchCategories(activePeriod);
      fetchCategoryNameOptions();
    } catch (_err) {
      toast.error("Import failed — check file format");
    } finally {
      setUploading(false);
    }
  };

  const categoryDropdownOptions = [...new Set(categoryNameOptions)].sort(
    (a, b) => a.localeCompare(b),
  );

  // ─────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-gray-50 px-1 flex flex-col">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          ...(parentModule && onBack
            ? [{ label: parentModule, onClick: onBack, icon: "fa-coins" }]
            : []),
          { label: "Budget", icon: "fa-wallet" },
        ]}
      />

      <div className="flex-1 py-8">
        <div className="max-w-8xl mx-auto px-2 sm:px-6 lg:px-0">
          {/* ── Header ── */}
          <div className="mb-8">
            {/* Title row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  Budget Overview
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Track allocations, spending and financial health across
                  departments.
                </p>
              </div>

              {/* Primary action — always visible */}
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shrink-0"
              >
                <i className="fa-solid fa-plus"></i>
                <span className="hidden sm:inline">New Budget Line</span>
              </button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Year stepper */}
              <div className="flex items-center border border-gray-200 bg-white rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleYearChange(selectedYear - 1)}
                  className="px-2 py-2 text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Previous year"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <input
                  type="text"
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="w-10 text-center text-sm font-semibold text-gray-800 border-none outline-none bg-transparent py-2 px-1"
                  min="2000"
                  max="2100"
                />
                <button
                  type="button"
                  onClick={() => handleYearChange(selectedYear + 1)}
                  className="px-2.5 py-2 text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Next year"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </div>

              {/* Period selector */}
              <select
                value={activePeriod}
                onChange={(e) => setActivePeriod(e.target.value)}
                className="px-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-25"
              >
                {periods.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>

              {/* Divider */}
              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

              {/* Import */}
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                title="Import budget data"
              >
                <i className="fa-solid fa-upload"></i>
                <span className="hidden sm:inline">Import</span>
              </button>

              {/* Export (combined dropdown) */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  title="Export budget data"
                >
                  <i className="fa-solid fa-file-export"></i>
                  <span className="hidden sm:inline">Export</span>
                  <i className="fa-solid fa-chevron-down text-xs hidden sm:inline"></i>
                </button>

                {showExportMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          handleExport("csv");
                          setShowExportMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <i className="fa-solid fa-file-csv text-green-600"></i>
                        Export CSV
                      </button>
                      <button
                        onClick={() => {
                          handleExport("json");
                          setShowExportMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                      >
                        <i className="fa-solid fa-code text-blue-600"></i>
                        Export JSON
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <SummaryCard
              icon="fa-wallet"
              label="Total Budget"
              value={fmt(totalAllocated)}
              sub={activePeriod}
              color="bg-blue-600"
            />
            <SummaryCard
              icon="fa-arrow-trend-up"
              label="Total Spent"
              value={fmt(totalSpent)}
              sub={`${overallPct}% utilised`}
              color="bg-rose-500"
            />
            <SummaryCard
              icon="fa-piggy-bank"
              label="Remaining"
              value={fmt(totalRemaining)}
              sub={totalRemaining < 0 ? "⚠ Over budget" : "Available"}
              color={totalRemaining < 0 ? "bg-amber-500" : "bg-emerald-500"}
            />
            <SummaryCard
              icon="fa-layer-group"
              label="Budget Lines"
              value={categories.length}
              sub="Active categories"
              color="bg-purple-600"
            />
          </div>

          {/* ── Category table / empty state ── */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
              <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400 mb-3"></i>
              <p className="text-gray-500 text-sm">Loading budget data…</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <i className="fa-solid fa-wallet text-5xl text-gray-300 mb-4"></i>
              <h3 className="text-lg font-semibold text-gray-700 mb-1">
                No budget lines for {activePeriod}
              </h3>
              <p className="text-sm text-gray-400 mb-6">
                Add your first budget line or import from a JSON/CSV file.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={openAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  <i className="fa-solid fa-plus"></i> New Budget Line
                </button>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <i className="fa-solid fa-upload"></i> Import
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category breakdown */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      <i className="fa-solid fa-chart-pie text-gray-400 mr-2"></i>
                      Budget by Category
                    </h3>
                    <span className="text-xs text-gray-400">
                      Allocated vs Spent
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {categories.map((cat) => {
                      const pct =
                        cat.allocated > 0
                          ? ((cat.spent / cat.allocated) * 100).toFixed(0)
                          : 0;
                      const over = cat.spent > cat.allocated;
                      return (
                        <div
                          key={cat._id}
                          className="px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <i
                                className={`fa-solid ${cat.icon || "fa-wallet"} ${cat.color || "text-blue-600"} w-5 text-center`}
                              ></i>
                              <span className="text-sm font-medium text-gray-800">
                                {cat.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span
                                  className={`text-sm font-semibold ${over ? "text-rose-600" : "text-gray-900"}`}
                                >
                                  {fmt(cat.spent)}
                                </span>
                                <span className="text-xs text-gray-400 ml-1">
                                  / {fmt(cat.allocated)}
                                </span>
                              </div>
                              {/* Actions */}
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEdit(cat)}
                                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Edit"
                                >
                                  <i className="fa-solid fa-pen-to-square text-xs"></i>
                                </button>
                                <button
                                  onClick={() => handleDelete(cat)}
                                  className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                                  title="Delete"
                                >
                                  <i className="fa-solid fa-trash text-xs"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <ProgressBar
                                value={cat.spent}
                                max={cat.allocated}
                                color={
                                  over
                                    ? "bg-rose-500"
                                    : cat.bar || "bg-blue-500"
                                }
                              />
                            </div>
                            <span
                              className={`text-xs font-medium w-12 text-right ${over ? "text-rose-600" : "text-gray-500"}`}
                            >
                              {pct}%
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-gray-400 mt-1.5">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Overall */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Overall
                    </span>
                    <div className="flex items-center gap-6">
                      {[
                        { label: "Spent", val: fmt(totalSpent), cls: "" },
                        { label: "Budget", val: fmt(totalAllocated), cls: "" },
                        {
                          label: "Remaining",
                          val: fmt(totalRemaining),
                          cls:
                            totalRemaining < 0
                              ? "text-rose-600"
                              : "text-emerald-600",
                        },
                      ].map(({ label, val, cls }) => (
                        <div key={label} className="text-right">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p
                            className={`text-sm font-bold text-gray-900 ${cls}`}
                          >
                            {val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Utilisation sidebar */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-sm font-medium text-blue-200 mb-3">
                    Utilisation Rate
                  </p>
                  <div className="flex items-end gap-2 mb-4">
                    <span className="text-4xl font-bold">{overallPct}%</span>
                    <span className="text-blue-300 text-sm mb-1">
                      of {activePeriod} used
                    </span>
                  </div>
                  <div className="w-full bg-blue-500/40 rounded-full h-2.5 mb-4">
                    <div
                      className="h-2.5 rounded-full bg-white transition-all duration-700"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-center text-sm">
                    <div className="bg-white/10 rounded-lg py-2">
                      <p className="text-blue-200 text-xs">Spent</p>
                      <p className="font-bold">{fmt(totalSpent)}</p>
                    </div>
                    <div className="bg-white/10 rounded-lg py-2">
                      <p className="text-blue-200 text-xs">Remaining</p>
                      <p className="font-bold">{fmt(totalRemaining)}</p>
                    </div>
                  </div>
                </div>

                {/* Category mini list */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">
                      Top Spend
                    </h3>
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {[...categories]
                      .sort((a, b) => (b.spent || 0) - (a.spent || 0))
                      .slice(0, 5)
                      .map((cat) => (
                        <li
                          key={cat._id}
                          className="px-5 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <i
                              className={`fa-solid ${cat.icon || "fa-wallet"} ${cat.color || "text-blue-600"} text-xs w-4`}
                            ></i>
                            <span className="text-sm text-gray-700 truncate max-w-[120px]">
                              {cat.name}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {fmt(cat.spent)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  {editTarget ? "Edit Budget Line" : "New Budget Line"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editTarget
                    ? "Update category details"
                    : "Add a new budget category"}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-4"
            >
              {/* Name + Period row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={isCustomCategory ? "__custom__" : newLine.name}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setIsCustomCategory(true);
                        setNewLine({ ...newLine, name: "" });
                        return;
                      }
                      setIsCustomCategory(false);
                      setNewLine({ ...newLine, name: e.target.value });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                    required
                  >
                    <option value="" disabled>
                      {categoryDropdownOptions.length > 0
                        ? "Select category"
                        : "No categories available"}
                    </option>
                    {categoryDropdownOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value="__custom__">Custom category...</option>
                  </select>
                  {isCustomCategory && (
                    <input
                      type="text"
                      value={newLine.name}
                      onChange={(e) =>
                        setNewLine({ ...newLine, name: e.target.value })
                      }
                      placeholder="Enter new category name"
                      className="mt-2 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                      required
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period
                  </label>
                  <select
                    value={newLine.period}
                    onChange={(e) =>
                      setNewLine({ ...newLine, period: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                  >
                    {periods.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Allocated + Spent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocated ($) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={newLine.allocated}
                      onChange={(e) =>
                        setNewLine({ ...newLine, allocated: e.target.value })
                      }
                      placeholder="50000"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spent so far ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={newLine.spent}
                      onChange={(e) =>
                        setNewLine({ ...newLine, spent: e.target.value })
                      }
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Icon
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {ICON_OPTIONS.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewLine({ ...newLine, iconIdx: idx })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs ${
                        newLine.iconIdx === idx
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <i className={`fa-solid ${opt.icon} ${opt.color}`}></i>
                      <span className="text-gray-500 text-[10px] truncate w-full text-center">
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newLine.description}
                  onChange={(e) =>
                    setNewLine({ ...newLine, description: e.target.value })
                  }
                  placeholder="Brief note about this budget category…"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors text-sm resize-none"
                />
              </div>

              {/* Preview */}
              {newLine.name && (
                <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center gap-3 border border-gray-100">
                  <i
                    className={`fa-solid ${ICON_OPTIONS[newLine.iconIdx]?.icon} ${ICON_OPTIONS[newLine.iconIdx]?.color} text-lg`}
                  ></i>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {newLine.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {newLine.allocated
                        ? `$${Number(newLine.allocated).toLocaleString()} allocated`
                        : "Enter amount above"}{" "}
                      · {newLine.period}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving && <i className="fa-solid fa-spinner fa-spin"></i>}
                  {editTarget ? "Save Changes" : "Add Line"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Import / Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Import Budget Data
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Upload a JSON or CSV file
                </p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              >
                <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-400 mb-3"></i>
                <p className="text-sm font-medium text-gray-700">
                  {uploadFile ? uploadFile.name : "Click to select a file"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports JSON (array of categories) or CSV (exported format)
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Period override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Import into Period
                </label>
                <select
                  value={activePeriod}
                  onChange={(e) => setActivePeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {periods.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Replace toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Replace existing data for this period
                  </p>
                  <p className="text-xs text-gray-400">
                    If unchecked, imported lines will be added alongside
                    existing ones
                  </p>
                </div>
              </label>

              {/* Template download hint */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 flex gap-2">
                <i className="fa-solid fa-circle-info mt-0.5 shrink-0"></i>
                <span>
                  Download a template by clicking <strong>Export JSON</strong>{" "}
                  from the main page, then modify and re-import.
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {uploading && <i className="fa-solid fa-spinner fa-spin"></i>}
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;
