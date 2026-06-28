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

  // Tracking Panel States
  const [trackingDocId, setTrackingDocId] = useState(null);
  const [remindingEmail, setRemindingEmail] = useState(null);

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
        percentComplete: recipients.length > 0 ? Math.round((signedCount / recipients.length) * 100) : 0,
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

  // Requests currently sent by the user that are still pending signatures from others
  const pendingSentRequests = useMemo(() => {
    return sentRequests.filter(req => !req.isCompleted);
  }, [sentRequests]);

  // Selected document for tracking details
  const selectedTrackingDoc = useMemo(() => {
    if (!trackingDocId) return null;
    return documentsList.find(doc => doc._id === trackingDocId);
  }, [trackingDocId, documentsList]);

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

  // Handle email reminder trigger
  const handleSendReminder = async (docId, recipientEmail) => {
    setRemindingEmail(recipientEmail);
    try {
      await apiService.post(`/api/documents/${docId}/remind`, { recipientEmail });
      toast.success(`Reminder sent to ${recipientEmail}`);
    } catch (err) {
      console.error("Error sending reminder:", err);
      toast.error("Failed to send signature reminder email");
    } finally {
      setRemindingEmail(null);
    }
  };

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
        bg: "bg-blue-50 text-blue-600",
        pill: "bg-blue-50 border-blue-200 text-blue-700",
        badge: "bg-blue-500",
      },
      purple: {
        bg: "bg-purple-50 text-purple-600",
        pill: "bg-purple-50 border-purple-200 text-purple-700",
        badge: "bg-purple-500",
      },
      green: {
        bg: "bg-green-50 text-green-600",
        pill: "bg-green-50 border-green-200 text-green-700",
        badge: "bg-green-500",
      },
      orange: {
        bg: "bg-orange-50 text-orange-600",
        pill: "bg-orange-50 border-orange-200 text-orange-700",
        badge: "bg-orange-500",
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
    <div className="w-full min-h-screen bg-[#f8fafc] px-4 flex flex-col font-sans">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "DocSign", icon: "fa-pen-fancy" },
        ]}
      />

      {/* Page Header */}
      <header className="w-full bg-white border border-slate-100 py-5 px-6 rounded-2xl shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i className="fa-solid fa-file-signature text-[#137fec]"></i>
            Document Signing Portal
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Send, track, and manage your electronic signature workflows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowCreateTemplate(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-55 text-slate-750 border border-slate-200 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all active:scale-98"
          >
            <i className="fa-solid fa-plus-circle text-[16px] text-slate-500"></i>
            New Template
          </button>
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-[#137fec] hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 active:scale-98"
          >
            <i className="fa-solid fa-paper-plane text-[15px]"></i>
            Send Signature
          </button>
        </div>
      </header>

      {/* Stats Dashboard Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Action Required */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
            <div className="size-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl font-bold shrink-0">
              <i className="fa-solid fa-signature"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Required</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{inboxRequests.length}</h3>
            </div>
            {inboxRequests.length > 0 && (
              <span className="absolute top-4 right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
            )}
          </div>

          {/* Card 2: Total Sent */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <div className="size-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold shrink-0">
              <i className="fa-solid fa-paper-plane"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Requests Sent</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{sentRequests.length}</h3>
            </div>
          </div>

          {/* Card 3: Awaiting Others */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
            <div className="size-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold shrink-0">
              <i className="fa-solid fa-clock"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Others</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{pendingSentRequests.length}</h3>
            </div>
          </div>

          {/* Card 4: Completed */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500"></div>
            <div className="size-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl font-bold shrink-0">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Docs</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{completedRequests.length}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="w-full flex-1 flex flex-col lg:flex-row gap-6 relative">
        <div className="flex-1 space-y-6">
          {loading ? (
            <ModuleLoader moduleName="Document Signing" />
          ) : error ? (
            <div className="flex flex-col items-center justify-center bg-white border border-slate-100 rounded-2xl py-20 shadow-sm">
              <i className="fa-solid fa-exclamation-triangle text-5xl text-red-500 mb-4 animate-bounce"></i>
              <p className="text-sm font-semibold text-slate-600 mb-4">{error}</p>
              <button
                onClick={fetchDocuments}
                className="px-5 py-2.5 bg-[#137fec] text-white rounded-xl hover:bg-blue-600 transition-all font-semibold active:scale-95"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Tabs Section */}
              <section className="w-full space-y-4">
                {/* Tabs Selector Bar */}
                <div className="bg-white p-1 rounded-xl border border-slate-200/60 shadow-sm flex max-w-md">
                  <button
                    onClick={() => setActiveTab("inbox")}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      activeTab === "inbox"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <i className="fa-solid fa-inbox text-[13px]"></i>
                    Action Required
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activeTab === "inbox" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {inboxRequests.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("sent")}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      activeTab === "sent"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <i className="fa-solid fa-paper-plane text-[13px]"></i>
                    Sent Tracker
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activeTab === "sent" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {sentRequests.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("completed")}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                      activeTab === "completed"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <i className="fa-solid fa-check-double text-[13px]"></i>
                    Completed
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activeTab === "completed" ? "bg-green-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {completedRequests.length}
                    </span>
                  </button>
                </div>

                {/* Inbox Tab Content */}
                {activeTab === "inbox" && (
                  <div className="space-y-3">
                    {inboxRequests.length === 0 ? (
                      <div className="w-full bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <i className="fa-solid fa-inbox text-5xl text-slate-300 mb-3"></i>
                        <p className="text-sm font-semibold text-slate-500">
                          No pending actions required from you.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {inboxRequests.map((request) => (
                          <div
                            key={request.id}
                            className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all duration-200 ${
                              request.urgent ? "border-l-4 border-l-orange-500" : ""
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="size-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold shrink-0">
                                {request.initials}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors text-base">
                                  {request.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <i className="fa-solid fa-user"></i> Sent by {request.sender}
                                  </span>
                                  <span>•</span>
                                  <span className={request.urgent ? "text-orange-600 font-bold" : ""}>
                                    <i className="fa-solid fa-calendar-days mr-1"></i> Due: {request.dueDate}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end w-full md:w-auto">
                              <button
                                onClick={() => handleReviewAndSign(request.id)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm active:scale-98"
                              >
                                <i className="fa-solid fa-pen-nib"></i>
                                Review & Sign
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sent Requests Tracker Tab Content */}
                {activeTab === "sent" && (
                  <div className="space-y-3">
                    {sentRequests.length === 0 ? (
                      <div className="w-full bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <i className="fa-solid fa-paper-plane text-5xl text-slate-300 mb-3"></i>
                        <p className="text-sm font-semibold text-slate-500">
                          No signature requests sent yet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {sentRequests.map((request) => (
                          <div
                            key={request.id}
                            className={`bg-white p-5 rounded-2xl border transition-all duration-200 shadow-sm flex flex-col gap-4 group hover:shadow-md ${
                              trackingDocId === request.id ? "border-[#137fec] ring-2 ring-blue-500/10" : "border-slate-100"
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold shrink-0">
                                  {request.initials}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors text-base">
                                    {request.title}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                      <i className="fa-solid fa-calendar"></i> Sent: {formatDate(request.document.createdAt)}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1.5">
                                      <i className="fa-solid fa-calendar-days"></i> Due: {request.dueDate}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end md:self-center">
                                <button
                                  onClick={() => handleReviewAndSign(request.id)}
                                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold text-xs transition-colors active:scale-98"
                                >
                                  <i className="fa-solid fa-eye"></i> View PDF
                                </button>
                                <button
                                  onClick={() => setTrackingDocId(trackingDocId === request.id ? null : request.id)}
                                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-colors shadow-md shadow-blue-500/15 active:scale-98"
                                >
                                  <i className="fa-solid fa-location-crosshairs"></i> Track Progress
                                </button>
                              </div>
                            </div>

                            {/* visual progress bar indicator */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-50">
                              <div className="sm:col-span-4 flex items-center gap-2">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  request.isCompleted
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700 animate-pulse"
                                }`}>
                                  {request.isCompleted ? "Completed" : "Awaiting Signatures"}
                                </span>
                                <span className="text-xs font-bold text-slate-400">•</span>
                                <span className="text-xs font-bold text-slate-500">
                                  {request.signedProgress} signed
                                </span>
                              </div>
                              <div className="sm:col-span-8 flex items-center gap-3">
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    style={{ width: `${request.percentComplete}%` }}
                                    className={`h-full transition-all duration-300 ${
                                      request.isCompleted ? "bg-green-500" : "bg-[#137fec]"
                                    }`}
                                  ></div>
                                </div>
                                <span className="text-xs font-black text-slate-700 w-10 text-right">
                                  {request.percentComplete}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Completed Tab Content */}
                {activeTab === "completed" && (
                  <div className="space-y-3">
                    {completedRequests.length === 0 ? (
                      <div className="w-full bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <i className="fa-solid fa-circle-check text-5xl text-slate-300 mb-3"></i>
                        <p className="text-sm font-semibold text-slate-500">
                          No completed agreements yet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {completedRequests.map((request) => (
                          <div
                            key={request.id}
                            className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center gap-4">
                              <div className="size-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg font-bold shrink-0">
                                {request.initials}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-800 group-hover:text-blue-600 transition-colors text-base">
                                  {request.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <i className="fa-solid fa-user"></i> Sent by {request.sender}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-green-600 font-semibold">
                                    <i className="fa-solid fa-circle-check"></i> Completed
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end w-full md:w-auto">
                              <button
                                onClick={() => handleReviewAndSign(request.id)}
                                className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-5 py-2.5 rounded-xl font-bold text-xs transition-colors shadow-sm active:scale-98"
                              >
                                <i className="fa-solid fa-file-contract"></i>
                                View Document
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Divider */}
              <div className="w-full h-px bg-slate-200/70 my-8"></div>

              {/* Saved Templates Section */}
              <section className="w-full space-y-5 pb-10">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="fa-solid fa-folder-open text-lg"></i>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800">
                    Saved Templates
                  </h3>
                </div>

                {/* Filter and Control Bar */}
                <div className="w-full bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col xl:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full xl:w-96 group">
                    <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#137fec] transition-colors text-[16px]"></i>
                    <input
                      type="text"
                      placeholder="Search templates by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-[#137fec]/25 focus:border-[#137fec] outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Category Filter */}
                    <div className="relative min-w-[150px] flex-1 xl:flex-none">
                      <i className="fa-solid fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[14px]"></i>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{ appearance: "none" }}
                        className="w-full h-11 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#137fec]/25 cursor-pointer text-slate-700 font-bold"
                      >
                        <option>All Categories</option>
                        <option>HR &amp; People</option>
                        <option>Sales &amp; Legal</option>
                        <option>Finance</option>
                        <option>Real Estate</option>
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[12px]"></i>
                    </div>

                    {/* Time Range Filter */}
                    <div className="relative min-w-[150px] flex-1 xl:flex-none">
                      <i className="fa-solid fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[14px]"></i>
                      <select
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                        style={{ appearance: "none" }}
                        className="w-full h-11 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#137fec]/25 cursor-pointer text-slate-700 font-bold"
                      >
                        <option>Any Time</option>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                        <option>Last Year</option>
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[12px]"></i>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden xl:block mx-1"></div>

                    {/* Sort Dropdown */}
                    <div className="relative min-w-[160px] flex-1 xl:flex-none">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{ appearance: "none" }}
                        className="w-full h-11 pl-4 pr-9 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-[#137fec]/25 cursor-pointer text-slate-700 font-bold"
                      >
                        <option>Sort: Last Modified</option>
                        <option>Sort: Name (A-Z)</option>
                        <option>Sort: Date Created</option>
                      </select>
                      <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[12px]"></i>
                    </div>
                  </div>
                </div>

                {/* Templates Grid */}
                {filteredTemplates.length === 0 ? (
                  <div className="w-full bg-white p-12 rounded-2xl border border-slate-100 text-center shadow-sm">
                    <i className="fa-solid fa-folder text-5xl text-slate-300 mb-3"></i>
                    <p className="text-sm font-semibold text-slate-500">No templates match your filters.</p>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-500/50 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 flex flex-col overflow-hidden relative"
                      >
                        {/* Template Cover */}
                        <div className="h-40 bg-slate-50 border-b border-slate-100 relative flex items-center justify-center p-6 overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:14px_14px] opacity-60"></div>
                          <div className="w-24 h-32 bg-white shadow-md border border-slate-100 rounded-lg flex flex-col p-3 gap-2 group-hover:scale-105 transition-transform duration-300 relative z-10">
                            <div className="h-1.5 w-1/3 bg-slate-200 rounded"></div>
                            <div className="h-1 w-full bg-slate-100 rounded"></div>
                            <div className="h-1 w-full bg-slate-100 rounded"></div>
                            <div className="h-1 w-2/3 bg-slate-100 rounded"></div>
                            <div className="mt-auto flex justify-end">
                              <div className="h-3 w-8 bg-blue-50 rounded-sm border border-blue-100"></div>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4 z-20">
                            <span
                              className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider uppercase ${
                                getColorClasses(template.categoryColor).pill
                              } border shadow-sm`}
                            >
                              {template.category}
                            </span>
                          </div>
                        </div>

                        {/* Template Details */}
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-extrabold text-slate-800 text-base truncate pr-2 group-hover:text-blue-600 transition-colors mb-1.5">
                            {template.title}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                            {template.description}
                          </p>

                          {/* Template Footer Actions */}
                          <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-black text-slate-300 tracking-wider">
                                Last Modified
                              </span>
                              <span className="text-xs font-bold text-slate-600 mt-0.5">
                                {template.lastModified}
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Preview Template"
                              >
                                <i className="fa-solid fa-eye text-[16px]"></i>
                              </button>
                              <button
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Template"
                              >
                                <i className="fa-solid fa-pen-to-square text-[16px]"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Template"
                              >
                                <i className="fa-solid fa-trash text-[16px]"></i>
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

        {/* Dynamic Signature Progress Tracking Drawer (Slide-Over Panel) */}
        {selectedTrackingDoc && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
              onClick={() => setTrackingDocId(null)}
            ></div>

            {/* Sidebar drawer */}
            <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white z-50 shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-in-out border-l border-slate-100 rounded-l-3xl overflow-hidden">
              {/* Drawer Header */}
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative">
                <div>
                  <h3 className="text-lg font-extrabold flex items-center gap-2">
                    <i className="fa-solid fa-location-crosshairs text-blue-400"></i>
                    Signature Progress Tracker
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 truncate max-w-[300px]">
                    {selectedTrackingDoc.name}
                  </p>
                </div>
                <button
                  onClick={() => setTrackingDocId(null)}
                  className="size-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                >
                  <i className="fa-solid fa-times text-sm"></i>
                </button>
              </div>

              {/* Drawer Body content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Visual completion ring/summary */}
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Completion Status</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedTrackingDoc.recipients.filter(r => r.status === "signed").length} of{" "}
                      {selectedTrackingDoc.recipients.length} recipients signed
                    </p>
                  </div>
                  <div className="relative size-16 flex items-center justify-center font-black text-slate-800 text-base">
                    {/* SVG circular progress indicator */}
                    <svg className="absolute inset-0 size-full -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#e2e8f0"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="#137fec"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={175.9}
                        strokeDashoffset={
                          175.9 -
                          (175.9 *
                            (selectedTrackingDoc.recipients.filter(r => r.status === "signed").length /
                              selectedTrackingDoc.recipients.length))
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="z-10">
                      {Math.round(
                        (selectedTrackingDoc.recipients.filter(r => r.status === "signed").length /
                          selectedTrackingDoc.recipients.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>

                {/* Signers workflow track list */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recipients Status</h4>
                  <div className="space-y-3">
                    {selectedTrackingDoc.recipients.map((rec, index) => {
                      const isSigned = rec.status === "signed";
                      return (
                        <div
                          key={rec._id || rec.id || index}
                          className="flex items-start justify-between p-3.5 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-colors gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
                              isSigned ? "bg-green-50 text-green-600" : "bg-slate-50 text-slate-400"
                            }`}>
                              {isSigned ? (
                                <i className="fa-solid fa-circle-check"></i>
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{rec.name}</p>
                              <p className="text-[11px] font-semibold text-slate-400 truncate">{rec.email}</p>
                              {isSigned && rec.signedAt && (
                                <p className="text-[10px] text-green-600 font-bold mt-1">
                                  Signed {formatDate(rec.signedAt)}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isSigned ? (
                              <span className="text-[10px] font-black text-green-600 uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                Signed
                              </span>
                            ) : (
                              <button
                                onClick={() => handleSendReminder(selectedTrackingDoc._id, rec.email)}
                                disabled={remindingEmail === rec.email}
                                className="flex items-center justify-center gap-1 bg-[#137fec] hover:bg-blue-600 disabled:bg-blue-300 text-white px-2.5 py-1 rounded-lg font-bold text-[10px] shadow-sm transition-colors active:scale-95"
                              >
                                {remindingEmail === rec.email ? (
                                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                                ) : (
                                  <>
                                    <i className="fa-solid fa-paper-plane text-[9px]"></i>
                                    Remind
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit trail log */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Document Timeline</h4>
                  <div className="border-l border-slate-200 pl-4 ml-2 space-y-4 text-xs font-semibold text-slate-500">
                    <div className="relative">
                      <div className="absolute size-2 bg-blue-500 rounded-full -left-[21px] top-1.5 border border-white"></div>
                      <p className="text-slate-700 font-bold">Document Created</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Uploaded by {selectedTrackingDoc.uploadedByName || "Sender"} on{" "}
                        {new Date(selectedTrackingDoc.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {selectedTrackingDoc.recipients.map((rec, idx) => {
                      if (rec.status !== "signed") return null;
                      return (
                        <div key={idx} className="relative">
                          <div className="absolute size-2 bg-green-500 rounded-full -left-[21px] top-1.5 border border-white"></div>
                          <p className="text-slate-700 font-bold">Signed by {rec.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Completed signature on {rec.signedAt ? new Date(rec.signedAt).toLocaleString() : "Unknown date"}
                          </p>
                        </div>
                      );
                    })}

                    {selectedTrackingDoc.status === "Completed" && (
                      <div className="relative">
                        <div className="absolute size-2 bg-green-600 rounded-full -left-[21px] top-1.5 border border-white"></div>
                        <p className="text-green-700 font-bold flex items-center gap-1">
                          <i className="fa-solid fa-circle-check"></i>
                          Fully Completed
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          All parties have signed the document successfully.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DocSign;
