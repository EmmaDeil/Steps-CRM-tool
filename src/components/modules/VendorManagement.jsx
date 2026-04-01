import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import Pagination from "../Pagination";
import ModuleLoader from "../common/ModuleLoader";
import apiService from "../../services/api";
import VendorDetails from "./VendorDetails";
import AddVendorModal from "./AddVendorModal";

const VendorManagement = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showEditScreen, setShowEditScreen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState("");
  const [isUpdatingVendor, setIsUpdatingVendor] = useState(false);
  const [contractFiles, setContractFiles] = useState([]);
  const [existingContracts, setExistingContracts] = useState([]);
  const [deletingContractIndex, setDeletingContractIndex] = useState(null);
  const [downloadingContractIndex, setDownloadingContractIndex] =
    useState(null);
  const contractInputRef = useRef(null);
  const [editForm, setEditForm] = useState({
    companyName: "",
    contactPerson: "",
    contactTitle: "",
    email: "",
    phone: "",
    website: "",
    taxId: "",
    serviceType: "",
    status: "Active",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    paymentMethod: "",
    bankName: "",
    accountNumber: "",
    routingNumber: "",
    paymentTerms: "Net 30",
  });

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/vendors", {
        params: {
          page: currentPage,
          status: statusFilter,
          serviceType: serviceTypeFilter,
          search: searchQuery,
        },
      });
      if (response.success) {
        setVendors(response.data.vendors || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching vendors:", error);
      toast.error("Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, serviceTypeFilter, searchQuery]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const getStatusBadge = (status) => {
    const badges = {
      Active: "bg-green-100 text-green-800 border-green-200",
      Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      Inactive: "bg-slate-100 text-slate-800 border-slate-200",
    };
    return badges[status] || badges.Inactive;
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getVendorDisplayName = (vendor) =>
    String(vendor?.companyName || vendor?.name || "").trim() ||
    "Unknown Vendor";

  const handleViewDetails = (vendorId) => {
    const vendor = vendors.find((v) => v._id === vendorId);
    if (vendor) {
      setSelectedVendor(vendor);
    }
  };

  const handleEditVendor = (_vendorId) => {
    const vendor = vendors.find(
      (v) => String(v?._id || v?.id || "") === String(_vendorId),
    );
    if (!vendor) {
      toast.error("Vendor not found");
      return;
    }

    setEditingVendorId(String(vendor._id || vendor.id || ""));
    setEditForm({
      companyName: String(vendor.companyName || vendor.name || ""),
      contactPerson: String(vendor.contactPerson || vendor.contactName || ""),
      contactTitle: String(vendor.contactTitle || ""),
      email: String(vendor.email || ""),
      phone: String(vendor.phone || ""),
      website: String(vendor.website || ""),
      taxId: String(vendor.taxId || ""),
      serviceType: String(vendor.serviceType || ""),
      status: String(vendor.status || "Active"),
      address: String(vendor.address || ""),
      city: String(vendor.city || ""),
      state: String(vendor.state || ""),
      zipCode: String(vendor.zipCode || vendor.zip || ""),
      paymentMethod: String(vendor.paymentMethod || ""),
      bankName: String(vendor.bankName || ""),
      accountNumber: String(vendor.accountNumber || ""),
      routingNumber: String(vendor.routingNumber || ""),
      paymentTerms: String(vendor.paymentTerms || "Net 30"),
    });
    setExistingContracts(
      Array.isArray(vendor.documents) ? vendor.documents : [],
    );
    setContractFiles([]);
    setShowEditScreen(true);
  };

  const closeEditScreen = () => {
    setShowEditScreen(false);
    setContractFiles([]);
  };

  const handleContractUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.length + contractFiles.length > 5) {
      toast.error("Maximum 5 new contract attachments allowed");
      return;
    }
    setContractFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeContractFile = (indexToRemove) => {
    setContractFiles((prev) =>
      prev.filter((_, index) => index !== indexToRemove),
    );
  };

  const handleDownloadExistingContract = async (docIndex) => {
    if (!editingVendorId) return;
    try {
      setDownloadingContractIndex(docIndex);
      const response = await apiService.get(
        `/api/vendors/${editingVendorId}/documents/${docIndex}`,
      );

      const documentData = response?.data || response;
      const base64Data = documentData?.data;
      const fileName = documentData?.name || `contract-${docIndex + 1}`;

      if (!base64Data) {
        toast.error("Unable to download contract");
        return;
      }

      const link = window.document.createElement("a");
      link.href = base64Data;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading contract:", error);
      toast.error("Failed to download contract");
    } finally {
      setDownloadingContractIndex(null);
    }
  };

  const handleDeleteExistingContract = async (docIndex) => {
    if (!editingVendorId) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this contract attachment?",
    );
    if (!confirmed) return;

    try {
      setDeletingContractIndex(docIndex);
      const response = await apiService.delete(
        `/api/vendors/${editingVendorId}/documents/${docIndex}`,
      );

      const updatedVendor = response?.data || response;
      const nextDocuments = Array.isArray(updatedVendor?.documents)
        ? updatedVendor.documents
        : [];

      setExistingContracts(nextDocuments);
      setVendors((prev) =>
        prev.map((vendor) => {
          const id = String(vendor?._id || vendor?.id || "");
          return id === editingVendorId
            ? { ...vendor, documents: nextDocuments }
            : vendor;
        }),
      );

      toast.success("Contract deleted successfully");
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Failed to delete contract");
    } finally {
      setDeletingContractIndex(null);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveVendorEdit = async (e) => {
    e.preventDefault();
    if (!editingVendorId) return;

    if (!editForm.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!editForm.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    try {
      setIsUpdatingVendor(true);
      const encodedDocuments = await Promise.all(
        contractFiles.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () =>
                resolve({
                  name: file.name,
                  data: reader.result,
                  size: file.size,
                  type: file.type,
                });
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
      );

      const payload = {
        companyName: editForm.companyName.trim(),
        contactPerson: editForm.contactPerson.trim(),
        contactTitle: editForm.contactTitle.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        website: editForm.website.trim(),
        taxId: editForm.taxId.trim(),
        serviceType: editForm.serviceType.trim(),
        status: editForm.status,
        address: editForm.address.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        zipCode: editForm.zipCode.trim(),
        paymentMethod: editForm.paymentMethod.trim(),
        bankName: editForm.bankName.trim(),
        accountNumber: editForm.accountNumber.trim(),
        routingNumber: editForm.routingNumber.trim(),
        paymentTerms: editForm.paymentTerms.trim(),
        ...(encodedDocuments.length > 0 ? { documents: encodedDocuments } : {}),
      };

      const response = await apiService.put(
        `/api/vendors/${editingVendorId}`,
        payload,
      );
      const updatedVendor = response?.data || response;

      setVendors((prev) =>
        prev.map((vendor) => {
          const id = String(vendor?._id || vendor?.id || "");
          return id === editingVendorId
            ? { ...vendor, ...updatedVendor }
            : vendor;
        }),
      );

      setSelectedVendor((prev) => {
        if (!prev) return prev;
        const prevId = String(prev?._id || prev?.id || "");
        return prevId === editingVendorId
          ? { ...prev, ...updatedVendor }
          : prev;
      });

      toast.success("Vendor updated successfully");
      setShowEditScreen(false);
      setContractFiles([]);
      setEditingVendorId("");
      fetchVendors();
    } catch (error) {
      toast.error(
        error?.serverData?.error ||
          error?.response?.data?.error ||
          "Failed to update vendor",
      );
    } finally {
      setIsUpdatingVendor(false);
    }
  };

  const handleVendorAdded = (newVendor) => {
    setVendors((prev) => [newVendor, ...prev]);
    fetchVendors(); // Refresh the list
  };

  if (selectedVendor) {
    return (
      <VendorDetails
        vendor={selectedVendor}
        onBack={() => setSelectedVendor(null)}
        onEdit={(vendorToEdit) => {
          const vendorId = String(vendorToEdit?._id || vendorToEdit?.id || "");
          if (!vendorId) {
            toast.error("Vendor not found");
            return;
          }
          setSelectedVendor(null);
          handleEditVendor(vendorId);
        }}
      />
    );
  }

  if (showEditScreen) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex flex-col">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            { label: "Finance", icon: "fa-coins", onClick: onBack },
            {
              label: "Vendor Management",
              icon: "fa-users",
              onClick: closeEditScreen,
            },
            { label: "Edit Vendor", icon: "fa-pen" },
          ]}
        />

        <main className="flex-1 overflow-auto">
          <div className="w-full px-2 py-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Edit Vendor
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Update vendor details and save changes.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeEditScreen}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Back
                  </button>
                </div>

                <form onSubmit={handleSaveVendorEdit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Company Name *
                      </span>
                      <input
                        type="text"
                        name="companyName"
                        value={editForm.companyName}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Contact Person
                      </span>
                      <input
                        type="text"
                        name="contactPerson"
                        value={editForm.contactPerson}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Contact Title
                      </span>
                      <input
                        type="text"
                        name="contactTitle"
                        value={editForm.contactTitle}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Email *</span>
                      <input
                        type="email"
                        name="email"
                        value={editForm.email}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Phone *</span>
                      <input
                        type="text"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Service Type
                      </span>
                      <input
                        type="text"
                        name="serviceType"
                        value={editForm.serviceType}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Website</span>
                      <input
                        type="url"
                        name="website"
                        value={editForm.website}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                        placeholder="https://example.com"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Tax ID</span>
                      <input
                        type="text"
                        name="taxId"
                        value={editForm.taxId}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Status</span>
                      <select
                        name="status"
                        value={editForm.status}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 md:col-span-2">
                      <span className="text-sm text-slate-600">Address</span>
                      <input
                        type="text"
                        name="address"
                        value={editForm.address}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">City</span>
                      <input
                        type="text"
                        name="city"
                        value={editForm.city}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">State</span>
                      <input
                        type="text"
                        name="state"
                        value={editForm.state}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Zip Code</span>
                      <input
                        type="text"
                        name="zipCode"
                        value={editForm.zipCode}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Payment Method
                      </span>
                      <input
                        type="text"
                        name="paymentMethod"
                        value={editForm.paymentMethod}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Payment Terms
                      </span>
                      <input
                        type="text"
                        name="paymentTerms"
                        value={editForm.paymentTerms}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">Bank Name</span>
                      <input
                        type="text"
                        name="bankName"
                        value={editForm.bankName}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Account Number
                      </span>
                      <input
                        type="text"
                        name="accountNumber"
                        value={editForm.accountNumber}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm text-slate-600">
                        Routing Number
                      </span>
                      <input
                        type="text"
                        name="routingNumber"
                        value={editForm.routingNumber}
                        onChange={handleEditFormChange}
                        className="px-3 py-2 rounded-lg border border-slate-300"
                      />
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Contracts
                      </h4>
                      <button
                        type="button"
                        onClick={() => contractInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
                      >
                        <i className="fa-solid fa-paperclip mr-2"></i>
                        Add Attachment
                      </button>
                      <input
                        ref={contractInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        multiple
                        onChange={handleContractUpload}
                      />
                    </div>

                    {existingContracts.length > 0 ? (
                      <div className="space-y-2">
                        {existingContracts.map((contract, index) => (
                          <div
                            key={`existing-${contract?.name || "doc"}-${index}`}
                            className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-900 truncate">
                                {contract?.name || `Contract ${index + 1}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(contract?.size || 0) > 0
                                  ? `${((contract.size || 0) / 1024).toFixed(1)} KB`
                                  : "Stored contract"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadExistingContract(index)
                                }
                                disabled={downloadingContractIndex === index}
                                className="text-primary hover:text-blue-700 text-sm disabled:opacity-60"
                              >
                                {downloadingContractIndex === index
                                  ? "Downloading..."
                                  : "Download"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteExistingContract(index)
                                }
                                disabled={deletingContractIndex === index}
                                className="text-red-600 hover:text-red-700 text-sm disabled:opacity-60"
                              >
                                {deletingContractIndex === index
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        No existing contracts.
                      </p>
                    )}

                    {contractFiles.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No new attachment selected.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {contractFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm text-slate-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeContractFile(index)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={closeEditScreen}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdatingVendor}
                      className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
                    >
                      {isUpdatingVendor ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return <ModuleLoader moduleName="Vendor Management" />;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins", onClick: onBack },
          { label: "Vendor Management", icon: "fa-users" },
        ]}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="w-full px-2 py-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-slate-900 tracking-tight text-3xl font-bold leading-tight">
                All Vendors
              </h1>
              <p className="text-slate-500 text-sm font-normal leading-normal">
                Manage your vendor directory and contacts efficiently.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
            >
              <i className="fa-solid fa-plus"></i>
              Add New Vendor
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
            <div className="relative w-full lg:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fa-solid fa-search text-slate-400"></i>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 sm:text-sm"
                placeholder="Search vendors by name, email or ID..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex items-center gap-2 h-10 pl-4 pr-8 rounded-lg bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors text-sm font-medium appearance-none cursor-pointer"
                >
                  <option value="">Status: All</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none"></i>
              </div>
              <div className="relative">
                <select
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value)}
                  className="flex items-center gap-2 h-10 pl-4 pr-8 rounded-lg bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors text-sm font-medium appearance-none cursor-pointer"
                >
                  <option value="">Service Type: All</option>
                  <option value="IT Services">IT Services</option>
                  <option value="Supplies & Logistics">
                    Supplies & Logistics
                  </option>
                  <option value="Transportation">Transportation</option>
                  <option value="Facility Management">
                    Facility Management
                  </option>
                  <option value="Security Services">Security Services</option>
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none"></i>
              </div>
              <button
                onClick={() => {
                  setStatusFilter("");
                  setServiceTypeFilter("");
                  setSearchQuery("");
                }}
                className="flex items-center justify-center size-10 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50 bg-white"
                title="Clear filters"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            </div>
          </div>

          {/* Vendor Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {vendors.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="text-5xl">📦</div>
                  <div className="text-slate-900 font-medium">
                    No vendors found
                  </div>
                  <div className="text-slate-500 text-sm">
                    Try adjusting your filters or add a new vendor
                  </div>
                </div>
              </div>
            ) : (
              vendors.map((vendor) => (
                <div
                  key={vendor._id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col group hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {vendor.logo ? (
                        <div
                          className="size-12 rounded-full bg-cover bg-center shrink-0 border border-slate-200"
                          style={{ backgroundImage: `url(${vendor.logo})` }}
                        ></div>
                      ) : (
                        <div className="size-12 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold text-lg border border-indigo-200 shrink-0">
                          {getInitials(getVendorDisplayName(vendor))}
                        </div>
                      )}
                      <div>
                        <h3 className="text-slate-900 font-bold text-base line-clamp-1">
                          {getVendorDisplayName(vendor)}
                        </h3>
                        <p className="text-slate-500 text-sm">
                          {vendor.serviceType || "General"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                        vendor.status,
                      )}`}
                    >
                      <span className="size-1.5 rounded-full bg-current"></span>
                      {vendor.status}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 my-3"></div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <i className="fa-solid fa-user text-slate-400 text-base"></i>
                      <span className="text-slate-900">
                        {vendor.contactName || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <i className="fa-solid fa-envelope text-slate-400 text-base"></i>
                      <a
                        className="text-primary hover:underline hover:text-blue-600 truncate"
                        href={`mailto:${vendor.email}`}
                      >
                        {vendor.email || "N/A"}
                      </a>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => handleViewDetails(vendor._id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-900 hover:bg-slate-50 transition-colors"
                    >
                      <i className="fa-solid fa-eye text-sm"></i>
                      Details
                    </button>
                    <button
                      onClick={() => handleEditVendor(vendor._id)}
                      className="flex items-center justify-center size-[38px] rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors"
                      title="Edit"
                    >
                      <i className="fa-solid fa-pen text-sm"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {vendors.length > 0 && (
            <div className="px-6 py-4 border border-slate-200 rounded-xl bg-white flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-medium text-slate-900">
                  {(currentPage - 1) * 10 + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-slate-900">
                  {Math.min(currentPage * 10, vendors.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-900">
                  {vendors.length}
                </span>{" "}
                results
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </main>

      {/* Add Vendor Modal */}
      <AddVendorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onVendorAdded={handleVendorAdded}
      />
    </div>
  );
};

export default VendorManagement;
