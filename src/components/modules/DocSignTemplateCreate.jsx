import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Breadcrumb from "../Breadcrumb";
import { toast } from "react-hot-toast";
import { apiService } from "../../services/api";
import { PDFDocument } from 'pdf-lib';

const DocSignTemplateCreate = ({ onBack }) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRole, setSelectedRole] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fields, setFields] = useState([]);
  const [roles, setRoles] = useState([
    { id: 1, name: "Signer 1", color: "blue", permission: "Can Sign" },
  ]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Layout UI states
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [draggedField, setDraggedField] = useState(null);
  const [draggedPlacedFieldId, setDraggedPlacedFieldId] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  // Initialize sidebar states based on screen width and handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowLeftSidebar(false);
      } else {
        setShowLeftSidebar(true);
      }
    };
    handleResize(); // Run on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const roleColors = {
    blue: {
      bg: "bg-blue-50 text-blue-700",
      border: "border-blue-500",
      dot: "bg-blue-500",
      bgOverlay: "rgba(219, 234, 254, 0.95)",
    },
    purple: {
      bg: "bg-purple-50 text-purple-700",
      border: "border-purple-500",
      dot: "bg-purple-500",
      bgOverlay: "rgba(243, 232, 255, 0.95)",
    },
    orange: {
      bg: "bg-orange-50 text-orange-700",
      border: "border-orange-500",
      dot: "bg-orange-500",
      bgOverlay: "rgba(255, 237, 213, 0.95)",
    },
    green: {
      bg: "bg-green-50 text-green-700",
      border: "border-green-500",
      dot: "bg-green-500",
      bgOverlay: "rgba(209, 250, 229, 0.95)",
    },
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
      setCurrentPage(1);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      toast.success("Document loaded successfully");
    } catch (err) {
      console.error("Error parsing PDF:", err);
      toast.error("Failed to load PDF preview");
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFields([]);
  };

  const handleAddRole = () => {
    const colors = ["blue", "purple", "orange", "green"];
    const newId = roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1;
    const color = colors[roles.length % colors.length];
    setRoles([
      ...roles,
      { id: newId, name: `Signer ${newId}`, color, permission: "Can Sign" },
    ]);
  };

  const handleRemoveRole = (roleId) => {
    if (roles.length === 1) {
      toast.error("You must have at least one role");
      return;
    }
    setRoles(roles.filter((r) => r.id !== roleId));
    // Remove fields associated with this role
    setFields(fields.filter((f) => f.roleId !== roleId));
    if (selectedRole === roleId) {
      setSelectedRole(roles.filter((r) => r.id !== roleId)[0].id);
    }
  };

  const handleRoleNameChange = (roleId, newName) => {
    setRoles(roles.map((r) => (r.id === roleId ? { ...r, name: newName } : r)));
    // Update roleName inside fields
    setFields(fields.map(f => f.roleId === roleId ? { ...f, roleName: newName } : f));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }
    if (!uploadedFile) {
      toast.error("Please upload a document");
      return;
    }

    try {
      setLoading(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const fileDataURL = reader.result;

        const templateData = {
          name: templateName,
          category: category,
          description: description,
          fileURL: fileDataURL,
          fileSize: `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`,
          roles: roles,
          fields: fields.map(f => ({
            id: String(f.id),
            type: f.type,
            label: f.label,
            page: f.page || 1,
            position: f.position,
            size: f.size,
            required: f.required,
            assignedTo: f.roleId, // compatible with DocSignView.jsx recipient mapping
          })),
        };

        try {
          await apiService.post("/api/documents/templates", templateData);
          toast.success("Template saved successfully!");
          setShowSaveModal(false);

          // Return to DocSign view after short delay
          setTimeout(() => {
            if (onBack) onBack();
          }, 1500);
        } catch (error) {
          console.error("Error saving template:", error);
          toast.error(error.response?.data?.message || "Failed to save template");
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(uploadedFile);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to process document file");
      setLoading(false);
    }
  };

  // Add field to page canvas (supports click to add at default percentage)
  const addFieldToCanvas = (fieldType, positionPercent = { x: 25, y: 20 }) => {
    const selectedRoleData = roles.find((r) => r.id === selectedRole);
    if (!selectedRoleData) return;

    const newField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: fieldType === "dateSigned" ? "Date Signed" : fieldType.charAt(0).toUpperCase() + fieldType.slice(1),
      roleId: selectedRole,
      roleName: selectedRoleData.name,
      roleColor: selectedRoleData.color,
      page: currentPage,
      position: positionPercent,
      size: fieldType === "signature" || fieldType === "initials" ? { width: 180, height: 50 } : { width: 150, height: 40 },
      required: fieldType === "signature" || fieldType === "initials",
    };

    setFields([...fields, newField]);
    toast.success(`Added ${newField.label} field`);
  };

  const removeField = (fieldId) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    toast.success("Field removed");
  };

  // Drag and drop handlers from toolbar to canvas
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

    // Calculate percentage coords
    const xPercent = (x / dropZone.width) * 100;
    const yPercent = (y / dropZone.height) * 100;

    addFieldToCanvas(draggedField, { x: xPercent, y: yPercent });
    setDraggedField(null);
  };

  // Drag and drop handler for repositioning placed fields
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

    setFields(
      fields.map((field) =>
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

  const handleFieldClick = (fieldId) => {
    setSelectedFieldId(fieldId === selectedFieldId ? null : fieldId);
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <div className="px-4">
        <Breadcrumb
          items={[
            { label: "Home", href: "/home", icon: "fa-house" },
            {
              label: "DocSign",
              onClick: onBack,
              icon: "fa-pen-fancy",
            },
            { label: "Create Template", icon: "fa-plus" },
          ]}
        />
      </div>

      {/* Action Header - Expanded to full width */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 shadow-sm w-full">
        <div className="w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-slate-900 text-3xl font-extrabold tracking-tight flex items-center gap-2">
              <i className="fa-solid fa-folder-plus text-[#137fec]"></i>
              Create Signature Template
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border text-sm transition-colors ${
                showLeftSidebar
                  ? "border-blue-600 bg-blue-50 text-blue-600"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
              }`}
              title="Template Configuration"
            >
              <i className="fa-solid fa-sliders text-base" />
            </button>
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-colors active:scale-98 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 active:scale-98 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!uploadedFile || loading}
            >
              <i className="fa-solid fa-save"></i>
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* Split View - Expanded to full width without max-w constraints */}
      <div className="flex-1 w-full px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6 overflow-hidden relative">
        
        {/* Mobile backdrop for left sidebar */}
        {showLeftSidebar && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setShowLeftSidebar(false)}
          />
        )}

        {/* LEFT PANEL: Configuration - Becomes overlay drawer on mobile */}
        <aside
          className={`fixed lg:relative z-40 lg:z-auto top-0 left-0 h-full lg:h-auto flex flex-col bg-white lg:bg-transparent shrink-0 shadow-2xl lg:shadow-none border-r lg:border-r-0 border-slate-100 p-6 lg:p-0 transition-all duration-300 ease-in-out gap-4 overflow-y-auto ${
            showLeftSidebar
              ? "w-80 lg:w-96 translate-x-0 opacity-100"
              : "w-80 lg:w-0 -translate-x-full lg:translate-x-0 lg:overflow-hidden lg:opacity-0"
          }`}
        >
          {/* Mobile drawer header */}
          <div className="flex items-center justify-between lg:hidden border-b border-slate-100 pb-3 mb-2">
            <span className="font-bold text-slate-800">Template Setup</span>
            <button onClick={() => setShowLeftSidebar(false)} className="text-slate-500 hover:text-slate-700">
              <i className="fa-solid fa-times text-lg" />
            </button>
          </div>

          {/* 1. Metadata Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <i className="fa-solid fa-info-circle text-blue-500"></i>
              Template Details
            </h3>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700">Template Name</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 text-sm h-10 px-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 font-medium outline-none transition-all"
                  placeholder="e.g. Employee Contract v2"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-slate-700">Category</span>
                <div className="relative">
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 text-sm h-10 px-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold outline-none transition-all appearance-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select a category</option>
                    <option value="hr">HR &amp; People</option>
                    <option value="legal">Legal &amp; Compliance</option>
                    <option value="sales">Sales Contracts</option>
                    <option value="finance">Finance</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                </div>
              </label>
            </div>
          </div>

          {/* 2. Document Upload Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
              <i className="fa-solid fa-file-pdf text-blue-500"></i>
              Source Document
            </h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            {!uploadedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50/50 hover:border-blue-400 transition-all cursor-pointer group"
              >
                <div className="size-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-cloud-arrow-up text-lg"></i>
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Upload PDF File
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PDF format up to 10MB
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-slate-55 rounded-xl border border-slate-100">
                <div className="text-red-500">
                  <i className="fa-solid fa-file-pdf text-2xl"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <i className="fa-solid fa-trash text-sm"></i>
                </button>
              </div>
            )}
          </div>

          {/* 3. Roles Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex-1 lg:flex-none">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-users text-blue-500"></i>
                Signer Roles
              </h3>
              <button
                onClick={handleAddRole}
                className="text-blue-600 text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
              >
                <i className="fa-solid fa-plus text-xs"></i> Add Role
              </button>
            </div>
            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
              {roles.map((role, index) => {
                const colors = roleColors[role.color] || roleColors.blue;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`p-3.5 rounded-xl border-2 relative cursor-pointer transition-all ${
                      selectedRole === role.id
                        ? `${colors.border} ${colors.bg}`
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div
                      className={`absolute -left-[1px] top-3.5 bottom-3.5 w-1 rounded-r-lg ${colors.dot}`}
                    ></div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`size-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-900 text-white`}
                      >
                        {index + 1}
                      </div>
                      <input
                        className="bg-transparent border-none p-0 text-sm font-extrabold text-slate-800 focus:ring-0 w-full outline-none"
                        value={role.name}
                        onChange={(e) =>
                          handleRoleNameChange(role.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      {roles.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveRole(role.id);
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <i className="fa-solid fa-times text-sm"></i>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT PANEL: Editor Canvas - Full Width */}
        <section className="flex-1 flex flex-col bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden shadow-inner relative min-h-[500px]">
          {/* Toolbar */}
          <div className="bg-white px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm z-20">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-black uppercase text-slate-400 mr-2 whitespace-nowrap">
                Toolbar for{" "}
                <span className="text-blue-600">
                  {roles.find((r) => r.id === selectedRole)?.name || "Signer"}
                </span>
                :
              </span>
              {/* Draggable Tools */}
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "signature", label: "Signature", icon: "fa-signature" })}
                onClick={() => addFieldToCanvas("signature")}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-xl hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0"
                title="Drag onto document or Click to add"
              >
                <i className="fa-solid fa-signature text-sm"></i>
                <span className="text-xs font-bold whitespace-nowrap">
                  Signature
                </span>
              </button>
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "initials", label: "Initials", icon: "fa-font" })}
                onClick={() => addFieldToCanvas("initials")}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-xl hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0"
                title="Drag onto document or Click to add"
              >
                <i className="fa-solid fa-font text-sm"></i>
                <span className="text-xs font-bold whitespace-nowrap">
                  Initials
                </span>
              </button>
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "dateSigned", label: "Date Signed", icon: "fa-calendar-day" })}
                onClick={() => addFieldToCanvas("dateSigned")}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-xl hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0"
                title="Drag onto document or Click to add"
              >
                <i className="fa-solid fa-calendar-day text-sm"></i>
                <span className="text-xs font-bold whitespace-nowrap">
                  Date
                </span>
              </button>
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "textbox", label: "Textbox", icon: "fa-text-width" })}
                onClick={() => addFieldToCanvas("textbox")}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-xl hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0"
                title="Drag onto document or Click to add"
              >
                <i className="fa-solid fa-text-width text-sm"></i>
                <span className="text-xs font-bold whitespace-nowrap">
                  Textbox
                </span>
              </button>
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, { type: "checkbox", label: "Checkbox", icon: "fa-square-check" })}
                onClick={() => addFieldToCanvas("checkbox")}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-xl hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0"
                title="Drag onto document or Click to add"
              >
                <i className="fa-solid fa-square-check text-sm"></i>
                <span className="text-xs font-bold whitespace-nowrap">
                  Checkbox
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
              <span className="text-[10px] font-black text-slate-400 uppercase">100% Preview</span>
            </div>
          </div>

          {/* Document Surface Canvas */}
          <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 flex justify-center items-start relative z-10">
            {pdfUrl ? (
              <div
                className="relative w-full max-w-[1000px]"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  if (draggedPlacedFieldId) {
                    handleRepositionDrop(e);
                  } else {
                    handleDrop(e);
                  }
                }}
              >
                <div className="relative w-full flex flex-col items-center">
                  <div className="relative w-full">
                    <iframe
                      key={`pdf-page-${currentPage}`}
                      src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0`}
                      className="w-full h-[1200px] bg-white shadow-xl pointer-events-none rounded-lg"
                      title="PDF Preview"
                    />

                    {/* Drag overlay to capture drop events on top of iframe */}
                    {(draggedField || draggedPlacedFieldId) && (
                      <div
                        className="absolute inset-0 z-30 bg-transparent"
                        onDragOver={handleDragOver}
                        onDrop={(e) => {
                          if (draggedPlacedFieldId) {
                            handleRepositionDrop(e);
                          } else {
                            handleDrop(e);
                          }
                        }}
                      />
                    )}

                    {/* Overlay for dropped fields on current page */}
                    <div className="absolute inset-0 pointer-events-none z-20">
                      {fields
                        .filter((field) => field.page === currentPage)
                        .map((field) => {
                          const isSelected = selectedFieldId === field.id;
                          const roleData = roles.find((r) => r.id === field.roleId) || {};
                          const colors = roleColors[roleData.color || "blue"] || roleColors.blue;

                          return (
                            <div
                              key={field.id}
                              draggable
                              onDragStart={(e) => handlePlacedFieldDragStart(e, field.id)}
                              onDragEnd={handlePlacedFieldDragEnd}
                              onClick={() => handleFieldClick(field.id)}
                              style={{
                                position: "absolute",
                                left: `${field.position.x}%`,
                                top: `${field.position.y}%`,
                                width: `${field.size.width}px`,
                                height: `${field.size.height}px`,
                                transform: "translate(-50%, -50%)",
                                backgroundColor: colors.bgOverlay || "rgba(219, 234, 254, 0.95)",
                                border: isSelected ? "3px solid #f59e0b" : `3px solid ${colors.border}`,
                              }}
                              className="rounded shadow-lg flex items-center justify-between px-3 cursor-move group z-10 pointer-events-auto transition-all"
                            >
                              <div className={`flex items-center gap-1.5 font-bold text-xs ${colors.text}`}>
                                <i
                                  className={`fa-solid ${
                                    field.type === "signature"
                                      ? "fa-signature"
                                      : field.type === "dateSigned"
                                        ? "fa-calendar-day"
                                        : field.type === "initials"
                                          ? "fa-font"
                                          : field.type === "checkbox"
                                            ? "fa-square-check"
                                            : "fa-text-width"
                                  }`}
                                ></i>
                                <span className="capitalize text-[10px]">
                                  {field.label}
                                </span>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(field.id);
                                }}
                                className="bg-white rounded-full p-1 text-slate-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <i className="fa-solid fa-times text-[10px]"></i>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex items-center gap-4 bg-white px-4 py-2 mt-4 rounded-lg shadow-sm border border-slate-100 z-40">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${currentPage === 1 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      <i className="fa-solid fa-chevron-left mr-1"></i> Prev
                    </button>
                    <span className="text-sm font-bold text-slate-700">Page {currentPage} of {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${currentPage === totalPages ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      Next <i className="fa-solid fa-chevron-right ml-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md mx-auto mt-20">
                <div className="size-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <i className="fa-solid fa-file-pdf text-3xl"></i>
                </div>
                <h3 className="text-lg font-extrabold text-slate-800 mb-2">
                  No Document Loaded
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  Upload a PDF document from the left panel to start configuring your signature fields.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-bold shadow-md shadow-blue-500/10 active:scale-98"
                >
                  Upload PDF Document
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100 overflow-hidden relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <i className="fa-solid fa-save text-blue-500"></i>
                Save as Template
              </h2>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-650 transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Adopt this template structure to reuse inside new document signing requests.
            </p>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. NDA Agreement Template"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold appearance-none pr-8 bg-slate-50"
                  >
                    <option value="">Select a category...</option>
                    <option value="hr">HR &amp; People</option>
                    <option value="legal">Legal &amp; Compliance</option>
                    <option value="sales">Sales Contracts</option>
                    <option value="finance">Finance</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3.5 top-3 text-slate-400 text-xs pointer-events-none"></i>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows="3"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-semibold resize-none"
                ></textarea>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-50">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-5 py-2.5 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  "Save Template"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocSignTemplateCreate;
