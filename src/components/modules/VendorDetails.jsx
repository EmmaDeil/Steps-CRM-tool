import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";

const VendorDetails = ({ vendor, onBack }) => {
  const handleDeactivate = () => {
    if (window.confirm("Are you sure you want to deactivate this vendor?")) {
      toast.info("Deactivate vendor feature coming soon");
    }
  };

  const handleContact = () => {
    window.location.href = `mailto:${vendor.email}`;
  };

  const handleEdit = () => {
    toast.info("Edit vendor feature coming soon");
  };

  const getStatusBadge = (status) => {
    const badges = {
      Active: "bg-green-50 text-green-700 ring-green-600/20",
      Pending: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
      Inactive: "bg-slate-100 text-slate-700 ring-slate-600/20",
    };
    return badges[status] || badges.Inactive;
  };

  // Sample transaction data (should come from API)
  const transactions = [
    {
      id: "INV-00921",
      date: "Oct 24, 2023",
      description: "Office Equipment Q4",
      amount: 5200.0,
      status: "Paid",
    },
    {
      id: "INV-00854",
      date: "Sep 15, 2023",
      description: "Bulk Paper Supply",
      amount: 1850.5,
      status: "Paid",
    },
    {
      id: "INV-00722",
      date: "Aug 02, 2023",
      description: "IT Peripherals",
      amount: 12400.0,
      status: "Paid",
    },
    {
      id: "INV-01004",
      date: "Nov 01, 2023",
      description: "Q4 Services Retainer",
      amount: 2000.0,
      status: "Pending",
    },
  ];

  // Sample contract data (should come from API)
  const contracts = [
    {
      id: 1,
      name: "Master Service Agreement 2023",
      expiry: "Dec 31, 2024",
      type: "pdf",
      archived: false,
    },
    {
      id: 2,
      name: "Non-Disclosure Agreement",
      effective: "Oct 10, 2021",
      type: "pdf",
      archived: false,
    },
    {
      id: 3,
      name: "Old Contract 2022 (Archived)",
      status: "Expired",
      type: "archived",
      archived: true,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Breadcrumbs */}
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Finance", icon: "fa-coins" },
          { label: "Vendor Management", icon: "fa-users", onClick: onBack },
          {
            label: vendor.name || "Vendor Details",
            icon: "fa-building",
          },
        ]}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-200 mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h1 className="text-slate-900 text-3xl md:text-4xl font-black leading-tight tracking-tight">
                  {vendor.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${getStatusBadge(
                    vendor.status
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {vendor.status}
                </span>
              </div>
              <p className="text-slate-500 text-base font-normal">
                Vendor ID:{" "}
                <span className="font-mono text-slate-900">
                  {vendor._id || "#VEN-0000"}
                </span>{" "}
                • Since{" "}
                {vendor.createdAt
                  ? new Date(vendor.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })
                  : "N/A"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleDeactivate}
                className="flex items-center justify-center rounded-lg h-10 px-4 bg-white border border-slate-200 text-red-600 gap-2 text-sm font-bold hover:bg-red-50 transition-colors"
              >
                <i className="fa-solid fa-ban text-sm"></i>
                <span className="hidden sm:inline">Deactivate</span>
              </button>
              <button
                onClick={handleContact}
                className="flex items-center justify-center rounded-lg h-10 px-4 bg-white border border-slate-200 text-slate-900 gap-2 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                <i className="fa-solid fa-envelope text-sm"></i>
                <span>Contact</span>
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center justify-center rounded-lg h-10 px-6 bg-primary text-white gap-2 text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors"
              >
                <i className="fa-solid fa-pen text-sm"></i>
                <span>Edit Details</span>
              </button>
            </div>
          </div>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (General Info + Transactions) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* General Information Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-building text-primary"></i>
                    General Information
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Headquarters
                    </span>
                    <span className="text-slate-900 text-base font-medium flex items-start gap-2">
                      {vendor.address || "123 Business St, Suite 400"}
                      <br />
                      {vendor.city || "City"}, {vendor.state || "ST"}{" "}
                      {vendor.zip || "00000"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Main Contact
                    </span>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="size-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                        {vendor.contactName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || "N/A"}
                      </div>
                      <div>
                        <p className="text-slate-900 text-sm font-bold">
                          {vendor.contactName || "N/A"}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {vendor.contactTitle || "Contact Person"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Phone Number
                    </span>
                    <a
                      className="text-slate-900 text-base font-medium hover:text-primary transition-colors"
                      href={`tel:${vendor.phone}`}
                    >
                      {vendor.phone || "N/A"}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Email Address
                    </span>
                    <a
                      className="text-slate-900 text-base font-medium hover:text-primary transition-colors"
                      href={`mailto:${vendor.email}`}
                    >
                      {vendor.email || "N/A"}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Website
                    </span>
                    <a
                      className="text-primary text-base font-medium hover:underline flex items-center gap-1"
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {vendor.website?.replace(/^https?:\/\//, "") || "N/A"}
                      {vendor.website && (
                        <i className="fa-solid fa-external-link text-xs"></i>
                      )}
                    </a>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Tax ID (EIN)
                    </span>
                    <span className="text-slate-900 text-base font-medium">
                      {vendor.taxId || "XX-XXX0000"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction History Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-receipt text-primary"></i>
                    Transaction History
                  </h3>
                  <button
                    onClick={() =>
                      toast.info("View all transactions coming soon")
                    }
                    className="text-sm font-bold text-primary hover:text-blue-600"
                  >
                    View All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                          Amount
                        </th>
                        <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-4 px-6 text-sm text-slate-900 font-medium">
                            {transaction.date}
                          </td>
                          <td className="py-4 px-6 text-sm text-primary font-medium cursor-pointer hover:underline">
                            {transaction.id}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500">
                            {transaction.description}
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-900 font-bold text-right">
                            ${transaction.amount.toFixed(2)}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                transaction.status === "Paid"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column (Payment Info + Contracts) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Payment Information Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-credit-card text-primary"></i>
                    Payment Details
                  </h3>
                </div>
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-500">
                      Payment Method
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {vendor.paymentMethod || "Wire Transfer"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-500">Bank Name</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {vendor.bankName || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-500">
                      Account Number
                    </span>
                    <span className="text-sm font-semibold text-slate-900 font-mono">
                      •••• {vendor.accountNumber?.slice(-4) || "0000"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-dashed border-slate-200">
                    <span className="text-sm text-slate-500">
                      Routing Number
                    </span>
                    <span className="text-sm font-semibold text-slate-900 font-mono">
                      •••• {vendor.routingNumber?.slice(-4) || "0000"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-500">
                      Payment Terms
                    </span>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {vendor.paymentTerms || "Net 30"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contracts / Agreements Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-file-contract text-primary"></i>
                    Contracts
                  </h3>
                  <button
                    onClick={() =>
                      toast.info("Upload contract feature coming soon")
                    }
                    className="text-primary hover:text-blue-600 transition-colors"
                    title="Upload New Contract"
                  >
                    <i className="fa-solid fa-circle-plus text-lg"></i>
                  </button>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {contracts.map((contract) => (
                    <div
                      key={contract.id}
                      className={`flex items-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group ${
                        contract.archived ? "opacity-70" : ""
                      }`}
                    >
                      <div
                        className={`size-10 rounded-lg flex items-center justify-center mr-3 ${
                          contract.archived
                            ? "bg-slate-100 text-slate-500"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            contract.archived ? "fa-folder" : "fa-file-pdf"
                          }`}
                        ></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {contract.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {contract.expiry
                            ? `Expires: ${contract.expiry}`
                            : contract.effective
                            ? `Effective: ${contract.effective}`
                            : contract.status}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          toast.info("Download feature coming soon")
                        }
                        className="size-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-primary transition-colors"
                      >
                        <i className="fa-solid fa-download text-sm"></i>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-slate-50/50 border-t border-slate-200 text-center">
                  <button
                    onClick={() => toast.info("View all documents coming soon")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All Documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorDetails;
