import React, { useState, useEffect, useCallback } from "react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import DataTable from "../common/DataTable";

const PurchaseOrders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPo, setSelectedPo] = useState(null);
  const [loadingPoDetails, setLoadingPoDetails] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    vendor: "",
    status: "draft",
    expectedDelivery: "",
    notes: "",
  });

  // API Data States
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  // Fetch purchase orders from API
  const fetchPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = {
        page: currentPage,
        limit,
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedVendor) params.vendor = selectedVendor;

      // Map activeFilter to status
      if (activeFilter && activeFilter !== "all") {
        params.status = activeFilter;
      } else if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await apiService.get("/api/purchase-orders", { params });

      // Handle response structure (apiService interceptor already unwraps response.data)
      if (response.orders) {
        setPurchaseOrders(response.orders);
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
      } else if (Array.isArray(response)) {
        // Fallback for direct array response
        setPurchaseOrders(response);
        setTotal(response.length || 0);
        setTotalPages(Math.ceil(response.length / limit));
      } else {
        setPurchaseOrders([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching purchase orders:", err);
      setError("Failed to load purchase orders");
      toast.error("Failed to load purchase orders");
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    limit,
    searchQuery,
    selectedVendor,
    selectedStatus,
    activeFilter,
  ]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Fetch vendors on component mount
  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const poSearch = sessionStorage.getItem("purchaseOrdersSearch");
    if (poSearch) {
      setSearchQuery(poSearch);
      sessionStorage.removeItem("purchaseOrdersSearch");
    }
  }, []);

  const fetchVendors = async () => {
    try {
      const response = await apiService.get("/api/vendors", {
        params: { limit: 1000, status: "Active" }, // Get all active vendors
      });

      // Handle response structure
      if (response.data && response.data.vendors) {
        setVendors(response.data.vendors);
      } else if (Array.isArray(response)) {
        setVendors(response);
      } else {
        setVendors([]);
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
      toast.error("Failed to load vendors");
      setVendors([]);
    }
  };

  // Helper function to get vendor initials
  const getVendorInitials = (vendorName) => {
    if (!vendorName) return "??";
    const words = vendorName.trim().split(" ");
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  // Helper function to get random color for vendor avatar
  const getRandomVendorColor = (index) => {
    const colors = ["gray", "indigo", "orange", "teal", "purple", "pink"];
    return colors[index % colors.length];
  };

  // Format date from ISO to readable format
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Map status to UI labels and colors
  const getStatusInfo = (status) => {
    const statusMap = {
      draft: { label: "Draft", color: "yellow" },
      pending: { label: "Pending", color: "blue" },
      issued: { label: "Issued", color: "blue" },
      approved: { label: "Approved", color: "green" },
      payment_pending: { label: "Payment Pending", color: "orange" },
      paid: { label: "Paid", color: "green" },
      received: { label: "Received", color: "green" },
      closed: { label: "Closed", color: "gray" },
      cancelled: { label: "Cancelled", color: "red" },
      rejected: { label: "Rejected", color: "red" },
    };
    return (
      statusMap[status?.toLowerCase()] || {
        label: status || "Unknown",
        color: "gray",
      }
    );
  };

  const getStatusColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-50 text-blue-700 border-blue-100",
      yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
      green: "bg-green-50 text-green-700 border-green-100",
      gray: "bg-gray-100 text-gray-700 border-gray-200",
      red: "bg-red-50 text-red-700 border-red-100",
    };
    return colors[color] || colors.gray;
  };

  const getStatusDotColor = (color) => {
    const colors = {
      blue: "bg-blue-500",
      yellow: "bg-yellow-500",
      green: "bg-green-500",
      gray: "bg-gray-500",
      red: "bg-red-500",
    };
    return colors[color] || colors.gray;
  };

  const getVendorBgColor = (color) => {
    const colors = {
      gray: "bg-gray-100 text-gray-600",
      indigo: "bg-indigo-50 text-indigo-600",
      orange: "bg-orange-50 text-orange-600",
      teal: "bg-teal-50 text-teal-600",
    };
    return colors[color] || colors.gray;
  };

  const formatPoCurrency = (amount, currencyCode = "NGN") => {
    const safeAmount = Number(amount) || 0;
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
      }).format(safeAmount);
    } catch {
      return `${currencyCode} ${safeAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  };

  const resolvePoCurrency = (po) =>
    po?.currency || po?.linkedMaterialRequestId?.currency || "NGN";

  const getAttachmentName = (attachment, fallbackIndex) =>
    attachment?.fileName ||
    attachment?.name ||
    attachment?.originalName ||
    `Attachment ${fallbackIndex + 1}`;

  const getAttachmentHref = (attachment) =>
    attachment?.fileData || attachment?.url || attachment?.path || "";

  const openPurchaseOrderDetails = async (po) => {
    try {
      const poId = po?._id || po?.id;
      if (!poId) {
        toast.error("Unable to open this purchase order");
        return;
      }

      setLoadingPoDetails(true);
      const response = await apiService.get(`/api/purchase-orders/${poId}`);
      const poData = response?.data || response;

      if (!poData?._id && !poData?.id) {
        toast.error("Purchase order details not found");
        return;
      }

      setSelectedPo(poData);
      setEditForm({
        vendor: poData.vendor || "",
        status: poData.status || "draft",
        expectedDelivery: poData.expectedDelivery
          ? new Date(poData.expectedDelivery).toISOString().split("T")[0]
          : "",
        notes: poData.notes || "",
      });
    } catch (err) {
      console.error("Error loading purchase order:", err);
      toast.error("Failed to open purchase order");
    } finally {
      setLoadingPoDetails(false);
    }
  };

  const handleSavePoEdit = async () => {
    try {
      if (!selectedPo?._id && !selectedPo?.id) return;
      setIsSavingEdit(true);

      const poId = selectedPo._id || selectedPo.id;
      const updatePayload = {
        vendor: editForm.vendor.trim(),
        status: editForm.status,
        expectedDelivery: editForm.expectedDelivery || null,
        notes: editForm.notes?.trim() || "",
      };

      const updateResponse = await apiService.put(
        `/api/purchase-orders/${poId}`,
        updatePayload,
      );
      const updatedPo = updateResponse?.data || updateResponse;
      toast.success("Purchase order updated successfully");
      if (updatedPo?._id || updatedPo?.id) {
        setSelectedPo((prev) => ({ ...prev, ...updatedPo }));
      }
      await fetchPurchaseOrders();
    } catch (err) {
      console.error("Error updating purchase order:", err);
      toast.error("Failed to update purchase order");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const statusCounts = {
    all: total,
    draft:
      purchaseOrders?.filter((po) => po.status?.toLowerCase() === "draft")
        ?.length || 0,
    issued:
      purchaseOrders?.filter((po) => po.status?.toLowerCase() === "issued")
        ?.length || 0,
    received:
      purchaseOrders?.filter((po) => po.status?.toLowerCase() === "received")
        ?.length || 0,
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Calculate pagination display
  const startRecord = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, total);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 3; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 2; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const purchaseOrderColumns = [
    {
      header: (
        <input
          type="checkbox"
          className="rounded border-[#dbe0e6] text-[#137fec] focus:ring-[#137fec]/20"
        />
      ),
      accessorKey: "select",
      className: "w-[40px] pl-4 pr-3 py-3",
      cellClassName: "pl-4 pr-3 py-3",
      cell: () => (
        <input
          type="checkbox"
          className="rounded border-[#dbe0e6] text-[#137fec] focus:ring-[#137fec]/20"
        />
      ),
    },
    {
      header: (
        <div className="flex items-center gap-1 group cursor-pointer hover:text-[#137fec]">
          PO Number{" "}
          <i className="fa-solid fa-arrow-down text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
      ),
      accessorKey: "poNumber",
      className: "px-4 py-3",
      cellClassName: "px-4 py-3",
      cell: (po) => (
        <button
          type="button"
          onClick={() => openPurchaseOrderDetails(po)}
          className="text-sm font-medium text-[#137fec] hover:underline"
        >
          {po.poNumber || "N/A"}
        </button>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-1 group cursor-pointer hover:text-[#137fec]">
          Vendor{" "}
          <i className="fa-solid fa-arrow-down text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
      ),
      accessorKey: "vendor",
      className: "px-4 py-3",
      cellClassName: "px-4 py-3",
      cell: (po, index) => {
        const vendorName = po.vendor || "Unknown Vendor";
        const vendorInitials = getVendorInitials(vendorName);
        const vendorColor = getRandomVendorColor(index);
        return (
          <div className="flex items-center gap-3">
            <div
              className={`size-8 rounded-full ${getVendorBgColor(vendorColor)} flex items-center justify-center text-xs font-bold`}
            >
              {vendorInitials}
            </div>
            <span className="text-sm text-[#111418] font-medium">
              {vendorName}
            </span>
          </div>
        );
      },
    },
    {
      header: (
        <div className="flex items-center gap-1 group cursor-pointer hover:text-[#137fec]">
          Order Date{" "}
          <i className="fa-solid fa-arrow-down text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
      ),
      accessorKey: "orderDate",
      className: "px-4 py-3",
      cellClassName: "px-4 py-3 text-sm text-[#617589]",
      cell: (po) => formatDate(po.createdAt || po.orderDate),
    },
    {
      header: "Status",
      accessorKey: "status",
      className: "px-4 py-3",
      cellClassName: "px-4 py-3",
      cell: (po) => {
        const statusInfo = getStatusInfo(po.status);
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColorClasses(statusInfo.color)}`}
          >
            <span
              className={`size-1.5 rounded-full ${getStatusDotColor(statusInfo.color)}`}
            ></span>{" "}
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      header: (
        <div className="flex items-center justify-end gap-1 group cursor-pointer hover:text-[#137fec]">
          Total Amount{" "}
          <i className="fa-solid fa-arrow-down text-[12px] opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </div>
      ),
      accessorKey: "totalAmount",
      className: "px-4 py-3 text-right",
      cellClassName:
        "px-4 py-3 text-sm font-medium text-[#111418] text-right font-mono",
      cell: (po) =>
        formatPoCurrency(po.totalAmount || 0, resolvePoCurrency(po)),
    },
    {
      header: "Actions",
      accessorKey: "actions",
      className: "px-4 py-3 text-center w-[80px]",
      cellClassName: "px-4 py-3 text-center",
      cell: (po) => (
        <button
          type="button"
          onClick={() => openPurchaseOrderDetails(po)}
          className="p-1 rounded-md text-[#617589] hover:bg-gray-100 transition-colors cursor-pointer"
          title="View purchase order details"
        >
          <i className="fa-solid fa-eye text-[16px]"></i>
        </button>
      ),
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#f6f7f8] flex flex-col">
      <Breadcrumb
        items={
          selectedPo
            ? [
                { label: "Home", href: "/home", icon: "fa-house" },
                {
                  label: "Purchase Orders",
                  icon: "fa-cart-shopping",
                  onClick: (e) => {
                    e.preventDefault();
                    setSelectedPo(null);
                  },
                },
                {
                  label: selectedPo.poNumber || "PO Details",
                  icon: "fa-file-invoice",
                },
              ]
            : [
                { label: "Home", href: "/home", icon: "fa-house" },
                { label: "Purchase Orders", icon: "fa-cart-shopping" },
              ]
        }
      />

      {/* Main Content */}
      <main className="flex-1 py-3 px-4 max-w-[1440px] mx-auto w-full">
        {loadingPoDetails && (
          <div className="rounded-xl border border-[#dbe0e6] bg-white p-6 mb-6 text-sm text-[#617589]">
            <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
            Loading purchase order details...
          </div>
        )}

        {selectedPo && !loadingPoDetails ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-[#111418] text-3xl font-black leading-tight tracking-[-0.033em]">
                  {selectedPo.poNumber || "Purchase Order"}
                </h1>
                <p className="text-[#617589] text-sm mt-1">
                  Full purchase order details and source request context.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPo(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-[#617589] hover:bg-gray-100"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i>
                  Back to List
                </button>
                <button
                  type="button"
                  onClick={handleSavePoEdit}
                  disabled={isSavingEdit || !editForm.vendor.trim()}
                  className="px-4 py-2 rounded-lg bg-[#137fec] text-white text-sm font-semibold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingEdit ? "Saving..." : "Save PO Changes"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl border border-[#dbe0e6] bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#dbe0e6] bg-gray-50">
                  <h3 className="text-lg font-bold text-[#111418]">
                    Purchase Order Details
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Vendor
                    </span>
                    <input
                      type="text"
                      value={editForm.vendor}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          vendor: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[#dbe0e6] h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec]"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Status
                    </span>
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[#dbe0e6] h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec]"
                    >
                      <option value="draft">Draft</option>
                      <option value="issued">Issued</option>
                      <option value="approved">Approved</option>
                      <option value="payment_pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                      <option value="received">Received</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Currency
                    </span>
                    <div className="h-10 px-3 rounded-lg border border-[#dbe0e6] bg-gray-50 flex items-center text-sm font-semibold text-[#111418]">
                      {resolvePoCurrency(selectedPo)}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Total Amount
                    </span>
                    <div className="h-10 px-3 rounded-lg border border-[#dbe0e6] bg-gray-50 flex items-center text-sm font-semibold text-[#111418]">
                      {formatPoCurrency(
                        selectedPo.totalAmount || 0,
                        resolvePoCurrency(selectedPo),
                      )}
                    </div>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Expected Delivery
                    </span>
                    <input
                      type="date"
                      value={editForm.expectedDelivery}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          expectedDelivery: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[#dbe0e6] h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec]"
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Order Date
                    </span>
                    <div className="h-10 px-3 rounded-lg border border-[#dbe0e6] bg-gray-50 flex items-center text-sm font-semibold text-[#111418]">
                      {formatDate(selectedPo.orderDate || selectedPo.createdAt)}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Source Material Request ID
                    </span>
                    <div className="h-10 px-3 rounded-lg border border-[#dbe0e6] bg-gray-50 flex items-center text-sm font-semibold text-[#111418]">
                      {selectedPo?.linkedMaterialRequestId?.requestId ||
                        selectedPo?.linkedMaterialRequestId?._id ||
                        selectedPo?.linkedMaterialRequestId ||
                        "Not linked"}
                    </div>
                  </div>

                  <label className="md:col-span-2 flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#111418]">
                      Notes
                    </span>
                    <textarea
                      rows="4"
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[#dbe0e6] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec]"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe0e6] bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#dbe0e6] bg-gray-50">
                  <h3 className="text-lg font-bold text-[#111418]">
                    Source Request Summary
                  </h3>
                </div>
                <div className="p-6 space-y-3 text-sm">
                  <div>
                    <p className="text-[#617589]">Request Title</p>
                    <p className="text-[#111418] font-semibold">
                      {selectedPo?.linkedMaterialRequestId?.requestTitle ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#617589]">Requested By</p>
                    <p className="text-[#111418] font-semibold">
                      {selectedPo?.linkedMaterialRequestId?.requestedBy ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#617589]">Department</p>
                    <p className="text-[#111418] font-semibold">
                      {selectedPo?.linkedMaterialRequestId?.department || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#617589]">Request Type</p>
                    <p className="text-[#111418] font-semibold">
                      {selectedPo?.linkedMaterialRequestId?.requestType ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#dbe0e6] bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#dbe0e6] bg-gray-50">
                <h3 className="text-lg font-bold text-[#111418]">
                  PO Line Items
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[#617589] uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#617589] uppercase">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#617589] uppercase">
                        Line Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(selectedPo.lineItems || []).map((item, idx) => (
                      <tr key={`${item.itemName || "item"}-${idx}`}>
                        <td className="px-4 py-3 text-sm font-medium text-[#111418]">
                          {item.itemName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#111418]">
                          {item.quantity || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#617589]">
                          {item.quantityType || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#111418] text-right">
                          {formatPoCurrency(
                            item.amount || 0,
                            resolvePoCurrency(selectedPo),
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#111418] text-right">
                          {formatPoCurrency(
                            (Number(item.quantity) || 0) *
                              (Number(item.amount) || 0),
                            resolvePoCurrency(selectedPo),
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#dbe0e6] bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#dbe0e6] bg-gray-50">
                <h3 className="text-lg font-bold text-[#111418]">
                  Source Request Attachments
                </h3>
              </div>
              <div className="p-6">
                {Array.isArray(
                  selectedPo?.linkedMaterialRequestId?.attachments,
                ) &&
                selectedPo.linkedMaterialRequestId.attachments.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {selectedPo.linkedMaterialRequestId.attachments.map(
                      (file, idx) => {
                        const attachmentHref = getAttachmentHref(file);
                        const attachmentName = getAttachmentName(file, idx);
                        return attachmentHref ? (
                          <a
                            key={`${attachmentName}-${idx}`}
                            href={attachmentHref}
                            target="_blank"
                            rel="noreferrer"
                            download={attachmentName}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] text-sm hover:bg-gray-100"
                          >
                            <i className="fa-solid fa-paperclip text-[#617589]"></i>
                            <span>{attachmentName}</span>
                          </a>
                        ) : (
                          <div
                            key={`${attachmentName}-${idx}`}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-[#111418] text-sm"
                          >
                            <i className="fa-solid fa-file text-[#617589]"></i>
                            <span>{attachmentName}</span>
                          </div>
                        );
                      },
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#617589]">
                    No attachments on source request.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Page Heading */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-[#111418] text-3xl font-black leading-tight tracking-[-0.033em]">
                  Purchase Orders
                </h1>
                <p className="text-[#617589] text-sm mt-1">
                  Manage, track, and create new purchase orders.
                </p>
              </div>
              <button
                className="flex items-center justify-center gap-2 overflow-hidden rounded-lg h-10 px-5 bg-[#137fec] hover:bg-blue-600 transition-colors text-white text-sm font-bold leading-normal tracking-[0.015em] shadow-sm"
                onClick={() =>
                  toast(
                    "Purchase Orders are automatically created when Material Requests are approved. Head over to Material Requests to start the process.",
                    { icon: "ℹ️", duration: 5000 },
                  )
                }
              >
                <i className="fa-solid fa-plus text-[16px]"></i>
                <span className="truncate">Create Purchase Order</span>
              </button>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="bg-white rounded-xl border border-[#dbe0e6] p-4 mb-6 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 min-w-[280px]">
                  <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-[14px]"></i>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-[#dbe0e6] bg-white h-10 pl-10 pr-4 text-sm text-[#111418] placeholder-[#617589] focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec]"
                      placeholder="Search by PO #, Vendor name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Filters Group */}
                <div className="flex flex-wrap gap-3 flex-1 lg:justify-end">
                  {/* Date Range */}
                  <div className="relative min-w-[200px] flex-1 lg:flex-none">
                    <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-[14px]"></i>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-[#dbe0e6] bg-white h-10 pl-10 pr-4 text-sm text-[#111418] placeholder-[#617589] focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec]"
                      placeholder="Filter by Date Range"
                    />
                  </div>

                  {/* Vendor Filter */}
                  <div className="relative min-w-[160px] flex-1 lg:flex-none">
                    <select
                      value={selectedVendor}
                      onChange={(e) => {
                        setSelectedVendor(e.target.value);
                        setCurrentPage(1); // Reset to first page on filter change
                      }}
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                      }}
                      className="w-full rounded-lg border border-[#dbe0e6] bg-white h-10 pl-3 pr-8 text-sm text-[#111418] focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec] cursor-pointer"
                    >
                      <option value="">All Vendors</option>
                      {vendors.map((vendor) => (
                        <option key={vendor._id} value={vendor.companyName}>
                          {vendor.companyName}
                        </option>
                      ))}
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[12px]"></i>
                  </div>

                  {/* Status Filter */}
                  <div className="relative min-w-[160px] flex-1 lg:flex-none">
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setActiveFilter("all");
                        setCurrentPage(1); // Reset to first page on filter change
                      }}
                      style={{
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                      }}
                      className="w-full rounded-lg border border-[#dbe0e6] bg-white h-10 pl-3 pr-8 text-sm text-[#111418] focus:outline-none focus:ring-2 focus:ring-[#137fec]/50 focus:border-[#137fec] cursor-pointer"
                    >
                      <option value="">All Statuses</option>
                      <option value="draft">Draft</option>
                      <option value="issued">Issued</option>
                      <option value="approved">Approved</option>
                      <option value="payment_pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                      <option value="received">Received</option>
                      <option value="closed">Closed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[12px]"></i>
                  </div>
                </div>
              </div>

              {/* Quick Status Chips */}
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                <button
                  onClick={() => {
                    setActiveFilter("all");
                    setSelectedStatus("");
                    setCurrentPage(1);
                  }}
                  className={`flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-3 transition-colors text-xs font-semibold ${
                    activeFilter === "all"
                      ? "bg-[#137fec] text-white border border-transparent"
                      : "bg-white hover:bg-gray-100 text-[#617589] border border-[#dbe0e6]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setActiveFilter("draft");
                    setSelectedStatus("");
                    setCurrentPage(1);
                  }}
                  className={`flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-3 transition-colors text-xs font-medium ${
                    activeFilter === "draft"
                      ? "bg-[#137fec] text-white border border-transparent"
                      : "bg-white hover:bg-gray-100 text-[#617589] border border-[#dbe0e6]"
                  }`}
                >
                  Draft{" "}
                  <span className="bg-[#f0f2f4] px-1.5 rounded-md text-[10px] text-[#111418]">
                    {statusCounts.draft}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveFilter("issued");
                    setSelectedStatus("");
                    setCurrentPage(1);
                  }}
                  className={`flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-3 transition-colors text-xs font-medium ${
                    activeFilter === "issued"
                      ? "bg-[#137fec] text-white border border-transparent"
                      : "bg-white hover:bg-gray-100 text-[#617589] border border-[#dbe0e6]"
                  }`}
                >
                  Issued{" "}
                  <span className="bg-[#f0f2f4] px-1.5 rounded-md text-[10px] text-[#111418]">
                    {statusCounts.issued}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveFilter("received");
                    setSelectedStatus("");
                    setCurrentPage(1);
                  }}
                  className={`flex h-7 shrink-0 items-center justify-center gap-x-1.5 rounded-full px-3 transition-colors text-xs font-medium ${
                    activeFilter === "received"
                      ? "bg-[#137fec] text-white border border-transparent"
                      : "bg-white hover:bg-gray-100 text-[#617589] border border-[#dbe0e6]"
                  }`}
                >
                  Received{" "}
                  <span className="bg-[#f0f2f4] px-1.5 rounded-md text-[10px] text-[#111418]">
                    {statusCounts.received}
                  </span>
                </button>
              </div>
            </div>

            {/* Data Table Section */}
            <div className="bg-white rounded-xl border border-[#dbe0e6] overflow-hidden shadow-sm flex flex-col">
              <DataTable
                columns={purchaseOrderColumns}
                data={purchaseOrders}
                isLoading={loading}
                emptyMessage={
                  error
                    ? error
                    : "No purchase orders found. Try adjusting your filters or create a new purchase order."
                }
                keyExtractor={(po) => po._id || po.id}
              />

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#dbe0e6] bg-white">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[#617589]">
                    Showing{" "}
                    <span className="font-bold text-[#111418]">
                      {startRecord}-{endRecord}
                    </span>{" "}
                    of <span className="font-bold text-[#111418]">{total}</span>{" "}
                    results
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center justify-center size-8 rounded hover:bg-[#f0f2f4] text-[#617589] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fa-solid fa-chevron-left text-[14px]"></i>
                  </button>

                  {getPageNumbers().map((page, index) => {
                    if (page === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="text-[#617589] px-1"
                        >
                          ...
                        </span>
                      );
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`flex items-center justify-center size-8 rounded text-sm transition-colors ${
                          currentPage === page
                            ? "bg-[#137fec]/10 text-[#137fec] font-bold"
                            : "hover:bg-[#f0f2f4] text-[#617589]"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center justify-center size-8 rounded hover:bg-[#f0f2f4] text-[#617589] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="fa-solid fa-chevron-right text-[14px]"></i>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PurchaseOrders;
