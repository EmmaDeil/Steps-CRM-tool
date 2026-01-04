import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/useAuth";

const DocSignRequest = ({ onBack }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // File upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [fileName, setFileName] = useState("No document selected");
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(5); // Total pages in PDF (can be updated after PDF loads)
  const [zoom, setZoom] = useState(100);

  // Form state
  const [recipients, setRecipients] = useState([
    { id: 1, name: "", email: "", order: 1, color: "blue" },
  ]);
  const [signingMode, setSigningMode] = useState("sequential");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reminderFrequency, setReminderFrequency] = useState("no");
  const [expirationDate, setExpirationDate] = useState("");
  const [customBranding, setCustomBranding] = useState(false);
  const [sending, setSending] = useState(false);

  // Drag and drop state for fields
  const [placedFields, setPlacedFields] = useState([]);
  const [draggedField, setDraggedField] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [draggedPlacedFieldId, setDraggedPlacedFieldId] = useState(null);

  // Search for employee by name with debouncing
  const searchEmployee = useCallback(async (recipientId, searchName) => {
    if (!searchName || searchName.length < 2) {
      return;
    }

    try {
      const response = await apiService.hr.getEmployees({ search: searchName });
      const employees = response.data || [];

      // Find exact or close match
      const matchedEmployee = employees.find((emp) =>
        emp.name?.toLowerCase().includes(searchName.toLowerCase())
      );

      if (matchedEmployee && matchedEmployee.email) {
        // Auto-populate email
        setRecipients((recipients) =>
          recipients.map((r) =>
            r.id === recipientId ? { ...r, email: matchedEmployee.email } : r
          )
        );
      }
    } catch (error) {
      console.error("Error searching employees:", error);
    }
  }, []);

  // Debounce employee search
  useEffect(() => {
    const timers = {};

    recipients.forEach((recipient) => {
      if (recipient.name && recipient.name.length >= 2) {
        timers[recipient.id] = setTimeout(() => {
          searchEmployee(recipient.id, recipient.name);
        }, 500); // 500ms debounce
      }
    });

    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, [recipients, searchEmployee]);

  const addRecipient = () => {
    const colors = ["blue", "purple", "green", "orange", "teal"];
    const newId = recipients.length + 1;
    setRecipients([
      ...recipients,
      {
        id: newId,
        name: "",
        email: "",
        order: newId,
        color: colors[newId % colors.length],
      },
    ]);
  };

  const removeRecipient = (id) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const updateRecipient = (id, field, value) => {
    setRecipients(
      recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const getOrderIcon = (order) => {
    const icons = ["one", "two", "three", "four", "five", "six"];
    return icons[order - 1] || "circle";
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        border: "border-[#137fec]",
        text: "text-[#137fec]",
        bg: "bg-blue-50",
        ring: "ring-[#137fec]/50",
      },
      purple: {
        border: "border-purple-500",
        text: "text-purple-500",
        bg: "bg-purple-50",
        ring: "ring-purple-500/50",
      },
      green: {
        border: "border-green-500",
        text: "text-green-500",
        bg: "bg-green-50",
        ring: "ring-green-500/50",
      },
      orange: {
        border: "border-orange-500",
        text: "text-orange-500",
        bg: "bg-orange-50",
        ring: "ring-orange-500/50",
      },
      teal: {
        border: "border-teal-500",
        text: "text-teal-500",
        bg: "bg-teal-50",
        ring: "ring-teal-500/50",
      },
    };
    return colors[color] || colors.blue;
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Create a temporary URL for preview
      const tempURL = URL.createObjectURL(file);
      setFileURL(tempURL);
      setUploadedFile(file);
      setFileName(file.name);
      setSubject(subject || `Please sign: ${file.name}`);

      toast.success("Document loaded successfully");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  // Handle sending signature request
  const handleSendRequest = async () => {
    // Validation
    if (!uploadedFile) {
      toast.error("Please upload a document first");
      return;
    }

    const validRecipients = recipients.filter((r) => r.email && r.name);
    if (validRecipients.length === 0) {
      toast.error("Please add at least one recipient with name and email");
      return;
    }

    if (!subject.trim()) {
      toast.error("Please enter a subject");
      return;
    }

    setSending(true);
    try {
      // Upload file first if not already uploaded
      const formData = new FormData();
      formData.append("file", uploadedFile);

      // Here you would upload to your server
      // For now, we'll use a placeholder URL
      const uploadedFileURL = `/uploads/documents/${Date.now()}_${
        uploadedFile.name
      }`;

      // Create document with recipients and placed fields
      const documentData = {
        name: fileName,
        fileURL: uploadedFileURL,
        uploadedBy: user?.email || user?.userId,
        uploadedByName: user?.name || user?.fullName || "Unknown",
        status: "Pending",
        recipients: validRecipients.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          role: "signer",
          status: "pending",
        })),
        signatures: [],
        fields: placedFields.map((field) => ({
          id: field.id,
          type: field.type,
          label: field.label,
          page: field.page,
          position: field.position,
          size: field.size,
          required: field.required,
          assignedTo: field.assignedTo,
        })),
        dueDate: expirationDate || null,
        metadata: {
          subject,
          message,
          signingMode,
          reminderFrequency,
          customBranding,
        },
      };

      await apiService.documents.create(documentData);

      toast.success("Signature request sent successfully!");
      if (onBack) {
        onBack();
      } else {
        navigate("/modules/docsign");
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send signature request");
    } finally {
      setSending(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  // Page navigation
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleFirstPage = () => setCurrentPage(1);

  // Drag and drop handlers
  const handleDragStart = (e, fieldType) => {
    setDraggedField(fieldType);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedField) return;

    const dropZone = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - dropZone.left;
    const y = e.clientY - dropZone.top;

    // Calculate position as percentage
    const xPercent = (x / dropZone.width) * 100;
    const yPercent = (y / dropZone.height) * 100;

    // Get first recipient or allow selection
    const assignedRecipient = recipients[0] || {
      id: 1,
      name: "Signer 1",
      color: "blue",
    };

    const newField = {
      id: `field-${Date.now()}`,
      type: draggedField.type,
      label: draggedField.label,
      icon: draggedField.icon,
      page: currentPage,
      position: { x: xPercent, y: yPercent },
      size: draggedField.defaultSize || { width: 180, height: 50 },
      required:
        draggedField.type === "signature" || draggedField.type === "initials",
      assignedTo: assignedRecipient.id,
      assignedName:
        assignedRecipient.name || `Signer ${assignedRecipient.order}`,
      color: assignedRecipient.color,
    };

    setPlacedFields([...placedFields, newField]);
    setDraggedField(null);
    toast.success(`${draggedField.label} field added`);
  };

  const handleFieldClick = (fieldId) => {
    setSelectedFieldId(fieldId === selectedFieldId ? null : fieldId);
  };

  const handleFieldDelete = (fieldId) => {
    setPlacedFields(placedFields.filter((f) => f.id !== fieldId));
    setSelectedFieldId(null);
    toast.success("Field removed");
  };

  const handleFieldAssignment = (fieldId, recipientId) => {
    const recipient = recipients.find((r) => r.id === recipientId);
    if (!recipient) return;

    setPlacedFields(
      placedFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              assignedTo: recipientId,
              assignedName: recipient.name || `Signer ${recipient.order}`,
              color: recipient.color,
            }
          : field
      )
    );
    toast.success("Field reassigned");
  };

  const handleFieldRequiredToggle = (fieldId) => {
    setPlacedFields(
      placedFields.map((field) =>
        field.id === fieldId ? { ...field, required: !field.required } : field
      )
    );
  };

  // Handle repositioning of placed fields
  const handlePlacedFieldDragStart = (e, fieldId) => {
    e.stopPropagation();
    setDraggedPlacedFieldId(fieldId);
    setSelectedFieldId(fieldId);
  };

  const handlePlacedFieldDragEnd = () => {
    setDraggedPlacedFieldId(null);
  };

  const handleRepositionDrop = (e) => {
    e.preventDefault();
    if (!draggedPlacedFieldId) return;

    const dropZone = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - dropZone.left;
    const y = e.clientY - dropZone.top;

    const xPercent = (x / dropZone.width) * 100;
    const yPercent = (y / dropZone.height) * 100;

    setPlacedFields(
      placedFields.map((field) =>
        field.id === draggedPlacedFieldId
          ? {
              ...field,
              position: { x: xPercent, y: yPercent },
              page: currentPage,
            }
          : field
      )
    );

    setDraggedPlacedFieldId(null);
  };

  return (
    <div className="w-full p-3 min-h-screen bg-white flex flex-col">
      <Navbar />
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          {
            label: "DocSign",
            href: "/modules/docsign",
            icon: "fa-pen-fancy",
          },
          { label: "Send Request", icon: "fa-paper-plane" },
        ]}
      />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3 shadow-sm mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/modules/docsign-dashboard")}
            className="flex items-center gap-2 text-[#617589] hover:text-[#111418] transition-colors group"
          >
            <div className="flex items-center justify-center size-8 rounded-full bg-gray-50 group-hover:bg-gray-100">
              <i className="fa-solid fa-arrow-left text-[14px]"></i>
            </div>
          </button>
          <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>
          <div className="flex flex-col">
            <h2 className="text-[#111418] text-lg font-bold leading-tight tracking-[-0.015em] flex items-center gap-2">
              {fileName}
            </h2>
            <span className="text-xs text-[#617589]">
              {uploadedFile
                ? `${(uploadedFile.size / 1024).toFixed(1)} KB`
                : "No document uploaded"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center mr-4 gap-2 text-sm text-[#617589]">
            <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              Draft
            </div>
          </div>
          <button
            onClick={() => (onBack ? onBack() : navigate("/modules/docsign"))}
            className="flex min-w-[70px] cursor-pointer items-center justify-center rounded-lg h-9 px-3 text-[#617589] hover:text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSendRequest}
            disabled={sending || !uploadedFile}
            className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-[#137fec] hover:bg-blue-600 text-white text-sm font-bold leading-normal shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="truncate">
              {sending ? "Sending..." : "Send Request"}
            </span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Recipients & Settings */}
        <aside className="w-80 lg:w-96 flex flex-col border-r border-[#e5e7eb] bg-white overflow-y-auto shrink-0 shadow-sm">
          {/* Recipients Section */}
          <div className="p-6 border-b border-[#f0f2f4]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#111418]">Recipients</h3>
              <button className="text-xs font-medium text-[#137fec] hover:text-blue-700 flex items-center gap-1">
                <i className="fa-solid fa-users text-sm"></i>
                Directory
              </button>
            </div>

            {/* Signing Mode Toggle */}
            <div className="bg-gray-100 p-1 rounded-lg flex mb-5">
              <button
                onClick={() => setSigningMode("sequential")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded text-center transition-all flex items-center justify-center gap-1 ${
                  signingMode === "sequential"
                    ? "bg-white text-[#137fec] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className="fa-solid fa-list-ol text-xs"></i>
                Sequential
              </button>
              <button
                onClick={() => setSigningMode("parallel")}
                className={`flex-1 py-1.5 text-xs font-medium rounded text-center transition-all flex items-center justify-center gap-1 ${
                  signingMode === "parallel"
                    ? "bg-white text-[#137fec] shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className="fa-solid fa-layer-group text-xs"></i>
                Parallel
              </button>
            </div>

            {/* Recipients List */}
            <div className="space-y-4">
              {recipients.map((recipient, index) => (
                <div
                  key={recipient.id}
                  className={`flex flex-col gap-3 relative group ${
                    index === 0 ? "" : "opacity-70 hover:opacity-100"
                  } transition-opacity`}
                >
                  <div
                    className={`absolute -left-6 top-2 bottom-2 w-1 ${getColorClasses(
                      recipient.color
                    ).bg.replace("bg-", "bg-")} ${
                      getColorClasses(recipient.color).border
                    } border-l-4 rounded-r`}
                  ></div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        getColorClasses(recipient.color).text
                      } uppercase tracking-wider flex items-center gap-1`}
                    >
                      <i
                        className={`fa-solid fa-${getOrderIcon(
                          recipient.order
                        )} text-xs`}
                      ></i>
                      Signer {recipient.order}
                    </span>
                    {recipients.length > 1 && (
                      <button
                        onClick={() => removeRecipient(recipient.id)}
                        className="text-[#617589] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-[14px]"></i>
                    <input
                      type="text"
                      className={`w-full h-10 pl-10 pr-9 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 ${
                        getColorClasses(recipient.color).ring
                      } ${
                        getColorClasses(recipient.color).border
                      } outline-none text-[#111418] placeholder:text-gray-400`}
                      placeholder="Search name or directory..."
                      value={recipient.name}
                      onChange={(e) =>
                        updateRecipient(recipient.id, "name", e.target.value)
                      }
                    />
                    <i className="fa-solid fa-address-book absolute right-3 top-1/2 -translate-y-1/2 text-[#137fec] cursor-pointer hover:bg-blue-50 p-1 rounded text-[14px]"></i>
                  </div>
                </div>
              ))}

              <button
                onClick={addRecipient}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-gray-300 text-[#137fec] text-sm font-medium hover:bg-gray-50 transition-colors mt-2"
              >
                <i className="fa-solid fa-user-plus text-[14px]"></i>
                Add Another Signer
              </button>
            </div>
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
                  className="w-full h-10 px-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none text-[#111418]"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-[#617589] mb-1 block">
                  Message
                </span>
                <textarea
                  className="w-full p-3 rounded-lg border border-[#dbe0e6] bg-white text-sm focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] outline-none text-[#111418] resize-none"
                  rows="3"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
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
                  <i className="fa-solid fa-bell absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-[14px]"></i>
                  <select
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] text-[#111418] appearance-none"
                    value={reminderFrequency}
                    onChange={(e) => setReminderFrequency(e.target.value)}
                  >
                    <option value="no">No reminders</option>
                    <option value="daily">Every day</option>
                    <option value="2days">Every 2 days</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[#617589] pointer-events-none text-[12px]"></i>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#617589] mb-1 block">
                  Expiration Date
                </label>
                <div className="relative">
                  <i className="fa-solid fa-calendar-xmark absolute left-3 top-1/2 -translate-y-1/2 text-[#617589] text-[14px]"></i>
                  <input
                    type="date"
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-[#dbe0e6] bg-white text-sm outline-none focus:ring-1 focus:ring-[#137fec] focus:border-[#137fec] text-[#111418]"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
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
                >
                  <span
                    className={`${
                      customBranding ? "translate-x-5" : "translate-x-0"
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  ></span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Document Preview Area */}
        <main className="flex-1 bg-[#f6f7f8] relative flex flex-col h-full overflow-hidden">
          {/* Upload Section - Show when no file */}
          {!uploadedFile ? (
            <div className="flex-1 flex items-center justify-center p-12">
              <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-[#137fec] hover:bg-blue-50/30 transition-all">
                  <div className="mb-6">
                    <i className="fa-solid fa-cloud-arrow-up text-6xl text-[#137fec]"></i>
                  </div>
                  <h3 className="text-xl font-bold text-[#111418] mb-2">
                    Upload Document
                  </h3>
                  <p className="text-sm text-[#617589] mb-6">
                    Drag and drop your PDF file here, or click to browse
                  </p>
                  <label className="inline-flex items-center gap-2 px-6 py-3 bg-[#137fec] hover:bg-blue-600 text-white rounded-lg font-semibold cursor-pointer transition-colors shadow-md hover:shadow-lg">
                    <i className="fa-solid fa-file-pdf text-lg"></i>
                    <span>
                      {uploading ? "Uploading..." : "Choose PDF File"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-xs text-[#617589] mt-4">
                    Maximum file size: 10MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Document Controls */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white shadow-lg rounded-lg px-2 py-2 flex items-center gap-1 border border-gray-200">
                <button
                  onClick={handleFirstPage}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <i className="fa-solid fa-backward-step text-[14px]"></i>
                </button>
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <i className="fa-solid fa-chevron-left text-[14px]"></i>
                </button>
                <span className="text-xs font-semibold text-[#111418] w-20 text-center select-none font-mono">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <i className="fa-solid fa-chevron-right text-[14px]"></i>
                </button>
                <div className="w-px h-5 bg-gray-200 mx-2"></div>
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <i className="fa-solid fa-minus text-[14px]"></i>
                </button>
                <span className="text-xs font-medium text-[#111418] w-12 text-center select-none">
                  {zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="w-8 h-8 rounded hover:bg-gray-100 text-[#617589] hover:text-[#137fec] flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <i className="fa-solid fa-plus text-[14px]"></i>
                </button>
              </div>

              {/* PDF Viewer */}
              <div className="flex-1 overflow-auto p-12 flex justify-center items-start">
                <div
                  className="relative"
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "top center",
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    if (draggedPlacedFieldId) {
                      handleRepositionDrop(e);
                    } else {
                      handleDrop(e);
                    }
                  }}
                >
                  {fileURL ? (
                    <div className="relative">
                      <iframe
                        src={fileURL}
                        className="bg-white shadow-2xl rounded-sm border border-gray-200"
                        style={{
                          width: "620px",
                          height: "877px",
                          pointerEvents: "none",
                        }}
                        title="PDF Preview"
                      />

                      {/* Overlay for dropped fields on current page */}
                      <div className="absolute inset-0 pointer-events-none">
                        {placedFields
                          .filter((field) => field.page === currentPage)
                          .map((field) => {
                            const isSelected = selectedFieldId === field.id;
                            const isSignatureField =
                              field.type === "signature" ||
                              field.type === "initials" ||
                              field.type === "dateSigned";

                            // Define colors based on field type
                            let bgColor,
                              borderColor,
                              borderStyle,
                              iconColor,
                              labelBgColor,
                              labelTextColor;

                            if (isSelected) {
                              // Selected state - yellow for all types
                              bgColor = "rgba(254, 243, 199, 0.95)";
                              borderColor = "#fbbf24";
                              borderStyle = "solid";
                              iconColor = "#b45309";
                              labelBgColor = "bg-yellow-200";
                              labelTextColor = "text-yellow-800";
                            } else if (isSignatureField) {
                              // Signature fields - blue
                              bgColor = "rgba(219, 234, 254, 0.95)";
                              borderColor = "#3b82f6";
                              borderStyle = "solid";
                              iconColor = "#3b82f6";
                              labelBgColor = "bg-blue-100";
                              labelTextColor = "text-blue-700";
                            } else {
                              // Data fields - gray
                              bgColor = "rgba(243, 244, 246, 0.95)";
                              borderColor = "#6b7280";
                              borderStyle = "dashed";
                              iconColor = "#6b7280";
                              labelBgColor = "bg-gray-100";
                              labelTextColor = "text-gray-700";
                            }

                            return (
                              <div
                                key={field.id}
                                draggable={isSelected}
                                onDragStart={(e) =>
                                  handlePlacedFieldDragStart(e, field.id)
                                }
                                onDragEnd={handlePlacedFieldDragEnd}
                                onClick={() => handleFieldClick(field.id)}
                                className={`absolute pointer-events-auto ${
                                  isSelected
                                    ? "cursor-move z-50"
                                    : "cursor-pointer z-10"
                                } rounded flex items-center px-3 gap-2 shadow-lg transition-all group`}
                                style={{
                                  left: `${field.position.x}%`,
                                  top: `${field.position.y}%`,
                                  width: `${field.size.width}px`,
                                  height: `${field.size.height}px`,
                                  backgroundColor: bgColor,
                                  border: `3px ${borderStyle} ${borderColor}`,
                                  borderStyle: borderStyle ? "solid" : "dashed",
                                }}
                              >
                                <div
                                  className={`absolute -top-6 left-0 text-[10px] font-bold px-2 py-0.5 rounded ${labelBgColor} ${labelTextColor}`}
                                >
                                  {field.label}
                                  {field.required && " *"}
                                </div>
                                <i
                                  className={`${field.icon}`}
                                  style={{ color: iconColor }}
                                ></i>
                                <span
                                  className={`text-xs font-bold`}
                                  style={{ color: iconColor }}
                                >
                                  {field.assignedName}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFieldDelete(field.id);
                                  }}
                                  className="absolute -top-3 -right-3 bg-white shadow-md border border-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50"
                                >
                                  <i className="fa-solid fa-times text-xs"></i>
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white relative w-[620px] h-[877px] shadow-2xl rounded-sm border border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <i className="fa-solid fa-file-pdf text-6xl text-gray-300 mb-4"></i>
                        <p className="text-gray-500">Loading PDF...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        {/* Right Sidebar - Form Fields */}
        <aside className="w-64 border-l border-[#e5e7eb] bg-white shrink-0 flex flex-col shadow-sm">
          <div className="p-5 border-b border-[#f0f2f4]">
            <h3 className="text-base font-bold text-[#111418]">Form Fields</h3>
            <p className="text-xs text-[#617589] mt-1">
              Drag and drop fields onto document.
            </p>
          </div>

          {/* Form Fields List */}
          <div className="p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="text-xs font-semibold text-[#617589] uppercase tracking-wider mb-1 mt-2">
              Signature Fields
            </div>

            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "signature",
                  label: "Signature",
                  icon: "fa-solid fa-pen-nib",
                  defaultSize: { width: 220, height: 50 },
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none"
            >
              <div className="size-8 rounded bg-blue-50 flex items-center justify-center text-[#137fec]">
                <i className="fa-solid fa-pen-nib text-[14px]"></i>
              </div>
              <span className="text-sm font-medium text-[#111418]">
                Signature
              </span>
            </div>

            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "initials",
                  label: "Initials",
                  icon: "fa-solid fa-heading",
                  defaultSize: { width: 100, height: 50 },
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none"
            >
              <div className="size-8 rounded bg-blue-50 flex items-center justify-center text-[#137fec]">
                <i className="fa-solid fa-heading text-[14px]"></i>
              </div>
              <span className="text-sm font-medium text-[#111418]">
                Initials
              </span>
            </div>

            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "dateSigned",
                  label: "Date Signed",
                  icon: "fa-solid fa-calendar",
                  defaultSize: { width: 180, height: 50 },
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none"
            >
              <div className="size-8 rounded bg-blue-50 flex items-center justify-center text-[#137fec]">
                <i className="fa-solid fa-calendar text-[14px]"></i>
              </div>
              <span className="text-sm font-medium text-[#111418]">
                Date Signed
              </span>
            </div>

            <div className="h-px bg-gray-100 my-2"></div>

            <div className="text-xs font-semibold text-[#617589] uppercase tracking-wider mb-1">
              Data Fields
            </div>

            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "textbox",
                  label: "Textbox",
                  icon: "fa-solid fa-text-width",
                  defaultSize: { width: 200, height: 40 },
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none"
            >
              <div className="size-8 rounded bg-gray-50 flex items-center justify-center text-gray-500">
                <i className="fa-solid fa-text-width text-[14px]"></i>
              </div>
              <span className="text-sm font-medium text-[#111418]">
                Textbox
              </span>
            </div>

            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "checkbox",
                  label: "Checkbox",
                  icon: "fa-solid fa-square-check",
                  defaultSize: { width: 30, height: 30 },
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none"
            >
              <div className="size-8 rounded bg-gray-50 flex items-center justify-center text-gray-500">
                <i className="fa-solid fa-square-check text-[14px]"></i>
              </div>
              <span className="text-sm font-medium text-[#111418]">
                Checkbox
              </span>
            </div>

            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, {
                  type: "fullName",
                  label: "Full Name",
                  icon: "fa-solid fa-id-badge",
                  defaultSize: { width: 200, height: 40 },
                })
              }
              className="flex items-center gap-3 p-3 rounded-lg border border-[#e5e7eb] bg-white hover:border-[#137fec] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group select-none"
            >
              <div className="size-8 rounded bg-gray-50 flex items-center justify-center text-gray-500">
                <i className="fa-solid fa-id-badge text-[14px]"></i>
              </div>
              <span className="text-sm font-medium text-[#111418]">
                Full Name
              </span>
            </div>
          </div>

          {/* Field Properties Panel */}
          <div className="mt-auto bg-gray-50 p-5 border-t border-[#e5e7eb]">
            {selectedFieldId ? (
              <>
                <h4 className="text-xs font-bold text-[#617589] uppercase mb-3 flex justify-between items-center">
                  Field Properties
                  <span className="text-[10px] bg-[#137fec]/10 text-[#137fec] px-1.5 py-0.5 rounded">
                    {placedFields.find((f) => f.id === selectedFieldId)?.label}
                  </span>
                </h4>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-xs text-[#111418] block mb-1 font-medium">
                      Assigned To
                    </span>
                    <select
                      value={
                        placedFields.find((f) => f.id === selectedFieldId)
                          ?.assignedTo || ""
                      }
                      onChange={(e) =>
                        handleFieldAssignment(
                          selectedFieldId,
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full text-sm border-gray-300 rounded-md shadow-sm h-9 bg-white focus:border-[#137fec] focus:ring-[#137fec]"
                    >
                      {recipients.map((r) => (
                        <option key={r.id} value={r.id}>
                          Signer {r.order} {r.name && `(${r.name})`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="req-check"
                      checked={
                        placedFields.find((f) => f.id === selectedFieldId)
                          ?.required || false
                      }
                      onChange={() =>
                        handleFieldRequiredToggle(selectedFieldId)
                      }
                      className="rounded border-gray-300 text-[#137fec] focus:ring-[#137fec] h-4 w-4"
                    />
                    <label
                      htmlFor="req-check"
                      className="text-sm text-[#111418] select-none"
                    >
                      Required Field
                    </label>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        handleFieldDelete(selectedFieldId);
                      }}
                      className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fa-solid fa-trash"></i>
                      Delete Field
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <i className="fa-solid fa-hand-pointer text-3xl text-gray-300 mb-3"></i>
                <p className="text-xs text-[#617589]">
                  {placedFields.length === 0
                    ? "Drag fields from above onto the document"
                    : "Click a field on the document to edit its properties"}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DocSignRequest;
