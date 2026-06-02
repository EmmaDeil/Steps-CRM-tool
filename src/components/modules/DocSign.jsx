import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/useAuth";
import DocSignRequest from "./DocSignRequest";
import DocSignTemplateCreate from "./DocSignTemplateCreate";
import ModuleLoader from "../common/ModuleLoader";

const DocSign = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedTimeRange, setSelectedTimeRange] = useState("Any Time");
  const [sortBy, setSortBy] = useState("Sort: Last Modified");

  // API Data States
  const [activeTab, setActiveTab] = useState("inbox"); // 'inbox', 'sent', 'completed'
  const [documentsList, setDocumentsList] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const actorEmail = useMemo(() => String(user?.email || "").trim().toLowerCase(), [user]);
  const actorId = useMemo(() => String(user?.userId || user?._id || "").trim(), [user]);

  const inboxRequests = useMemo(() => {
    return documentsList.filter((doc) => {
      if (doc.status === "Completed") return false;
      const isRecipientPending = (doc.recipients || []).some(
        (rec) =>
          (String(rec.email || "").trim().toLowerCase() === actorEmail ||
            String(rec.id || "").trim() === actorId) &&
          rec.status !== "signed"
      );
      return isRecipientPending;
    }).map((doc, index) => ({
      id: doc._id,
      title: doc.name,
      sender: doc.uploadedByName || "Unknown",
      initials: getInitials(doc.uploadedByName || "Unknown"),
      color: getColorByIndex(index),
      dueDate: formatDueDate(doc.dueDate),
      urgent: isUrgent(doc.dueDate),
      document: doc,
    }));
  }, [documentsList, actorEmail, actorId]);

  const sentRequests = useMemo(() => {
    return documentsList.filter((doc) => {
      const uploader = String(doc.uploadedBy || "").trim().toLowerCase();
      return uploader === actorEmail || uploader === actorId.toLowerCase();
    }).map((doc, index) => {
      const recipients = doc.recipients || [];
      const signedCount = recipients.filter(r => r.status === "signed").length;
      return {
        id: doc._id,
        title: doc.name,
        sender: doc.uploadedByName || "Unknown",
        initials: getInitials(doc.uploadedByName || "Unknown"),
        color: getColorByIndex(index),
        dueDate: formatDueDate(doc.dueDate),
        urgent: isUrgent(doc.dueDate),
        signedProgress: `${signedCount}/${recipients.length}`,
        isCompleted: doc.status === "Completed",
        recipientsList: recipients,
        document: doc,
      };
    });
  }, [documentsList, actorEmail, actorId]);

  const completedRequests = useMemo(() => {
    return documentsList.filter((doc) => {
      if (doc.status !== "Completed") return false;
      const uploader = String(doc.uploadedBy || "").trim().toLowerCase();
      const isSender = uploader === actorEmail || uploader === actorId.toLowerCase();
      const isRecipient = (doc.recipients || []).some(
        (rec) =>
          String(rec.email || "").trim().toLowerCase() === actorEmail ||
          String(rec.id || "").trim() === actorId
      );
      return isSender || isRecipient;
    }).map((doc, index) => ({
      id: doc._id,
      title: doc.name,
      sender: doc.uploadedByName || "Unknown",
      initials: getInitials(doc.uploadedByName || "Unknown"),
      color: getColorByIndex(index),
      dueDate: formatDueDate(doc.dueDate),
      urgent: isUrgent(doc.dueDate),
      document: doc,
    }));
  }, [documentsList, actorEmail, actorId]);

  // Map category values (like 'hr', 'legal') to readable layout labels
  const displayCategory = useCallback((cat) => {
    const mapping = {
      hr: "HR & People",
      legal: "Legal & Compliance",
      sales: "Sales Contracts",
      finance: "Finance",
      realestate: "Real Estate"
    };
    return mapping[String(cat).toLowerCase()] || cat || "General";
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = user?.email || user?.userId;
      if (!userId) {
        setError("User not authenticated");
        return;
      }

      // Fetch documents and templates in parallel
      const [docsResponse, templatesResponse] = await Promise.all([
        apiService.get("/api/documents", { params: { userId } }),
        apiService.get("/api/documents/templates")
      ]);

      if (Array.isArray(docsResponse)) {
        setDocumentsList(docsResponse);
      }

      if (Array.isArray(templatesResponse)) {
        const transformedTemplates = templatesResponse.map((tmpl) => ({
          id: tmpl._id,
          title: tmpl.name,
          category: displayCategory(tmpl.category || "General"),
          categoryColor: getCategoryColor(tmpl.category || "General"),
          description: tmpl.description || "Document template",
          lastModified: formatDate(tmpl.updatedAt),
          document: tmpl,
        }));
        setTemplates(transformedTemplates);
      }
    } catch (err) {
      console.error("Error fetching documents and templates:", err);
      setError("Failed to load documents");
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [user, displayCategory]);

  // Fetch documents and templates on mount
  useEffect(() => {
    if (user?.userId || user?.email) {
      fetchDocuments();
    }
  }, [user, fetchDocuments]);

  const filteredTemplates = useMemo(() => {
    let result = [...templates];

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tmpl) =>
          tmpl.title.toLowerCase().includes(q) ||
          tmpl.description.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (selectedCategory !== "All Categories") {
      result = result.filter((tmpl) => {
        const cat = String(tmpl.category).toLowerCase();
        if (selectedCategory === "HR & People") return cat === "hr" || cat.includes("hr") || cat.includes("people");
        if (selectedCategory === "Sales & Legal") return cat === "sales" || cat === "legal" || cat.includes("sales") || cat.includes("legal") || cat.includes("compliance") || cat.includes("contract");
        if (selectedCategory === "Finance") return cat === "finance" || cat.includes("finance");
        if (selectedCategory === "Real Estate") return cat === "realestate" || cat.includes("real");
        return false;
      });
    }

    // Time Range Filter
    if (selectedTimeRange !== "Any Time") {
      const now = new Date();
      result = result.filter((tmpl) => {
        const date = new Date(tmpl.document?.updatedAt || tmpl.document?.createdAt || now);
        const diffTime = now - date;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        if (selectedTimeRange === "Last 7 Days") return diffDays <= 7;
        if (selectedTimeRange === "Last 30 Days") return diffDays <= 30;
        if (selectedTimeRange === "Last Year") return diffDays <= 365;
        return true;
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "Sort: Name (A-Z)") {
        return a.title.localeCompare(b.title);
      }
      
      const dateA = new Date(a.document?.updatedAt || a.document?.createdAt || 0);
      const dateB = new Date(b.document?.updatedAt || b.document?.createdAt || 0);
      
      if (sortBy === "Sort: Date Created") {
        const createA = new Date(a.document?.createdAt || 0);
        const createB = new Date(b.document?.createdAt || 0);
        return createB - createA;
      }
      
      return dateB - dateA;
    });

    return result;
  }, [templates, searchQuery, selectedCategory, selectedTimeRange, sortBy]);

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
      date.getDate(),
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

  const handleReviewAndSign = (requestId) => {
    navigate(`/docsign/sign/${requestId}`);
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
    return (
      <DocSignRequest
        onBack={() => {
          setShowRequestForm(false);
          fetchDocuments();
        }}
        onSuccess={() => {
          setShowRequestForm(false);
          setActiveTab("sent");
          fetchDocuments();
        }}
      />
    );
  }

  // Show create template form if user clicks "New Template"
  if (showCreateTemplate) {
    return (
      <DocSignTemplateCreate
        onBack={() => {
          setShowCreateTemplate(false);
          fetchDocuments();
        }}
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 px-1 flex flex-col">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "DocSign", icon: "fa-pen-fancy" },
        ]}
      />

      {/* Page Header */}
      <header className="w-full bg-white border-b border-[#e5e7eb] py-3 shadow-sm">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 px-2">
          <div>
            <h2 className="text-2xl font-bold text-[#111418]"></h2>
            <p className="text-sm text-[#617589] mt-1">
              {/* Manage your pending actions and template library. */}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateTemplate(true)}
              className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-[#111418] border border-[#dbe0e6] px-2 py-2.5 rounded-lg font-semibold shadow-sm transition-all active:scale-95"
            >
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
      <main className="w-full flex-1 overflow-y-auto py-0 scroll-smooth">
        <div className="w-full space-y-10 px-3 py-6">
          {loading ? (
            <ModuleLoader moduleName="Document Signing" />
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
              {/* Document Tabs Section */}
              <section className="w-full space-y-4">
                {/* Tabs Selector */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab("inbox")}
                      className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                        activeTab === "inbox"
                          ? "border-[#137fec] text-[#137fec]"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <i className="fa-solid fa-inbox text-[16px]"></i>
                      Action Required
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        activeTab === "inbox" ? "bg-blue-100 text-[#137fec]" : "bg-gray-100 text-gray-600"
                      }`}>
                        {inboxRequests.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("sent")}
                      className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                        activeTab === "sent"
                          ? "border-[#137fec] text-[#137fec]"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <i className="fa-solid fa-paper-plane text-[16px]"></i>
                      Sent Requests
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        activeTab === "sent" ? "bg-blue-100 text-[#137fec]" : "bg-gray-100 text-gray-600"
                      }`}>
                        {sentRequests.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveTab("completed")}
                      className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all ${
                        activeTab === "completed"
                          ? "border-[#137fec] text-[#137fec]"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <i className="fa-solid fa-check-double text-[16px]"></i>
                      Completed
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        activeTab === "completed" ? "bg-blue-100 text-[#137fec]" : "bg-gray-100 text-gray-600"
                      }`}>
                        {completedRequests.length}
                      </span>
                    </button>
                  </nav>
                </div>

                {activeTab === "inbox" && (
                  <>
                    {inboxRequests.length === 0 ? (
                      <div className="w-full bg-white p-8 rounded-xl border border-[#e5e7eb] text-center">
                        <i className="fa-solid fa-inbox text-4xl text-[#617589] mb-3"></i>
                        <p className="text-sm text-[#617589]">
                          No pending actions required from you
                        </p>
                      </div>
                    ) : (
                      <div className="w-full grid grid-cols-1 gap-4">
                        {inboxRequests.map((request) => (
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
                  </>
                )}

                {activeTab === "sent" && (
                  <>
                    {sentRequests.length === 0 ? (
                      <div className="w-full bg-white p-8 rounded-xl border border-[#e5e7eb] text-center">
                        <i className="fa-solid fa-paper-plane text-4xl text-[#617589] mb-3"></i>
                        <p className="text-sm text-[#617589]">
                          No signature requests sent by you
                        </p>
                      </div>
                    ) : (
                      <div className="w-full grid grid-cols-1 gap-4">
                        {sentRequests.map((request) => (
                          <div
                            key={request.id}
                            className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all"
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
                                    <i className="fa-solid fa-circle-info text-[14px]"></i>{" "}
                                    Status: {request.isCompleted ? "Completed" : "Pending"}
                                  </span>
                                  <span className="hidden md:inline text-gray-300">
                                    •
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="fa-solid fa-users text-[14px]"></i>{" "}
                                    Signed: {request.signedProgress}
                                  </span>
                                  <span className="hidden md:inline text-gray-300">
                                    •
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <i className="fa-solid fa-calendar text-[14px]"></i>{" "}
                                    Due: {request.dueDate}
                                  </span>
                                </div>
                                {/* Recipients status list chips */}
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {request.recipientsList.map((rec) => (
                                    <span
                                      key={rec.id || rec.email}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                        rec.status === "signed"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : "bg-gray-50 text-gray-600 border-gray-200"
                                      }`}
                                    >
                                      <i className={`fa-solid ${rec.status === "signed" ? "fa-circle-check text-green-500" : "fa-circle-notch fa-spin text-gray-400"}`}></i>
                                      {rec.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end w-full md:w-auto pl-14 md:pl-0">
                              <button
                                onClick={() => handleReviewAndSign(request.id)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#111418] text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                              >
                                <i className="fa-solid fa-eye text-[16px]"></i>
                                View Status
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "completed" && (
                  <>
                    {completedRequests.length === 0 ? (
                      <div className="w-full bg-white p-8 rounded-xl border border-[#e5e7eb] text-center">
                        <i className="fa-solid fa-circle-check text-4xl text-[#617589] mb-3"></i>
                        <p className="text-sm text-[#617589]">
                          No completed signature requests
                        </p>
                      </div>
                    ) : (
                      <div className="w-full grid grid-cols-1 gap-4">
                        {completedRequests.map((request) => (
                          <div
                            key={request.id}
                            className="bg-white p-4 rounded-xl border border-[#e5e7eb] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all"
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
                                  <span className="flex items-center gap-1">
                                    <i className="fa-solid fa-circle-check text-green-600"></i>{" "}
                                    Completed
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end w-full md:w-auto pl-14 md:pl-0">
                              <button
                                onClick={() => handleReviewAndSign(request.id)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#111418] text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                              >
                                <i className="fa-solid fa-file-contract text-[16px]"></i>
                                View Document
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Divider */}
              <div className="w-full h-px bg-gray-200"></div>

              {/* Saved Templates Section */}
              <section className="w-full space-y-6">
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
                    </div>
                  </div>
                </div>

                {/* Templates Grid */}
                {filteredTemplates.length === 0 ? (
                  <div className="w-full bg-white p-8 rounded-xl border border-[#e5e7eb] text-center">
                    <i className="fa-solid fa-folder text-4xl text-[#617589] mb-3"></i>
                    <p className="text-sm text-[#617589]">No templates found</p>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
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
