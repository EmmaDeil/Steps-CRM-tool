import React, { useState } from "react";
import Breadcrumb from "../Breadcrumb";

const DocSign = () => {
  // Mock data for templates
  const [templates] = useState([
    {
      id: 1,
      name: "Employment Agreement",
      category: "HR & People",
      categoryColor: "purple",
      description: "Standard employment contract template for new hires.",
      lastModified: "2 days ago",
      previewLines: 8,
    },
    {
      id: 2,
      name: "Service Level Agreement",
      category: "Sales & Legal",
      categoryColor: "blue",
      description: "Comprehensive SLA template for client engagements.",
      lastModified: "1 week ago",
      previewLines: 10,
    },
    {
      id: 3,
      name: "W-9 Tax Form",
      category: "Finance",
      categoryColor: "green",
      description: "IRS Form W-9 for vendor and contractor tax information.",
      lastModified: "3 days ago",
      previewLines: 12,
    },
    {
      id: 4,
      name: "Residential Lease Agreement",
      category: "Real Estate",
      categoryColor: "orange",
      description: "Standard residential lease agreement template.",
      lastModified: "5 days ago",
      previewLines: 9,
    },
    {
      id: 5,
      name: "Mutual Non-Disclosure Agreement",
      category: "Sales & Legal",
      categoryColor: "blue",
      description: "Protect sensitive information shared between parties.",
      lastModified: "1 day ago",
      previewLines: 7,
    },
  ]);

  // Mock data for pending requests
  const [pendingRequests] = useState([
    {
      id: 1,
      title: "Q3 Financial Audit Report",
      sender: "Sarah Johnson",
      senderInitials: "SJ",
      initialsColor: "blue",
      due: "Oct 28, 2024",
      isUrgent: true,
      icon: "fa-briefcase",
    },
    {
      id: 2,
      title: "Employee Handbook Acknowledgment",
      sender: "Michael Chen",
      senderInitials: "MC",
      initialsColor: "purple",
      due: "Nov 5, 2024",
      isUrgent: false,
      icon: "fa-user",
    },
    {
      id: 3,
      title: "Vendor Agreement - Acme Corp",
      sender: "Jessica Williams",
      senderInitials: "JW",
      initialsColor: "green",
      due: "Oct 30, 2024",
      isUrgent: true,
      icon: "fa-file-contract",
    },
  ]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedTimeRange, setSelectedTimeRange] = useState("Any Time");
  const [sortBy, setSortBy] = useState("Sort: Last Modified");

  // Modal states
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showSendRequestModal, setShowSendRequestModal] = useState(false);

  // Send Request Modal States
  const [signingOrder, setSigningOrder] = useState("sequential"); // sequential or parallel
  const [signers, setSigners] = useState([
    { id: 1, name: "Jane Doe", email: "jane.doe@example.com", color: "blue" },
    { id: 2, name: "", email: "", color: "purple" },
  ]);
  const [emailSubject, setEmailSubject] = useState(
    "Please sign: Contract_v2.pdf"
  );
  const [emailMessage, setEmailMessage] = useState(
    "Hello, please review and sign this contract at your earliest convenience. Thank you."
  );
  const [autoReminder, setAutoReminder] = useState("No reminders");
  const [expirationDate, setExpirationDate] = useState("");
  const [customBranding, setCustomBranding] = useState(false);
  const [currentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [_signatureFields, _setSignatureFields] = useState([
    {
      id: 1,
      type: "signature",
      signer: 1,
      x: 50,
      y: 650,
      width: 220,
      height: 56,
      required: true,
    },
    {
      id: 2,
      type: "date",
      signer: 2,
      x: 400,
      y: 650,
      width: 180,
      height: 56,
      required: false,
    },
  ]);
  const [selectedField, setSelectedField] = useState(1);

  // Save Template Modal States
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("Contract_v2_Template");
  const [templateCategory, setTemplateCategory] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Signature Review Modal States
  const [showSignatureReview, setShowSignatureReview] = useState(false);
  const [signatureTab, setSignatureTab] = useState("draw"); // draw, type, upload
  const [showSignaturePopover, setShowSignaturePopover] = useState(false);
  const [currentSignature, setCurrentSignature] = useState(null);

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All Categories" ||
      template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get category badge color
  const getCategoryColor = (color) => {
    const colors = {
      purple: "bg-purple-50 text-purple-700 ring-purple-700/10",
      blue: "bg-blue-50 text-blue-700 ring-blue-700/10",
      green: "bg-green-50 text-green-700 ring-green-700/10",
      orange: "bg-orange-50 text-orange-700 ring-orange-700/10",
    };
    return colors[color] || colors.blue;
  };

  // Get initials badge color
  const getInitialsColor = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600",
      purple: "bg-purple-100 text-purple-600",
      green: "bg-green-100 text-green-600",
      orange: "bg-orange-100 text-orange-600",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-[#f6f7f8]">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "DocSign", icon: "fa-pen-fancy" },
        ]}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#111418]">
                Document Signing
              </h2>
              <p className="text-sm text-[#617589] mt-1">
                Manage your pending actions and template library.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowCreateTemplateModal(true)}
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#111418] border border-[#dbe0e6] px-5 py-2.5 rounded-lg font-semibold shadow-sm transition-all active:scale-95"
              >
                <i className="fa-solid fa-circle-plus text-xl"></i>
                Create New Template
              </button>
              <button
                onClick={() => setShowSendRequestModal(true)}
                className="flex items-center justify-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md shadow-blue-500/20 transition-all hover:shadow-lg active:scale-95"
              >
                <i className="fa-solid fa-paper-plane text-xl"></i>
                Send New Signature Request
              </button>
            </div>
          </div>

          {/* Pending Requests Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fa-solid fa-clock text-orange-500"></i>
              <h3 className="text-lg font-bold text-[#111418]">
                Pending Requests
              </h3>
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length} Waiting
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className={`bg-white p-4 rounded-xl ${
                    request.isUrgent ? "border-l-4 border-l-orange-500" : ""
                  } border-y border-r border-r-[#e5e7eb] border-y-[#e5e7eb] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all`}
                >
                  <div className="flex items-start md:items-center gap-4">
                    <div
                      className={`size-10 rounded-full ${getInitialsColor(
                        request.initialsColor
                      )} flex items-center justify-center shrink-0`}
                    >
                      <span className="font-bold text-sm">
                        {request.senderInitials}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#111418] group-hover:text-[#137fec] transition-colors">
                        {request.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#617589]">
                        <span className="flex items-center gap-1">
                          <i
                            className={`fa-solid ${request.icon} text-[16px]`}
                          ></i>
                          Sent by {request.sender}
                        </span>
                        <span className="hidden md:inline text-gray-300">
                          •
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            request.isUrgent
                              ? "text-orange-600 font-medium"
                              : ""
                          }`}
                        >
                          <i className="fa-solid fa-calendar text-[16px]"></i>
                          Due: {request.due}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end w-full md:w-auto pl-14 md:pl-0">
                    <button
                      onClick={() =>
                        alert(
                          `Opening signature interface for: ${request.title}`
                        )
                      }
                      className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#111418] text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                      <i className="fa-solid fa-signature text-[18px]"></i>
                      Review & Sign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Divider */}
          <div className="w-full h-px bg-gray-200"></div>

          {/* Saved Templates Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-folder text-[#137fec]"></i>
              <h3 className="text-lg font-bold text-[#111418]">
                Saved Templates
              </h3>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between sticky top-0 z-10">
              {/* Search */}
              <div className="relative w-full lg:w-96 group">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] group-focus-within:text-[#137fec] transition-colors"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe0e6] bg-gray-50 text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none transition-all placeholder:text-gray-400"
                  placeholder="Search templates by name..."
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Category Filter */}
                <div className="relative min-w-[140px] flex-1 lg:flex-none">
                  <i className="fa-solid fa-filter absolute left-2.5 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none"></i>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] appearance-none cursor-pointer text-[#111418] font-medium"
                  >
                    <option>All Categories</option>
                    <option>HR & People</option>
                    <option>Sales & Legal</option>
                    <option>Finance</option>
                    <option>Real Estate</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                </div>

                {/* Time Range Filter */}
                <div className="relative min-w-[140px] flex-1 lg:flex-none">
                  <i className="fa-solid fa-calendar absolute left-2.5 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none"></i>
                  <select
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value)}
                    className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] appearance-none cursor-pointer text-[#111418] font-medium"
                  >
                    <option>Any Time</option>
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                    <option>Last Year</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                </div>

                <div className="w-px h-6 bg-gray-200 hidden lg:block mx-1"></div>

                {/* Sort */}
                <div className="relative min-w-[160px] flex-1 lg:flex-none">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-10 pl-3 pr-8 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] appearance-none cursor-pointer text-[#111418] font-medium"
                  >
                    <option>Sort: Last Modified</option>
                    <option>Sort: Name (A-Z)</option>
                    <option>Sort: Date Created</option>
                  </select>
                  <i className="fa-solid fa-sort absolute right-2 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-xs"></i>
                </div>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group bg-white rounded-xl border border-[#e5e7eb] hover:border-[#137fec] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex flex-col overflow-hidden relative"
                >
                  {/* Preview Area */}
                  <div className="h-44 bg-gray-50 border-b border-[#e5e7eb] relative flex items-center justify-center p-6 overflow-hidden">
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

                    {/* Document Preview */}
                    <div className="w-32 h-40 bg-white shadow-sm border border-gray-200 rounded flex flex-col p-3 gap-2 group-hover:scale-105 transition-transform duration-300 relative z-10">
                      <div className="h-2 w-1/3 bg-gray-200 rounded"></div>
                      {[...Array(template.previewLines)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 ${
                            i === template.previewLines - 1 ? "w-2/3" : "w-full"
                          } bg-gray-100 rounded`}
                        ></div>
                      ))}
                      <div className="mt-auto flex justify-end">
                        <div className="h-4 w-12 bg-blue-100 rounded-sm"></div>
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="absolute top-3 right-3 z-20">
                      <span
                        className={`inline-flex items-center rounded-md ${getCategoryColor(
                          template.categoryColor
                        )} px-2 py-1 text-xs font-bold ring-1 ring-inset uppercase tracking-wide`}
                      >
                        {template.category}
                      </span>
                    </div>
                  </div>

                  {/* Template Info */}
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-[#111418] text-lg truncate pr-2 group-hover:text-[#137fec] transition-colors">
                        {template.name}
                      </h3>
                    </div>
                    <p className="text-sm text-[#617589] line-clamp-2 mb-4">
                      {template.description}
                    </p>

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-[#617589] tracking-wider">
                          Last Modified
                        </span>
                        <span className="text-xs font-medium text-[#111418]">
                          {template.lastModified}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-[#617589] hover:text-[#137fec] hover:bg-blue-50 rounded transition-colors"
                          title="Preview Template"
                        >
                          <i className="fa-solid fa-eye text-[20px]"></i>
                        </button>
                        <button
                          className="p-1.5 text-[#617589] hover:text-[#137fec] hover:bg-blue-50 rounded transition-colors"
                          title="Edit Template"
                        >
                          <i className="fa-solid fa-edit text-[20px]"></i>
                        </button>
                        <button
                          className="p-1.5 text-[#617589] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Template"
                        >
                          <i className="fa-solid fa-trash text-[20px]"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <i className="fa-solid fa-folder-open text-6xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  No templates found
                </h3>
                <p className="text-sm text-gray-500">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Create Template Modal Placeholder */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[#111418] mb-4">
              Create New Template
            </h3>
            <p className="text-sm text-[#617589] mb-6">
              Template creation functionality coming soon...
            </p>
            <button
              onClick={() => setShowCreateTemplateModal(false)}
              className="w-full px-4 py-2 bg-[#137fec] text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Send Signature Request Modal */}
      {showSendRequestModal && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3 z-20 shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSendRequestModal(false)}
                className="flex items-center gap-2 text-[#617589] hover:text-[#111418] transition-colors group"
              >
                <div className="flex items-center justify-center size-8 rounded-full bg-gray-50 group-hover:bg-gray-100">
                  <i className="fa-solid fa-arrow-left"></i>
                </div>
              </button>
              <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
              <div className="flex flex-col">
                <h2 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
                  Contract_v2.pdf
                  <i className="fa-solid fa-pen text-sm text-[#617589] cursor-pointer hover:text-[#137fec]"></i>
                </h2>
                <span className="text-xs text-[#617589]">
                  Last saved 2 minutes ago
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center mr-4 gap-2 text-sm text-[#617589]">
                <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                  Draft
                </div>
              </div>
              <button className="flex min-w-[70px] cursor-pointer items-center justify-center rounded-lg h-9 px-3 text-[#617589] hover:text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setShowSaveTemplateModal(true)}
                className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 border border-gray-200 hover:border-[#137fec] hover:text-[#137fec] bg-white text-[#111418] text-sm font-semibold leading-normal transition-colors gap-2"
              >
                <i className="fa-solid fa-save text-[18px]"></i>
                <span className="hidden lg:inline">Save Template</span>
              </button>
              <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#f0f2f4] hover:bg-gray-200 text-[#111418] text-sm font-bold leading-normal transition-colors">
                <span className="truncate">Save Draft</span>
              </button>
              <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold leading-normal shadow-sm transition-colors">
                <span className="truncate">Send Request</span>
              </button>
            </div>
          </header>

          {/* Main Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left Sidebar - Recipients & Settings */}
            <aside className="w-80 lg:w-96 flex flex-col border-r border-[#e5e7eb] bg-white overflow-y-auto shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
              {/* Recipients Section */}
              <div className="p-6 border-b border-[#f0f2f4]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#111418]">
                    Recipients
                  </h3>
                  <button className="text-xs font-medium text-[#137fec] hover:text-blue-700 flex items-center gap-1">
                    <i className="fa-solid fa-users text-sm"></i>
                    Directory
                  </button>
                </div>

                {/* Sequential/Parallel Toggle */}
                <div className="bg-gray-100 p-1 rounded-lg flex mb-5 relative">
                  <button
                    onClick={() => setSigningOrder("sequential")}
                    className={`flex-1 relative z-10 py-1.5 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1 rounded ${
                      signingOrder === "sequential"
                        ? "text-[#137fec] bg-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <i className="fa-solid fa-list-ol text-sm"></i>
                    Sequential
                  </button>
                  <button
                    onClick={() => setSigningOrder("parallel")}
                    className={`flex-1 relative z-10 py-1.5 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1 rounded ${
                      signingOrder === "parallel"
                        ? "text-[#137fec] bg-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <i className="fa-solid fa-grip-lines text-sm"></i>
                    Parallel
                  </button>
                </div>

                {/* Signer 1 */}
                <div className="flex flex-col gap-3 mb-6 relative group">
                  <div className="absolute -left-6 top-2 bottom-2 w-1 bg-[#137fec] rounded-r"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#137fec] uppercase tracking-wider flex items-center gap-1">
                      <i className="fa-solid fa-1 text-sm bg-[#137fec] text-white size-4 rounded-full flex items-center justify-center text-[10px]"></i>
                      Signer 1
                    </span>
                    <button className="text-[#617589] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <i className="fa-solid fa-trash text-lg"></i>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="relative group/input">
                      <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                      <input
                        type="text"
                        value={signers[0].name}
                        onChange={(e) => {
                          const newSigners = [...signers];
                          newSigners[0].name = e.target.value;
                          setSigners(newSigners);
                        }}
                        className="w-full h-10 pl-10 pr-9 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none text-[#111418] placeholder:text-gray-400"
                        placeholder="Search name or directory..."
                      />
                      <i className="fa-solid fa-address-book absolute right-3 top-1/2 -translate-y-1/2 text-[#137fec] cursor-pointer hover:bg-blue-50 p-1 rounded"></i>
                    </div>
                    <div className="relative">
                      <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                      <input
                        type="email"
                        value={signers[0].email}
                        onChange={(e) => {
                          const newSigners = [...signers];
                          newSigners[0].email = e.target.value;
                          setSigners(newSigners);
                        }}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none text-[#111418]"
                        placeholder="Email Address"
                      />
                    </div>
                  </div>
                </div>

                {/* Signer 2 */}
                <div className="flex flex-col gap-3 mb-4 relative group opacity-70 hover:opacity-100 transition-opacity">
                  <div className="absolute -left-6 top-2 bottom-2 w-1 bg-purple-500 rounded-r"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-500 uppercase tracking-wider flex items-center gap-1">
                      <i className="fa-solid fa-2 text-sm bg-purple-500 text-white size-4 rounded-full flex items-center justify-center text-[10px]"></i>
                      Signer 2
                    </span>
                    <button className="text-[#617589] hover:text-red-500">
                      <i className="fa-solid fa-trash text-lg"></i>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="relative">
                      <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                      <input
                        type="text"
                        value={signers[1].name}
                        onChange={(e) => {
                          const newSigners = [...signers];
                          newSigners[1].name = e.target.value;
                          setSigners(newSigners);
                        }}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none text-[#111418]"
                        placeholder="Search name or directory..."
                      />
                    </div>
                    <div className="relative">
                      <i className="fa-solid fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                      <input
                        type="email"
                        value={signers[1].email}
                        onChange={(e) => {
                          const newSigners = [...signers];
                          newSigners[1].email = e.target.value;
                          setSigners(newSigners);
                        }}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 outline-none text-[#111418]"
                        placeholder="Email Address"
                      />
                    </div>
                  </div>
                </div>

                <button className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-gray-300 text-[#137fec] text-sm font-medium hover:bg-gray-50 transition-colors mt-2">
                  <i className="fa-solid fa-user-plus text-lg"></i>
                  Add Another Signer
                </button>
              </div>

              {/* Email Message Section */}
              <div className="p-6 border-b border-[#f0f2f4]">
                <h3 className="text-base font-bold text-[#111418] mb-4">
                  Email Message
                </h3>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs font-medium text-[#617589] mb-1 block">
                      Subject
                    </span>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none text-[#111418]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-[#617589] mb-1 block">
                      Message
                    </span>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="w-full p-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none text-[#111418] resize-none"
                      rows="3"
                    ></textarea>
                  </label>
                </div>
              </div>

              {/* Request Settings Section */}
              <div className="p-6 pb-20">
                <h3 className="text-base font-bold text-[#111418] mb-4">
                  Request Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#617589] mb-1 block">
                      Automatic Reminders
                    </label>
                    <div className="relative">
                      <i className="fa-solid fa-bell absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                      <select
                        value={autoReminder}
                        onChange={(e) => setAutoReminder(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] text-[#111418] appearance-none"
                      >
                        <option>No reminders</option>
                        <option>Every day</option>
                        <option>Every 2 days</option>
                        <option>Weekly</option>
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none"></i>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#617589] mb-1 block">
                      Expiration Date
                    </label>
                    <div className="relative">
                      <i className="fa-solid fa-calendar-xmark absolute left-3 top-1/2 -translate-y-1/2 text-[#617589]"></i>
                      <input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] text-[#111418]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-[#e5e7eb] bg-gray-50">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#111418]">
                        Custom Branding
                      </span>
                      <span className="text-[10px] text-[#617589]">
                        Use company logo in email
                      </span>
                    </div>
                    <button
                      onClick={() => setCustomBranding(!customBranding)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        customBranding ? "bg-[#137fec]" : "bg-gray-200"
                      }`}
                      role="switch"
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={`${
                          customBranding ? "translate-x-5" : "translate-x-0"
                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                      ></span>
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 bg-[#f6f7f8] relative flex flex-col h-full overflow-hidden">
              {/* Page Controls */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white shadow-lg shadow-gray-200/50 rounded-lg px-2 py-2 flex items-center gap-1 border border-gray-200">
                <button className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors disabled:opacity-50">
                  <i className="fa-solid fa-angles-left text-lg"></i>
                </button>
                <button className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-chevron-left text-lg"></i>
                </button>
                <span className="text-xs font-semibold text-[#111418] w-20 text-center select-none font-mono">
                  Page {currentPage} / 5
                </span>
                <button className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors">
                  <i className="fa-solid fa-chevron-right text-lg"></i>
                </button>
                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                <button
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors"
                >
                  <i className="fa-solid fa-minus text-lg"></i>
                </button>
                <span className="text-xs font-medium text-[#111418] w-12 text-center select-none">
                  {zoomLevel}%
                </span>
                <button
                  onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors"
                >
                  <i className="fa-solid fa-plus text-lg"></i>
                </button>
              </div>

              {/* Document Canvas */}
              <div className="flex-1 overflow-auto p-12 flex justify-center items-start">
                <div
                  className="bg-white relative min-h-[877px] shadow-2xl rounded-sm border border-gray-200 group/doc"
                  style={{ width: `${(620 * zoomLevel) / 100}px` }}
                >
                  {/* Page Number */}
                  <div className="absolute -left-10 top-0 text-xs text-gray-400 font-mono">
                    01
                  </div>

                  {/* Document Content Placeholder */}
                  <div className="p-12 space-y-6 opacity-80 pointer-events-none select-none">
                    <div className="h-8 w-1/3 bg-gray-200 rounded mb-8"></div>
                    <div className="space-y-3">
                      <div className="h-3 w-full bg-gray-100 rounded"></div>
                      <div className="h-3 w-full bg-gray-100 rounded"></div>
                      <div className="h-3 w-5/6 bg-gray-100 rounded"></div>
                      <div className="h-3 w-full bg-gray-100 rounded"></div>
                    </div>
                    <div className="space-y-3 pt-4">
                      <div className="h-4 w-1/4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-full bg-gray-100 rounded"></div>
                      <div className="h-3 w-11/12 bg-gray-100 rounded"></div>
                    </div>
                    <div className="space-y-3 pt-4">
                      <div className="h-3 w-full bg-gray-100 rounded"></div>
                      <div className="h-3 w-4/5 bg-gray-100 rounded"></div>
                    </div>
                    <div className="pt-32 flex justify-between gap-12">
                      <div className="flex-1 space-y-2">
                        <div className="h-px bg-gray-300 w-full mb-2"></div>
                        <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-px bg-gray-300 w-full mb-2"></div>
                        <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Signature Field 1 */}
                  <div
                    className={`absolute cursor-move flex items-center px-3 gap-2 group shadow-[0_8px_16px_-4px_rgba(19,127,236,0.3)] ring-4 ring-blue-500/10 z-10 ${
                      selectedField === 1
                        ? "bg-blue-50/90 border-2 border-[#137fec]"
                        : "bg-blue-50/70 border-2 border-blue-400"
                    } rounded`}
                    onClick={() => setSelectedField(1)}
                    style={{
                      bottom: "128px",
                      left: "48px",
                      width: "220px",
                      height: "56px",
                    }}
                  >
                    <div className="bg-[#137fec] text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase absolute -top-3 left-2 shadow-sm">
                      Signature
                    </div>
                    <i className="fa-solid fa-signature text-[#137fec]"></i>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#137fec]">
                        Signer 1
                      </span>
                      <span className="text-[9px] text-blue-600 font-mono leading-none">
                        *Required
                      </span>
                    </div>
                    <div className="absolute -right-1 -bottom-1 size-3 bg-white border border-[#137fec] rounded-full cursor-se-resize shadow-sm hover:scale-125 transition-transform"></div>
                    <button className="absolute -top-3 -right-3 bg-white shadow-md border border-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50">
                      <i className="fa-solid fa-times text-sm"></i>
                    </button>
                  </div>

                  {/* Date Field 2 */}
                  <div
                    className={`absolute cursor-move flex items-center px-3 gap-2 hover:bg-purple-100/80 transition-colors z-0 hover:z-10 hover:shadow-md ${
                      selectedField === 2
                        ? "bg-purple-50/80 border-2 border-purple-500"
                        : "bg-purple-50/70 border border-purple-300 border-dashed"
                    } rounded`}
                    onClick={() => setSelectedField(2)}
                    style={{
                      bottom: "128px",
                      right: "48px",
                      width: "180px",
                      height: "56px",
                    }}
                  >
                    <div className="bg-purple-200 text-purple-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase absolute -top-3 left-2 opacity-80">
                      Date Signed
                    </div>
                    <i className="fa-solid fa-calendar text-purple-400"></i>
                    <span className="text-xs font-semibold text-purple-800">
                      Signer 2
                    </span>
                  </div>
                </div>
              </div>
            </main>

            {/* Right Sidebar - Form Fields */}
            <aside className="w-64 border-l border-[#e5e7eb] bg-white shrink-0 z-10 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
              <div className="p-5 border-b border-[#f0f2f4]">
                <h3 className="text-base font-bold text-[#111418]">
                  Form Fields
                </h3>
                <p className="text-xs text-[#617589] mt-1">
                  Drag and drop fields onto document.
                </p>
              </div>

              <div className="p-4 flex flex-col gap-3 overflow-y-auto">
                <div className="text-xs font-semibold text-[#617589] uppercase tracking-wider mb-1 mt-2">
                  Signature Fields
                </div>

                {/* Signature */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none">
                  <div className="size-8 rounded bg-blue-50 flex items-center justify-center text-[#137fec]">
                    <i className="fa-solid fa-signature text-lg"></i>
                  </div>
                  <span className="text-sm font-medium text-[#111418]">
                    Signature
                  </span>
                </div>

                {/* Initials */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none">
                  <div className="size-8 rounded bg-blue-50 flex items-center justify-center text-[#137fec]">
                    <i className="fa-solid fa-font text-lg"></i>
                  </div>
                  <span className="text-sm font-medium text-[#111418]">
                    Initials
                  </span>
                </div>

                {/* Date Signed */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none">
                  <div className="size-8 rounded bg-blue-50 flex items-center justify-center text-[#137fec]">
                    <i className="fa-solid fa-calendar-day text-lg"></i>
                  </div>
                  <span className="text-sm font-medium text-[#111418]">
                    Date Signed
                  </span>
                </div>

                <div className="h-px bg-gray-100 my-2"></div>

                <div className="text-xs font-semibold text-[#617589] uppercase tracking-wider mb-1">
                  Data Fields
                </div>

                {/* Textbox */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none">
                  <div className="size-8 rounded bg-gray-50 flex items-center justify-center text-gray-500">
                    <i className="fa-solid fa-text-width text-lg"></i>
                  </div>
                  <span className="text-sm font-medium text-[#111418]">
                    Textbox
                  </span>
                </div>

                {/* Checkbox */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none">
                  <div className="size-8 rounded bg-gray-50 flex items-center justify-center text-gray-500">
                    <i className="fa-solid fa-square-check text-lg"></i>
                  </div>
                  <span className="text-sm font-medium text-[#111418]">
                    Checkbox
                  </span>
                </div>

                {/* Full Name */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none">
                  <div className="size-8 rounded bg-gray-50 flex items-center justify-center text-gray-500">
                    <i className="fa-solid fa-id-badge text-lg"></i>
                  </div>
                  <span className="text-sm font-medium text-[#111418]">
                    Full Name
                  </span>
                </div>
              </div>

              {/* Field Properties */}
              <div className="mt-auto bg-gray-50 p-5 border-t border-[#e5e7eb]">
                <h4 className="text-xs font-bold text-[#617589] uppercase mb-3 flex justify-between">
                  Field Properties
                  <span className="text-[10px] bg-blue-500/10 text-[#137fec] px-1.5 py-0.5 rounded">
                    Signature
                  </span>
                </h4>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs text-[#111418] block mb-1 font-medium">
                      Assigned To
                    </span>
                    <select className="w-full text-sm border-gray-300 rounded-md shadow-sm h-9 bg-white focus:border-[#137fec] focus:ring-[#137fec]">
                      <option>Signer 1 (Jane Doe)</option>
                      <option>Signer 2</option>
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      checked
                      className="rounded border-gray-300 text-[#137fec] focus:ring-[#137fec] h-4 w-4"
                      id="req-check"
                      type="checkbox"
                    />
                    <label
                      className="text-sm text-[#111418] select-none"
                      htmlFor="req-check"
                    >
                      Required Field
                    </label>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500 mb-2 block">
                      Advanced
                    </span>
                    <label className="flex items-center gap-2">
                      <input
                        className="rounded border-gray-300 text-[#137fec] focus:ring-[#137fec] h-4 w-4"
                        type="checkbox"
                      />
                      <span className="text-sm text-[#111418] select-none">
                        Read Only
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Save Template Modal */}
          {showSaveTemplateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101922]/60 backdrop-blur-[2px] p-4 transition-all opacity-100 visible">
              <div className="w-full max-w-[480px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#e5e7eb] flex flex-col overflow-hidden transform scale-100 transition-all">
                {/* Modal Header */}
                <div className="px-6 py-5 border-b border-[#f0f2f4] flex items-center justify-between bg-white">
                  <div>
                    <h3 className="text-lg font-bold text-[#111418] leading-tight">
                      Save as Template
                    </h3>
                    <p className="text-xs text-[#617589] mt-1">
                      Save this setup to reuse later.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSaveTemplateModal(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[#617589] hover:bg-gray-100 transition-colors"
                  >
                    <i className="fa-solid fa-times text-xl"></i>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 bg-white">
                  {/* Template Name */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[#111418]">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none text-[#111418] placeholder:text-gray-400 shadow-sm transition-all"
                        placeholder="e.g. Standard NDA"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="flex text-sm font-semibold text-[#111418] justify-between">
                      Category
                      <a
                        href="#"
                        className="text-xs font-medium text-[#137fec] hover:text-blue-600 transition-colors"
                      >
                        Manage Categories
                      </a>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none flex items-center justify-center">
                        <i className="fa-solid fa-folder text-[20px]"></i>
                      </div>
                      <select
                        value={templateCategory}
                        onChange={(e) => setTemplateCategory(e.target.value)}
                        className="w-full h-11 pl-10 pr-10 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none text-[#111418] appearance-none shadow-sm transition-all cursor-pointer"
                      >
                        <option value="" disabled>
                          Select a category...
                        </option>
                        <option value="hr">Human Resources</option>
                        <option value="legal">Legal</option>
                        <option value="sales">Sales & Marketing</option>
                        <option value="finance">Finance</option>
                        <option value="operations">Operations</option>
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none flex items-center">
                        <i className="fa-solid fa-chevron-down text-[20px]"></i>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#617589]">
                      Categorizing templates helps your team find them faster.
                    </p>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-[#111418]">
                      Description{" "}
                      <span className="text-xs font-normal text-[#617589] ml-1">
                        (Optional)
                      </span>
                    </label>
                    <textarea
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      className="w-full p-3.5 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none text-[#111418] resize-none shadow-sm transition-all min-h-[80px]"
                      placeholder="Brief description of when to use this template..."
                    ></textarea>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-[#f8fafc] flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
                  <button
                    onClick={() => setShowSaveTemplateModal(false)}
                    className="px-5 h-10 rounded-lg text-sm font-semibold text-[#617589] hover:text-[#111418] hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="px-5 h-10 rounded-lg bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all transform active:scale-95 flex items-center gap-2">
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Signature Review Modal */}
      {showSignatureReview && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
          {/* Top Navigation & Context Header */}
          <header className="flex-none bg-white border-b border-[#f0f2f4] z-30 shadow-sm">
            {/* Top Row: Logo & Utilities */}
            <div className="px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-[#137fec]">
                  <i className="fa-solid fa-file-signature"></i>
                </div>
                <h2 className="text-lg font-bold tracking-tight">
                  DocuSignify
                </h2>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <span className="text-sm font-medium text-gray-500">
                  Service_Agreement_2023.pdf
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#137fec] transition-colors px-3 py-2 rounded-lg hover:bg-gray-50">
                  <i className="fa-solid fa-circle-question text-[20px]"></i>
                  <span className="hidden sm:inline">Help</span>
                </button>
                <button
                  onClick={() => setShowSignatureReview(false)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <i className="fa-solid fa-times text-[20px]"></i>
                  <span className="hidden sm:inline">Close</span>
                </button>
              </div>
            </div>

            {/* Second Row: Context & Progress */}
            <div className="px-6 py-4 bg-gray-50 border-t border-[#f0f2f4] flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold leading-tight">
                  Review and Sign
                </h1>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <span className="font-medium text-gray-900">John Doe</span>{" "}
                  has requested your signature.
                </p>
              </div>
              <div className="flex items-center gap-6 min-w-[300px]">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-gray-500">
                    <span>Progress</span>
                    <span>1 of 3 fields</span>
                  </div>
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-[#137fec] w-1/3 rounded-full"></div>
                  </div>
                </div>
                <button className="hidden sm:flex h-10 px-5 items-center justify-center bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  Next Field
                  <i className="fa-solid fa-arrow-down ml-2 text-[18px]"></i>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content: Document Viewer */}
          <main className="flex-1 overflow-y-auto relative bg-[#f6f7f8] p-6 md:p-12 flex justify-center scroll-smooth">
            {/* Document Page Wrapper */}
            <div className="relative w-full max-w-[850px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] transition-transform">
              {/* Page 1 of Document */}
              <div className="bg-white text-black min-h-[1100px] w-full p-16 relative">
                {/* Page Content Mockup */}
                <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-2">
                    <div className="size-10 bg-black rounded-full"></div>
                    <div className="font-bold text-xl tracking-tight">
                      Acme Corp
                    </div>
                  </div>
                  <div className="text-right text-gray-500 text-sm">
                    <p>Page 1 of 4</p>
                    <p>Date: Oct 24, 2023</p>
                  </div>
                </div>

                <div className="space-y-6 text-gray-800 text-sm leading-relaxed">
                  <h3 className="text-2xl font-bold mb-6 text-black">
                    Master Service Agreement
                  </h3>
                  <p>
                    This Master Service Agreement ("Agreement") is entered into
                    as of the date of last signature below ("Effective Date") by
                    and between Acme Corp ("Provider") and the undersigned
                    client ("Client").
                  </p>

                  <p className="font-bold mt-8 mb-2">1. SERVICES PROVIDED</p>
                  <p>
                    Provider agrees to perform the services described in the
                    attached Statement of Work ("SOW"). All services shall be
                    performed in a professional manner in accordance with
                    industry standards. Provider shall assign qualified
                    personnel to perform such services.
                  </p>

                  <p className="font-bold mt-8 mb-2">2. COMPENSATION</p>
                  <p>
                    Client agrees to pay Provider the fees set forth in the SOW.
                    Payment terms are Net 30 days from the date of invoice. Late
                    payments shall incur interest at the rate of 1.5% per month
                    or the maximum rate permitted by law, whichever is less.
                  </p>

                  <p className="font-bold mt-8 mb-2">3. CONFIDENTIALITY</p>
                  <p>
                    Each party acknowledges that it may have access to certain
                    confidential information of the other party. "Confidential
                    Information" means all information identified as
                    confidential or that should reasonably be understood to be
                    confidential given the nature of the information and the
                    circumstances of disclosure.
                  </p>

                  {/* Signature Section */}
                  <div className="mt-16 pt-8 border-t-2 border-black flex justify-between gap-12">
                    <div className="w-1/2">
                      <p className="font-bold mb-8">Provider Signature:</p>
                      {/* Pre-filled signature (Sender) */}
                      <div className="h-16 border-b border-black relative">
                        <span className="text-3xl font-['Dancing_Script'] absolute bottom-1 left-0 opacity-80 text-blue-900">
                          Jane Smith
                        </span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-wider">
                        Jane Smith, CEO
                      </p>
                    </div>

                    <div className="w-1/2 relative group/field">
                      <p className="font-bold mb-8">Client Signature:</p>
                      {/* Interactive Field Area */}
                      <div
                        onClick={() => setShowSignaturePopover(true)}
                        className="h-16 border-b border-black relative bg-yellow-50/50 hover:bg-yellow-100 transition-colors cursor-pointer flex items-end pb-2"
                      >
                        {currentSignature ? (
                          <span className="text-3xl font-['Dancing_Script'] text-blue-900">
                            {currentSignature}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic px-2">
                            Click to sign...
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-wider">
                        Client Name (You)
                      </p>

                      {/* Tooltip/Flag Indicator */}
                      {!currentSignature && (
                        <div className="absolute -right-8 top-12 translate-x-full">
                          <div className="bg-[#137fec] text-white text-xs font-bold py-2 px-3 rounded-r-lg shadow-md flex items-center gap-1 animate-pulse relative before:content-[''] before:absolute before:left-[-6px] before:top-0 before:h-full before:w-[6px] before:bg-blue-600">
                            <i className="fa-solid fa-pen text-[16px]"></i>
                            Sign Here
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Fields */}
                  <div className="mt-12 flex justify-between gap-12">
                    <div className="w-1/3 relative">
                      <p className="font-bold mb-4">Date:</p>
                      <div className="h-10 border-b border-black relative bg-gray-50 flex items-center px-2 text-gray-500">
                        10/24/2023
                      </div>
                    </div>
                    <div className="w-1/3 relative">
                      <p className="font-bold mb-4">Initials:</p>
                      {/* Example of a completed field */}
                      <div className="h-10 border-b border-black relative flex items-center px-2">
                        <span className="font-['Dancing_Script'] text-xl text-blue-800">
                          JD
                        </span>
                      </div>
                      <div className="absolute -right-2 top-0 text-green-600 bg-white rounded-full p-0.5 shadow-sm">
                        <i className="fa-solid fa-circle-check text-[18px]"></i>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 2 Placeholder */}
              <div className="bg-white text-black min-h-[400px] w-full p-16 mt-8 relative opacity-50">
                <h3 className="text-2xl font-bold mb-6 text-black">
                  Appendix A: Statement of Work
                </h3>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-100 w-full rounded"></div>
                  <div className="h-4 bg-gray-100 w-5/6 rounded"></div>
                  <div className="h-4 bg-gray-100 w-4/6 rounded"></div>
                </div>
              </div>

              {/* Floating Signature Popover */}
              {showSignaturePopover && (
                <div className="absolute top-[680px] right-20 md:right-[-2rem] z-20 w-[340px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden transform transition-all">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">
                      Create your signature
                    </span>
                    <button
                      onClick={() => setShowSignaturePopover(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <i className="fa-solid fa-times text-[18px]"></i>
                    </button>
                  </div>

                  <div className="p-4">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
                      <button
                        onClick={() => setSignatureTab("draw")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded text-center ${
                          signatureTab === "draw"
                            ? "bg-white shadow-sm text-[#137fec]"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Draw
                      </button>
                      <button
                        onClick={() => setSignatureTab("type")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded text-center ${
                          signatureTab === "type"
                            ? "bg-white shadow-sm text-[#137fec]"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Type
                      </button>
                      <button
                        onClick={() => setSignatureTab("upload")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded text-center ${
                          signatureTab === "upload"
                            ? "bg-white shadow-sm text-[#137fec]"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        Upload
                      </button>
                    </div>

                    {/* Canvas/Input Area */}
                    {signatureTab === "draw" && (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 bg-white flex items-center justify-center relative cursor-crosshair">
                        <span className="text-gray-300 pointer-events-none absolute text-sm">
                          Draw here
                        </span>
                        {/* Simulated drawn line */}
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          viewBox="0 0 300 128"
                        >
                          <path
                            d="M40,80 C60,60 80,100 120,60 S 200,90 260,50"
                            fill="none"
                            stroke="#137fec"
                            strokeLinecap="round"
                            strokeWidth="3"
                          />
                        </svg>
                        <button className="absolute bottom-2 right-2 text-xs text-gray-400 hover:text-red-500">
                          Clear
                        </button>
                      </div>
                    )}

                    {signatureTab === "type" && (
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Type your name"
                          className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none"
                          onChange={(e) => setCurrentSignature(e.target.value)}
                        />
                        <div className="border-2 border-gray-200 rounded-lg h-20 bg-white flex items-center justify-center">
                          <span className="text-3xl font-['Dancing_Script'] text-blue-900">
                            {currentSignature || "Your Name"}
                          </span>
                        </div>
                      </div>
                    )}

                    {signatureTab === "upload" && (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg h-32 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-[#137fec] transition-colors">
                        <i className="fa-solid fa-cloud-arrow-up text-gray-400 text-4xl mb-2"></i>
                        <p className="text-sm text-gray-600 mb-1">
                          Drag and drop or click to upload
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG or JPG (max 5MB)
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setShowSignaturePopover(false);
                          if (!currentSignature)
                            setCurrentSignature("Your Name");
                        }}
                        className="flex-1 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                      >
                        Adopt & Sign
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Bottom Action Bar */}
          <footer className="flex-none bg-white border-t border-[#f0f2f4] px-6 py-4 z-40">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
              {/* Legal / Decline */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <div className="relative group">
                  <button className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors">
                    Other Actions
                    <i className="fa-solid fa-chevron-up text-[18px]"></i>
                  </button>
                  {/* Dropdown Content */}
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden hidden group-hover:block">
                    <a
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      href="#"
                    >
                      Decline to Sign
                    </a>
                    <a
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      href="#"
                    >
                      Finish Later
                    </a>
                    <a
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      href="#"
                    >
                      Assign to Someone Else
                    </a>
                  </div>
                </div>
                <div className="hidden md:block h-6 w-px bg-gray-200"></div>
                <p className="text-xs text-gray-400 max-w-md hidden md:block">
                  By clicking Finish, I agree to be legally bound by this
                  document and the DocuSignify Terms of Use.
                </p>
              </div>

              {/* Primary Actions */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none h-11 px-8 bg-[#137fec] hover:bg-blue-600 text-white text-base font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]">
                  Finish & Submit
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
};

export default DocSign;
