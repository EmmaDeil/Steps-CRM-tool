import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../services/currency";
import Breadcrumb from "../Breadcrumb";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// ── Status Badge ─────────────────────────────────────────────────────────────
const OrderStatusBadge = ({ status }) => {
  const map = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    confirmed: "bg-blue-50 text-blue-700 border-blue-200",
    fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
    invoiced: "bg-purple-50 text-purple-700 border-purple-200",
    cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        map[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          status === "fulfilled"
            ? "bg-emerald-500"
            : status === "confirmed"
            ? "bg-blue-500"
            : status === "invoiced"
            ? "bg-purple-500"
            : status === "cancelled"
            ? "bg-rose-500"
            : "bg-gray-400"
        }`}
      />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
};

const PaymentStatusBadge = ({ status }) => {
  const map = {
    unpaid: "bg-amber-50 text-amber-700 border-amber-200",
    partial: "bg-sky-50 text-sky-700 border-sky-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        map[status] || "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {status ? status.toUpperCase() : "UNPAID"}
    </span>
  );
};

export default function Sales() {
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, orders, customers, reports
  const [loading, setLoading] = useState(false);

  // Data states
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);

  // Filter states
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  // New Order Form state
  const [orderForm, setOrderForm] = useState({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    lineItems: [],
    taxRate: 0,
    discount: 0,
    notes: "",
    dueDate: "",
    paymentMethod: "Bank Transfer",
    confirmImmediately: false,
  });

  // Customer Form state
  const [customerForm, setCustomerForm] = useState({
    id: null,
    name: "",
    type: "business",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    taxId: "",
    notes: "",
  });

  // Fetch stats & dashboard data
  const fetchStats = useCallback(async () => {
    try {
      const res = await apiService.sales.getStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to load sales stats:", err);
    }
  }, []);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.sales.getOrders({
        search: orderSearch,
        status: statusFilter,
        limit: 50,
      });
      setOrders(res.orders || []);
      setOrdersTotal(res.total || 0);
    } catch (err) {
      toast.error("Failed to load sales orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderSearch, statusFilter]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await apiService.sales.getCustomers({ search: customerSearch, limit: 100 });
      setCustomers(res.customers || []);
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
  }, [customerSearch]);

  // Fetch inventory items for live item picker and stock linking
  const fetchInventoryItems = useCallback(async () => {
    try {
      const res = await apiService.get("/api/inventory/items?limit=200");
      setInventoryItems(res.items || res.data || []);
    } catch (err) {
      console.error("Failed to load inventory items:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchCustomers();
    fetchInventoryItems();
  }, [fetchStats, fetchCustomers, fetchInventoryItems]);

  useEffect(() => {
    if (activeTab === "orders" || activeTab === "dashboard") {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  // Handle customer selection in Order form
  const handleSelectCustomer = (cId) => {
    const cust = customers.find((c) => c._id === cId);
    if (cust) {
      setOrderForm((prev) => ({
        ...prev,
        customerId: cust._id,
        customerName: cust.name,
        customerEmail: cust.email || "",
        customerPhone: cust.phone || "",
      }));
    }
  };

  // Add line item to Order form
  const handleAddLineItem = () => {
    setOrderForm((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          inventoryItemId: "",
          itemId: "",
          itemName: "",
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          unit: "pcs",
          availableStock: 0,
          locationName: "",
        },
      ],
    }));
  };

  // Update line item in Order form
  const handleUpdateLineItem = (index, field, value) => {
    setOrderForm((prev) => {
      const updated = [...prev.lineItems];
      const item = { ...updated[index] };

      if (field === "inventoryItemId") {
        const inv = inventoryItems.find((i) => i._id === value);
        if (inv) {
          item.inventoryItemId = inv._id;
          item.itemId = inv.itemId || "";
          item.itemName = inv.name;
          item.unitPrice = inv.unitPrice || 0;
          item.unit = inv.unit || "pcs";
          item.availableStock = inv.quantity || 0;
          item.locationName = inv.location || "";
          item.totalPrice = (Number(item.quantity) || 1) * (inv.unitPrice || 0);
        }
      } else if (field === "quantity") {
        const qty = Math.max(1, Number(value) || 1);
        item.quantity = qty;
        item.totalPrice = Math.round(qty * (Number(item.unitPrice) || 0) * 100) / 100;
      } else if (field === "unitPrice") {
        const price = Math.max(0, Number(value) || 0);
        item.unitPrice = price;
        item.totalPrice = Math.round((Number(item.quantity) || 1) * price * 100) / 100;
      } else {
        item[field] = value;
      }

      updated[index] = item;
      return { ...prev, lineItems: updated };
    });
  };

  // Remove line item
  const handleRemoveLineItem = (index) => {
    setOrderForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  // Order totals calculations
  const orderCalculations = useMemo(() => {
    const subtotal = orderForm.lineItems.reduce((acc, li) => acc + (li.totalPrice || 0), 0);
    const discounted = Math.max(0, subtotal - (Number(orderForm.discount) || 0));
    const tax = Math.round(discounted * ((Number(orderForm.taxRate) || 0) / 100) * 100) / 100;
    const total = Math.round((discounted + tax) * 100) / 100;
    return { subtotal, tax, total };
  }, [orderForm.lineItems, orderForm.discount, orderForm.taxRate]);

  // Submit create order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.customerName.trim()) {
      toast.error("Please provide or select a customer");
      return;
    }
    if (orderForm.lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customerId: orderForm.customerId || undefined,
        customerName: orderForm.customerName,
        customerEmail: orderForm.customerEmail,
        customerPhone: orderForm.customerPhone,
        lineItems: orderForm.lineItems.map((li) => ({
          inventoryItemId: li.inventoryItemId || null,
          itemId: li.itemId,
          itemName: li.itemName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          unit: li.unit,
          locationName: li.locationName,
        })),
        taxRate: Number(orderForm.taxRate) || 0,
        discount: Number(orderForm.discount) || 0,
        notes: orderForm.notes,
        dueDate: orderForm.dueDate || null,
        paymentMethod: orderForm.paymentMethod,
        status: orderForm.confirmImmediately ? "confirmed" : "draft",
      };

      await apiService.sales.createOrder(payload);
      toast.success(
        orderForm.confirmImmediately
          ? "Sales order created and confirmed!"
          : "Draft sales order saved!"
      );

      setIsOrderModalOpen(false);
      // Reset form
      setOrderForm({
        customerId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        lineItems: [],
        taxRate: 0,
        discount: 0,
        notes: "",
        dueDate: "",
        paymentMethod: "Bank Transfer",
        confirmImmediately: false,
      });

      fetchOrders();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create sales order");
    } finally {
      setLoading(false);
    }
  };

  // Order Actions
  const handleConfirmOrder = async (orderId) => {
    try {
      await apiService.sales.confirmOrder(orderId);
      toast.success("Sales order confirmed!");
      fetchOrders();
      fetchStats();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: "confirmed" }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to confirm order");
    }
  };

  // Core inventory fulfillment action
  const handleFulfillOrder = async (orderId) => {
    if (
      !window.confirm(
        "Fulfilling this sales order will immediately deduct stock from the linked inventory items in FIFO order. Proceed?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const res = await apiService.sales.fulfillOrder(orderId);
      toast.success(res.message || "Order fulfilled and inventory updated!");
      fetchOrders();
      fetchStats();
      fetchInventoryItems(); // Refresh inventory cache
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(res.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to fulfill sales order");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (orderId) => {
    try {
      setLoading(true);
      const res = await apiService.sales.generateInvoice(orderId, {
        paymentTerms: "Net 30",
      });
      toast.success("Invoice generated and linked to this order!");
      fetchOrders();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(res.data?.order);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    const reason = window.prompt("Reason for cancellation (optional):");
    if (reason === null) return; // User pressed Cancel on prompt

    try {
      await apiService.sales.cancelOrder(orderId, { reason });
      toast.success("Sales order cancelled");
      fetchOrders();
      fetchStats();
      if (selectedOrder?._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: "cancelled" }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel order");
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      setLoading(true);
      const res = await apiService.sales.recordPayment(selectedOrder._id, {
        amount: Number(paymentAmount),
        paymentMethod,
      });
      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      setPaymentAmount("");
      setSelectedOrder(res.data);
      fetchOrders();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  // Customer Management
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      setLoading(true);
      if (customerForm.id) {
        await apiService.sales.updateCustomer(customerForm.id, customerForm);
        toast.success("Customer updated!");
      } else {
        await apiService.sales.createCustomer(customerForm);
        toast.success("Customer created!");
      }
      setIsCustomerModalOpen(false);
      setCustomerForm({
        id: null,
        name: "",
        type: "business",
        email: "",
        phone: "",
        address: "",
        contactPerson: "",
        taxId: "",
        notes: "",
      });
      fetchCustomers();
      fetchStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      await apiService.sales.deleteCustomer(id);
      toast.success("Customer removed");
      fetchCustomers();
      fetchStats();
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      toast.error("No orders to export");
      return;
    }
    const headers = [
      "Order Number",
      "Customer",
      "Items Count",
      "Subtotal",
      "Tax",
      "Total Amount",
      "Status",
      "Payment Status",
      "Created Date",
    ];
    const rows = orders.map((o) => [
      o.orderNumber,
      `"${o.customerName || ""}"`,
      o.lineItems?.length || 0,
      o.subtotal || 0,
      o.taxAmount || 0,
      o.totalAmount || 0,
      o.status,
      o.paymentStatus,
      new Date(o.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Module Breadcrumb (standardized with all other modules) */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          {
            label: "Sales",
            icon: "fa-handshake",
            ...(activeTab !== "dashboard" && {
              onClick: () => setActiveTab("dashboard"),
            }),
          },
          ...(activeTab === "orders"
            ? [{ label: "Sales Orders", icon: "fa-cart-shopping" }]
            : activeTab === "customers"
            ? [{ label: "Customers", icon: "fa-users" }]
            : activeTab === "reports"
            ? [{ label: "Reports & Analytics", icon: "fa-file-invoice-dollar" }]
            : []),
        ]}
      />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-5 pb-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <i className="fa-solid fa-handshake text-lg"></i>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Sales Management
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Process sales orders, manage customers, and synchronize inventory fulfillment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCustomerForm({
                      id: null,
                      name: "",
                      type: "business",
                      email: "",
                      phone: "",
                      address: "",
                      contactPerson: "",
                      taxId: "",
                      notes: "",
                    });
                    setIsCustomerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <i className="fa-solid fa-user-plus text-slate-500 text-xs"></i>
                  Add Customer
                </button>
                <button
                  onClick={() => {
                    handleAddLineItem();
                    setIsOrderModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  New Sales Order
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mt-6 gap-8 overflow-x-auto scrollbar-none">
              {[
                { id: "dashboard", label: "Dashboard", icon: "fa-chart-pie" },
                { id: "orders", label: `Sales Orders (${ordersTotal})`, icon: "fa-cart-shopping" },
                { id: "customers", label: `Customers (${customers.length})`, icon: "fa-users" },
                { id: "reports", label: "Reports & Analytics", icon: "fa-file-invoice-dollar" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-emerald-600 text-emerald-600"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <i className={`fa-solid ${tab.icon} text-xs`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ════════════════════════════════════════════════════════════════════════
            TAB 1: DASHBOARD
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <i className="fa-solid fa-naira-sign text-sm"></i>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-slate-900">
                    {formatCurrency(stats?.stats?.totalRevenue || 0)}
                  </h3>
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    <i className="fa-solid fa-check-circle text-xs mr-1"></i>
                    {formatCurrency(stats?.stats?.totalPaid || 0)} collected
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Total Orders
                  </span>
                  <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="fa-solid fa-cart-shopping text-sm"></i>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-slate-900">
                    {stats?.stats?.totalOrders || 0}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {stats?.stats?.fulfilledOrders || 0} fulfilled /{" "}
                    {stats?.stats?.confirmedOrders || 0} confirmed
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Active Customers
                  </span>
                  <div className="size-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <i className="fa-solid fa-building-user text-sm"></i>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-slate-900">
                    {stats?.stats?.totalCustomers || 0}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Accounts in database
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Outstanding Balance
                  </span>
                  <div className="size-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-black text-amber-700">
                    {formatCurrency(stats?.stats?.unpaidAmount || 0)}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Unpaid & partial orders
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory Integration Status Banner */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-boxes-stacked"></i>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">
                    Inventory Module Linked & Synchronized
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Fulfilling sales orders automatically issues stock from the central Inventory FIFO
                    batches and writes to the stock movement ledger.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  <i className="fa-solid fa-circle-check text-[10px]"></i>
                  Live Sync Active
                </span>
              </div>
            </div>

            {/* Charts & Top Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Selling Products */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Top Selling Products
                </h3>
                {stats?.topItems && stats.topItems.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.topItems}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value), "Revenue"]}
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
                    <i className="fa-solid fa-chart-column text-3xl mb-2"></i>
                    No sales item data available yet
                  </div>
                )}
              </div>

              {/* Recent Orders List */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Recent Orders
                </h3>
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentOrders.map((order) => (
                      <div
                        key={order._id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsViewModalOpen(true);
                        }}
                        className="p-3 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-slate-500 truncate max-w-[140px]">
                            {order.customerName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">
                            {formatCurrency(order.totalAmount)}
                          </p>
                          <OrderStatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-10">No recent orders</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 2: SALES ORDERS
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Filters Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search order #, customer, item..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="invoiced">Invoiced</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
                  title="Export orders as CSV"
                >
                  <i className="fa-solid fa-file-export text-xs text-slate-500"></i>
                  Export
                </button>
              </div>
            </div>

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Order #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <i className="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
                        <p>Loading sales orders...</p>
                      </td>
                    </tr>
                  )}

                  {!loading && orders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500">
                        <i className="fa-solid fa-receipt text-4xl text-slate-300 mb-3 block"></i>
                        <p className="font-semibold text-slate-700">No sales orders found</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Click "New Sales Order" above to create your first order.
                        </p>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    orders.map((order) => (
                      <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{order.customerName}</p>
                          {order.customerEmail && (
                            <p className="text-xs text-slate-400">{order.customerEmail}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {order.lineItems?.length || 0} item(s)
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td className="py-3.5 px-4">
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsViewModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                          >
                            View
                          </button>

                          {order.status === "draft" && (
                            <button
                              onClick={() => handleConfirmOrder(order._id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                            >
                              Confirm
                            </button>
                          )}

                          {order.status === "confirmed" && (
                            <button
                              onClick={() => handleFulfillOrder(order._id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                            >
                              Fulfill Stock
                            </button>
                          )}

                          {order.status === "fulfilled" && !order.linkedInvoiceId && (
                            <button
                              onClick={() => handleGenerateInvoice(order._id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition"
                            >
                              Invoice
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 3: CUSTOMERS
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search by name, email, or contact person..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {customers.map((cust) => (
                <div
                  key={cust._id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {cust.customerId}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-0.5">{cust.name}</h4>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium capitalize ${
                          cust.type === "business"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {cust.type}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs text-slate-600">
                      {cust.contactPerson && (
                        <p className="flex items-center gap-2">
                          <i className="fa-regular fa-user text-slate-400 w-3"></i>
                          {cust.contactPerson}
                        </p>
                      )}
                      {cust.email && (
                        <p className="flex items-center gap-2">
                          <i className="fa-regular fa-envelope text-slate-400 w-3"></i>
                          {cust.email}
                        </p>
                      )}
                      {cust.phone && (
                        <p className="flex items-center gap-2">
                          <i className="fa-solid fa-phone text-slate-400 w-3"></i>
                          {cust.phone}
                        </p>
                      )}
                      {cust.address && (
                        <p className="flex items-center gap-2">
                          <i className="fa-solid fa-location-dot text-slate-400 w-3"></i>
                          <span className="truncate">{cust.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setOrderForm((prev) => ({
                          ...prev,
                          customerId: cust._id,
                          customerName: cust.name,
                          customerEmail: cust.email || "",
                          customerPhone: cust.phone || "",
                          lineItems: prev.lineItems.length > 0 ? prev.lineItems : [],
                        }));
                        handleAddLineItem();
                        setIsOrderModalOpen(true);
                      }}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <i className="fa-solid fa-cart-plus mr-1"></i>
                      New Order
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCustomerForm({
                            id: cust._id,
                            name: cust.name,
                            type: cust.type || "business",
                            email: cust.email || "",
                            phone: cust.phone || "",
                            address: cust.address || "",
                            contactPerson: cust.contactPerson || "",
                            taxId: cust.taxId || "",
                            notes: cust.notes || "",
                          });
                          setIsCustomerModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <i className="fa-solid fa-pen text-xs"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(cust._id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {customers.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <i className="fa-solid fa-users text-4xl mb-3 block text-slate-300"></i>
                  No customers registered yet
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            TAB 4: REPORTS & ANALYTICS
        ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Financial Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500">Gross Sales</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(stats?.stats?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500">Payments Received</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(stats?.stats?.totalPaid || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500">Outstanding Receivables</span>
                    <span className="font-bold text-amber-600">
                      {formatCurrency(stats?.stats?.unpaidAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500">Completed Orders</span>
                    <span className="font-bold text-slate-900">
                      {stats?.stats?.fulfilledOrders || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    Export Orders Data
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Download full reports of all transactions, customers, and order fulfillments
                    for bookkeeping or external auditing.
                  </p>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm transition shadow-sm"
                >
                  <i className="fa-solid fa-file-arrow-down"></i>
                  Download Sales Ledger (CSV)
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: CREATE NEW SALES ORDER
      ════════════════════════════════════════════════════════════════════════ */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <i className="fa-solid fa-cart-plus text-sm"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Create Sales Order</h3>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Existing Customer
                  </label>
                  <select
                    value={orderForm.customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Choose Customer --</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.customerId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.customerName}
                    onChange={(e) =>
                      setOrderForm((prev) => ({ ...prev, customerName: e.target.value }))
                    }
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Email
                  </label>
                  <input
                    type="email"
                    value={orderForm.customerEmail}
                    onChange={(e) =>
                      setOrderForm((prev) => ({ ...prev, customerEmail: e.target.value }))
                    }
                    placeholder="billing@company.com"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="text"
                    value={orderForm.customerPhone}
                    onChange={(e) =>
                      setOrderForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                    }
                    placeholder="+234 800 000 0000"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Order Line Items (Linked to Inventory)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    Add Line Item
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item / Inventory Link</th>
                        <th className="py-2.5 px-2 w-28 text-center">Available Stock</th>
                        <th className="py-2.5 px-2 w-24">Qty</th>
                        <th className="py-2.5 px-2 w-28">Unit Price</th>
                        <th className="py-2.5 px-3 w-32 text-right">Total</th>
                        <th className="py-2.5 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderForm.lineItems.map((li, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <select
                              value={li.inventoryItemId}
                              onChange={(e) =>
                                handleUpdateLineItem(idx, "inventoryItemId", e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 bg-white"
                            >
                              <option value="">-- Select Inventory Item --</option>
                              {inventoryItems.map((item) => (
                                <option key={item._id} value={item._id}>
                                  {item.name} ({item.itemId}) — {item.quantity} {item.unit || "pcs"}{" "}
                                  in stock
                                </option>
                              ))}
                            </select>
                            {!li.inventoryItemId && (
                              <input
                                type="text"
                                placeholder="Or enter custom item name"
                                value={li.itemName}
                                onChange={(e) =>
                                  handleUpdateLineItem(idx, "itemName", e.target.value)
                                }
                                className="w-full mt-1 px-2 py-1 text-xs rounded border border-slate-200"
                              />
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold">
                            {li.inventoryItemId ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  li.quantity > li.availableStock
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {li.availableStock} {li.unit}
                              </span>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="1"
                              value={li.quantity}
                              onChange={(e) =>
                                handleUpdateLineItem(idx, "quantity", e.target.value)
                              }
                              className={`w-full px-2 py-1.5 text-xs rounded border text-center ${
                                li.inventoryItemId && li.quantity > li.availableStock
                                  ? "border-rose-400 bg-rose-50"
                                  : "border-slate-300"
                              }`}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={li.unitPrice}
                              onChange={(e) =>
                                handleUpdateLineItem(idx, "unitPrice", e.target.value)
                              }
                              className="w-full px-2 py-1.5 text-xs rounded border border-slate-300"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(li.totalPrice)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(idx)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals & Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Terms & Method
                    </label>
                    <select
                      value={orderForm.paymentMethod}
                      onChange={(e) =>
                        setOrderForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card / POS">Card / POS</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={orderForm.dueDate}
                      onChange={(e) =>
                        setOrderForm((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notes / Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={orderForm.notes}
                      onChange={(e) =>
                        setOrderForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      placeholder="Delivery instructions, customer PO ref, etc."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(orderCalculations.subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Discount:</span>
                    <input
                      type="number"
                      min="0"
                      value={orderForm.discount}
                      onChange={(e) =>
                        setOrderForm((prev) => ({ ...prev, discount: e.target.value }))
                      }
                      className="w-24 px-2 py-1 text-xs text-right rounded border border-slate-300"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">Tax (%):</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={orderForm.taxRate}
                      onChange={(e) =>
                        setOrderForm((prev) => ({ ...prev, taxRate: e.target.value }))
                      }
                      className="w-20 px-2 py-1 text-xs text-right rounded border border-slate-300"
                    />
                  </div>

                  <div className="flex justify-between py-2 border-t border-slate-200 text-base font-bold">
                    <span className="text-slate-900">Grand Total:</span>
                    <span className="text-emerald-700">
                      {formatCurrency(orderCalculations.total)}
                    </span>
                  </div>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={orderForm.confirmImmediately}
                      onChange={(e) =>
                        setOrderForm((prev) => ({ ...prev, confirmImmediately: e.target.checked }))
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Confirm order immediately upon saving
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  {loading ? "Saving..." : "Save Sales Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: VIEW / FULFILL SALES ORDER DETAILS
      ════════════════════════════════════════════════════════════════════════ */}
      {isViewModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedOrder.orderNumber}
                  </h3>
                  <OrderStatusBadge status={selectedOrder.status} />
                  <PaymentStatusBadge status={selectedOrder.paymentStatus} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer & Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Customer Information
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{selectedOrder.customerName}</p>
                  {selectedOrder.customerEmail && <p className="text-slate-600">{selectedOrder.customerEmail}</p>}
                  {selectedOrder.customerPhone && <p className="text-slate-600">{selectedOrder.customerPhone}</p>}
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Payment & Execution
                  </span>
                  <p className="text-slate-700">
                    <strong>Payment Method:</strong> {selectedOrder.paymentMethod || "N/A"}
                  </p>
                  <p className="text-slate-700">
                    <strong>Paid Amount:</strong> {formatCurrency(selectedOrder.paidAmount || 0)}
                  </p>
                  {selectedOrder.fulfilledAt && (
                    <p className="text-emerald-700 font-semibold mt-1">
                      <i className="fa-solid fa-circle-check mr-1"></i>
                      Fulfilled {new Date(selectedOrder.fulfilledAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Line Items
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrder.lineItems?.map((li, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{li.itemName}</p>
                            {li.itemId && <p className="text-[10px] text-slate-400">SKU: {li.itemId}</p>}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold">
                            {li.quantity} {li.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(li.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(li.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal:</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(selectedOrder.subtotal)}
                  </span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discount:</span>
                    <span className="text-rose-600 font-semibold">
                      -{formatCurrency(selectedOrder.discount)}
                    </span>
                  </div>
                )}
                {selectedOrder.taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax ({selectedOrder.taxRate}%):</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(selectedOrder.taxAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedOrder.status !== "fulfilled" && selectedOrder.status !== "cancelled" && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder._id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded text-rose-700 hover:bg-rose-50 border border-rose-200 transition"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status === "draft" && (
                  <button
                    onClick={() => handleConfirmOrder(selectedOrder._id)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    Confirm Order
                  </button>
                )}

                {selectedOrder.status === "confirmed" && (
                  <button
                    onClick={() => handleFulfillOrder(selectedOrder._id)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                  >
                    <i className="fa-solid fa-boxes-packing mr-1"></i>
                    Fulfill Stock (FIFO)
                  </button>
                )}

                {selectedOrder.status === "fulfilled" && !selectedOrder.linkedInvoiceId && (
                  <button
                    onClick={() => handleGenerateInvoice(selectedOrder._id)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition shadow-sm"
                  >
                    <i className="fa-solid fa-file-invoice mr-1"></i>
                    Generate Invoice
                  </button>
                )}

                {selectedOrder.paymentStatus !== "paid" && (
                  <button
                    onClick={() => {
                      setPaymentAmount(
                        String(selectedOrder.totalAmount - (selectedOrder.paidAmount || 0))
                      );
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shadow-sm"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: RECORD PAYMENT
      ════════════════════════════════════════════════════════════════════════ */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Record Payment for {selectedOrder.orderNumber}
            </h3>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Card / POS">Card / POS</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: ADD / EDIT CUSTOMER
      ════════════════════════════════════════════════════════════════════════ */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {customerForm.id ? "Edit Customer" : "Add New Customer"}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer / Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={customerForm.type}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="business">Business / Corporate</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={customerForm.contactPerson}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({ ...prev, contactPerson: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={customerForm.phone}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={customerForm.address}
                    onChange={(e) =>
                      setCustomerForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  {customerForm.id ? "Update Customer" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
