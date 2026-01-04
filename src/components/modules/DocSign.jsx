import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../Navbar";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/useAuth";
import DocSignRequest from "./DocSignRequest";

const DocSign = () => {
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedTimeRange, setSelectedTimeRange] = useState("Any Time");
  const [sortBy, setSortBy] = useState("Sort: Last Modified");

  // API Data States
  const [pendingRequests, setPendingRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = user?.email || user?.userId;
      if (!userId) {
        setError("User not authenticated");
        return;
      }

      // Fetch documents assigned to the user
      const response = await apiService.get("/api/documents", {
        params: { userId },
      });

      if (Array.isArray(response)) {
        // Filter pending documents (documents needing user action)
        const pending = response.filter(
          (doc) => doc.status === "Action Required" || doc.status === "Pending"
        );

        // Transform to match UI expectations
        const transformedPending = pending.map((doc, index) => ({
          id: doc._id,
          title: doc.name,
          sender: doc.uploadedByName || "Unknown",
          initials: getInitials(doc.uploadedByName || "Unknown"),
          color: getColorByIndex(index),
          dueDate: formatDueDate(doc.dueDate),
          urgent: isUrgent(doc.dueDate),
          document: doc,
        }));

        setPendingRequests(transformedPending);

        // Templates are completed documents
        const completedDocs = response.filter(
          (doc) => doc.status === "Completed"
        );
        const transformedTemplates = completedDocs.slice(0, 10).map((doc) => ({
          id: doc._id,
          title: doc.name,
          category: doc.metadata?.category || "General",
          categoryColor: getCategoryColor(doc.metadata?.category || "General"),
          description: doc.metadata?.description || "Document template",
          lastModified: formatDate(doc.updatedAt),
          document: doc,
        }));

        setTemplates(transformedTemplates);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents");
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch documents and templates on mount
  useEffect(() => {
    if (user?.userId || user?.email) {
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  // Helper functions
  const getInitials = (name) => {
    if (!name) return "??";
    const words = name.trim().split(" ");
    if (words.length === 1) return name.substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const getColorByIndex = (index) => {
    const colors = ["blue", "purple", "green", "orange"];
    return colors[index % colors.length];
  };

  const getCategoryColor = (category) => {
    const colorMap = {
      "HR & People": "purple",
      HR: "purple",
      Sales: "blue",
      Legal: "blue",
      Finance: "green",
      "Real Estate": "orange",
      General: "blue",
    };
    return colorMap[category] || "blue";
  };

  const formatDueDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return "Tomorrow";
    } else if (diffDays < 0) {
      return "Overdue";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const isUrgent = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffHours = diffTime / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours >= 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleReviewAndSign = (_requestId) => {
    // TODO: Implement signing view
    toast.info("Signing interface coming soon");
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      await apiService.delete(`/api/documents/${templateId}`);
      toast.success("Template deleted successfully");
      fetchDocuments();
    } catch (err) {
      console.error("Error deleting template:", err);
      toast.error("Failed to delete template");
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: "bg-blue-100",
        text: "text-blue-600",
        ring: "ring-blue-700/10",
        ringColor: "ring-inset ring-blue-700/10",
      },
      purple: {
        bg: "bg-purple-100",
        text: "text-purple-600",
        ring: "ring-purple-700/10",
        ringColor: "ring-inset ring-purple-700/10",
      },
      green: {
        bg: "bg-green-100",
        text: "text-green-600",
        ring: "ring-green-700/10",
        ringColor: "ring-inset ring-green-700/10",
      },
      orange: {
        bg: "bg-orange-100",
        text: "text-orange-600",
        ring: "ring-orange-700/10",
        ringColor: "ring-inset ring-orange-700/10",
      },
    };
    return colors[color] || colors.blue;
  };

  // Show request form if user clicks "Send Signature"
  if (showRequestForm) {
    return <DocSignRequest onBack={() => setShowRequestForm(false)} />;
  }

  return (
    <div className="w-full min-h-screen bg-[#f6f7f8] flex flex-col">
      <Navbar />
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "DocSign", icon: "fa-pen-fancy" },
        ]}
      />

      {/* Page Header */}
      <header className="w-full bg-white border-b border-[#e5e7eb] py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111418]">
            
            </h2>
            <p className="text-sm text-[#617589] mt-1">
              Manage your pending actions and template library.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#111418] border border-[#dbe0e6] px-2 py-2.5 rounded-lg font-semibold shadow-sm transition-all active:scale-95">
              <i className="fa-solid fa-plus-circle text-[18px]"></i>
              New Template
            </button>
            <button
              onClick={() => setShowRequestForm(true)}
              className="flex items-center justify-center gap-2 bg-[#137fec] hover:bg-blue-600 text-white px-2 py-2.5 rounded-lg font-semibold shadow-md shadow-blue-500/20 transition-all hover:shadow-lg active:scale-95"
            >
              <i className="fa-solid fa-paper-plane text-[18px]"></i>
              Send Signature
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full flex-1 overflow-y-auto p-2 scroll-smooth">
        <div className="max-w-7xl mx-auto space-y-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#137fec]"></div>
              <p className="text-sm text-[#617589] mt-4">
                Loading documents...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <i className="fa-solid fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
              <p className="text-sm text-[#617589] mb-4">{error}</p>
              <button
                onClick={fetchDocuments}
                className="px-4 py-2 bg-[#137fec] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Pending Requests Section */}
              <section className="w-full space-y-4 p-2">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-clock text-orange-500 text-[20px]"></i>
                  <h3 className="text-lg font-bold text-[#111418]">
                    Pending Requests
                  </h3>
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingRequests.length} Waiting
                  </span>
                </div>

                {pendingRequests.length === 0 ? (
                  <div className="w-full bg-white p-8 rounded-xl border border-[#e5e7eb] text-center">
                    <i className="fa-solid fa-inbox text-4xl text-[#617589] mb-3"></i>
                    <p className="text-sm text-[#617589]">
                      No pending signature requests
                    </p>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 gap-4">
                    {pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className={`bg-white p-4 rounded-xl ${
                          request.urgent
                            ? "border-l-4 border-l-orange-500"
                            : "border border-[#e5e7eb]"
                        } border-y border-r border-r-[#e5e7eb] border-y-[#e5e7eb] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all`}
                      >
                        <div className="flex items-start md:items-center gap-4">
                          <div
                            className={`size-10 rounded-full ${
                              getColorClasses(request.color).bg
                            } ${
                              getColorClasses(request.color).text
                            } flex items-center justify-center shrink-0`}
                          >
                            <span className="font-bold text-sm">
                              {request.initials}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#111418] group-hover:text-[#137fec] transition-colors">
                              {request.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#617589]">
                              <span className="flex items-center gap-1">
                                <i className="fa-solid fa-user text-[14px]"></i>{" "}
                                Sent by {request.sender}
                              </span>
                              <span className="hidden md:inline text-gray-300">
                                •
                              </span>
                              <span
                                className={`flex items-center gap-1 ${
                                  request.urgent
                                    ? "text-orange-600 font-medium"
                                    : ""
                                }`}
                              >
                                <i className="fa-solid fa-calendar text-[14px]"></i>{" "}
                                Due: {request.dueDate}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end w-full md:w-auto pl-14 md:pl-0">
                          <button
                            onClick={() => handleReviewAndSign(request.id)}
                            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#111418] text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                          >
                            <i className="fa-solid fa-pen-nib text-[16px]"></i>
                            Review & Sign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Divider */}
              <div className="w-full h-px bg-gray-200"></div>

              {/* Saved Templates Section */}
              <section className="w-full space-y-6 p-2">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-[#137fec] text-[20px]"></i>
                  <h3 className="text-lg font-bold text-[#111418]">
                    Saved Templates
                  </h3>
                </div>

                {/* Filter Bar */}
                <div className="w-full bg-white p-2 rounded-xl border border-[#e5e7eb] shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full lg:w-96 group">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] group-focus-within:text-[#137fec] transition-colors text-[18px]"></i>
                    <input
                      type="text"
                      placeholder="Search templates by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-lg border border-[#dbe0e6] bg-gray-50 text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {/* Category Filter */}
                    <div className="relative min-w-[140px] flex-1 lg:flex-none">
                      <i className="fa-solid fa-filter absolute left-2.5 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[16px]"></i>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                        }}
                        className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] cursor-pointer text-[#111418] font-medium"
                      >
                        <option>All Categories</option>
                        <option>HR &amp; People</option>
                        <option>Sales &amp; Legal</option>
                        <option>Finance</option>
                        <option>Real Estate</option>
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[14px]"></i>
                    </div>

                    {/* Time Range Filter */}
                    <div className="relative min-w-[140px] flex-1 lg:flex-none">
                      <i className="fa-solid fa-calendar absolute left-2.5 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[16px]"></i>
                      <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        style={{
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                        }}
                        className="w-full h-10 pl-9 pr-8 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] cursor-pointer text-[#111418] font-medium"
                      >
                        <option>Any Time</option>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>Last Year</option>
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[14px]"></i>
                    </div>

                    <div className="w-px h-6 bg-gray-200 hidden lg:block mx-1"></div>

                    {/* Sort Dropdown */}
                    <div className="relative min-w-[160px] flex-1 lg:flex-none">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                        }}
                        className="w-full h-10 pl-3 pr-8 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] cursor-pointer text-[#111418] font-medium"
                      >
                        <option>Sort: Last Modified</option>
                        <option>Sort: Name (A-Z)</option>
                        <option>Sort: Date Created</option>
                      </select>
                      <i className="fa-solid fa-sort absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[16px]"></i>
                    </div>
                  </div>
                </div>

                {/* Templates Grid */}
                {templates.length === 0 ? (
                  <div className="w-full bg-white p-8 rounded-xl border border-[#e5e7eb] text-center">
                    <i className="fa-solid fa-folder text-4xl text-[#617589] mb-3"></i>
                    <p className="text-sm text-[#617589]">No templates found</p>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="group bg-white rounded-xl border border-[#e5e7eb] hover:border-[#137fec] hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all flex flex-col overflow-hidden relative"
                      >
                        {/* Template Preview */}
                        <div className="h-44 bg-gray-50 border-b border-[#e5e7eb] relative flex items-center justify-center p-6 overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
                          <div className="w-32 h-40 bg-white shadow-sm border border-gray-200 rounded flex flex-col p-3 gap-2 group-hover:scale-105 transition-transform duration-300 relative z-10">
                            <div className="h-2 w-1/3 bg-gray-200 rounded"></div>
                            <div className="h-1.5 w-full bg-gray-100 rounded"></div>
                            <div className="h-1.5 w-full bg-gray-100 rounded"></div>
                            <div className="h-1.5 w-2/3 bg-gray-100 rounded"></div>
                            <div className="mt-auto flex justify-end">
                              <div className="h-4 w-12 bg-blue-100 rounded-sm"></div>
                            </div>
                          </div>
                          <div className="absolute top-3 right-3 z-20">
                            <span
                              className={`inline-flex items-center rounded-md ${
                                getColorClasses(template.categoryColor).bg
                              } px-2 py-1 text-xs font-bold ${
                                getColorClasses(template.categoryColor).text
                              } ring-1 ${
                                getColorClasses(template.categoryColor)
                                  .ringColor
                              } uppercase tracking-wide`}
                            >
                              {template.category}
                            </span>
                          </div>
                        </div>

                        {/* Template Info */}
                        <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-[#111418] text-lg truncate pr-2 group-hover:text-[#137fec] transition-colors">
                              {template.title}
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
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-1.5 text-[#617589] hover:text-[#137fec] hover:bg-blue-50 rounded transition-colors"
                                title="Preview Template"
                              >
                                <i className="fa-solid fa-eye text-[18px]"></i>
                              </button>
                              <button
                                className="p-1.5 text-[#617589] hover:text-[#137fec] hover:bg-blue-50 rounded transition-colors"
                                title="Edit Template"
                              >
                                <i className="fa-solid fa-pen-to-square text-[18px]"></i>
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteTemplate(template.id)
                                }
                                className="p-1.5 text-[#617589] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete Template"
                              >
                                <i className="fa-solid fa-trash text-[18px]"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default DocSign;
