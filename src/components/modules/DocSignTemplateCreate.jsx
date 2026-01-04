import React, { useState, useRef } from "react";
import Breadcrumb from "../Breadcrumb";
import { toast } from "react-hot-toast";
import { apiService } from "../../services/api";

const DocSignTemplateCreate = ({ onBack }) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRole, setSelectedRole] = useState(1);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fields, setFields] = useState([]);
  const [roles, setRoles] = useState([
    { id: 1, name: "Role 1", color: "blue", permission: "Can Sign" },
  ]);
  const [autoReminders, setAutoReminders] = useState(true);
  const [expiration, setExpiration] = useState(true);
  const [customBranding, setCustomBranding] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const roleColors = {
    blue: {
      bg: "bg-blue-100",
      border: "border-blue-600",
      text: "text-blue-700",
      dot: "bg-blue-600",
    },
    purple: {
      bg: "bg-purple-100",
      border: "border-purple-500",
      text: "text-purple-700",
      dot: "bg-purple-500",
    },
    orange: {
      bg: "bg-orange-100",
      border: "border-orange-500",
      text: "text-orange-700",
      dot: "bg-orange-500",
    },
    green: {
      bg: "bg-green-100",
      border: "border-green-500",
      text: "text-green-700",
      dot: "bg-green-500",
    },
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".docx")) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);

    // Create a URL for PDF preview
    if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }

    toast.success("File uploaded successfully");
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
  };

  const handleAddRole = () => {
    const colors = ["blue", "purple", "orange", "green"];
    const newId = roles.length + 1;
    const color = colors[roles.length % colors.length];
    setRoles([
      ...roles,
      { id: newId, name: `Role ${newId}`, color, permission: "Can Sign" },
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
  };

  const handleRoleNameChange = (roleId, newName) => {
    setRoles(roles.map((r) => (r.id === roleId ? { ...r, name: newName } : r)));
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

      const formData = new FormData();
      formData.append("name", templateName);
      formData.append("category", category);
      formData.append("description", description);
      formData.append("document", uploadedFile);
      formData.append("roles", JSON.stringify(roles));
      formData.append("fields", JSON.stringify(fields));
      formData.append(
        "settings",
        JSON.stringify({
          autoReminders,
          expiration,
          customBranding,
        })
      );

      await apiService.post("/api/documents/templates", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

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

  const addFieldToCanvas = (fieldType) => {
    const selectedRoleData = roles.find((r) => r.id === selectedRole);
    if (!selectedRoleData) return;

    const newField = {
      id: Date.now(),
      type: fieldType,
      roleId: selectedRole,
      roleName: selectedRoleData.name,
      roleColor: selectedRoleData.color,
      x: 64,
      y: 300 + fields.length * 70,
      width: fieldType === "signature" ? 300 : fieldType === "date" ? 150 : 200,
      height: 60,
    };

    setFields([...fields, newField]);
  };

  const removeField = (fieldId) => {
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  return (
    <div className="w-full min-h-screen bg-[#f6f7f8] flex flex-col">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          {
            label: "DocSign",
            href: "/home/9",
            icon: "fa-pen-fancy",
          },
          { label: "Create Template", icon: "fa-plus" },
        ]}
      />

      {/* Action Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm mb-1">
              <button
                onClick={onBack}
                className="text-gray-600 font-medium hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-xs"></i>
                Manage Templates
              </button>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Create New</span>
            </div>
            <h1 className="text-gray-900 text-2xl font-black leading-tight tracking-tight">
              Create Signature Template
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
              disabled={!uploadedFile || loading}
            >
              <i className="fa-solid fa-save"></i>
              Save Template
            </button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 px-6 pb-6 pt-6">
        <div className="max-w-[1600px] mx-auto flex gap-6 h-full">
          {/* LEFT PANEL: Configuration */}
          <aside className="w-[380px] shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
            {/* 1. Metadata Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">
                Template Details
              </h3>
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-900">
                    Template Name
                  </span>
                  <input
                    className="w-full rounded-lg border-gray-300 bg-white text-sm h-10 px-3 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-400"
                    placeholder="e.g. Employee Onboarding Agreement"
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-gray-900">
                    Category
                  </span>
                  <select
                    className="w-full rounded-lg border-gray-300 bg-white text-sm h-10 px-3 focus:ring-blue-500 focus:border-blue-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">Select a category</option>
                    <option value="hr">Human Resources</option>
                    <option value="legal">Legal &amp; Compliance</option>
                    <option value="sales">Sales Contracts</option>
                    <option value="finance">Finance</option>
                  </select>
                </label>
              </div>
            </div>

            {/* 2. Document Upload Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">
                Source Document
              </h3>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="bg-blue-100 text-blue-600 rounded-full p-2 mb-2 group-hover:scale-110 transition-transform">
                    <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Click to upload or drag &amp; drop
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    PDF, DOCX up to 10MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-red-500">
                    <i className="fa-solid fa-file-pdf text-2xl"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <i className="fa-solid fa-trash text-sm"></i>
                  </button>
                </div>
              )}
            </div>

            {/* 3. Roles Configuration Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600">
                  Recipient Roles
                </h3>
                <button
                  onClick={handleAddRole}
                  className="text-blue-600 text-xs font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Add Role
                </button>
              </div>
              <div className="flex flex-col gap-3">
                {roles.map((role, index) => {
                  const colors = roleColors[role.color];
                  return (
                    <div
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`p-3 rounded-lg border-2 relative cursor-pointer transition-all ${
                        selectedRole === role.id
                          ? `${colors.border} ${colors.bg}`
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`absolute -left-[1px] top-3 bottom-3 w-1 rounded-r ${colors.dot}`}
                      ></div>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`size-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            role.color === "blue"
                              ? "bg-blue-600 text-white"
                              : role.color === "purple"
                              ? "bg-purple-100 text-purple-600"
                              : role.color === "orange"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-green-100 text-green-600"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <input
                          className="bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 w-full"
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
                            className="text-gray-400 hover:text-red-500"
                          >
                            <i className="fa-solid fa-times text-sm"></i>
                          </button>
                        )}
                      </div>
                      <div className="pl-9">
                        <div className="text-xs text-gray-600 flex items-center gap-1">
                          <i className="fa-solid fa-pen text-xs"></i>
                          {role.permission}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Settings Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4">
                Settings
              </h3>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    Auto-Reminders
                  </span>
                  <span className="text-xs text-gray-600">Every 3 days</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoReminders}
                    onChange={(e) => setAutoReminders(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100 mt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    Expiration
                  </span>
                  <span className="text-xs text-gray-600">
                    30 days after sent
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={expiration}
                    onChange={(e) => setExpiration(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-2 mt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    Custom Branding
                  </span>
                  <span className="text-xs text-gray-600">
                    Use company logo
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={customBranding}
                    onChange={(e) => setCustomBranding(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </aside>

          {/* RIGHT PANEL: Editor Canvas */}
          <section className="flex-1 flex flex-col bg-slate-100 rounded-xl border border-gray-200 overflow-hidden shadow-inner">
            {/* Toolbar */}
            <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold uppercase text-gray-600 mr-2 whitespace-nowrap">
                  Fields for{" "}
                  <span className="text-blue-600">
                    {roles.find((r) => r.id === selectedRole)?.name}
                  </span>
                  :
                </span>
                {/* Tools */}
                <button
                  onClick={() => addFieldToCanvas("signature")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-signature text-sm"></i>
                  <span className="text-sm font-medium whitespace-nowrap">
                    Signature
                  </span>
                </button>
                <button
                  onClick={() => addFieldToCanvas("initials")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-font text-sm"></i>
                  <span className="text-sm font-medium whitespace-nowrap">
                    Initials
                  </span>
                </button>
                <button
                  onClick={() => addFieldToCanvas("date")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-calendar-day text-sm"></i>
                  <span className="text-sm font-medium whitespace-nowrap">
                    Date
                  </span>
                </button>
                <button
                  onClick={() => addFieldToCanvas("textbox")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-text-width text-sm"></i>
                  <span className="text-sm font-medium whitespace-nowrap">
                    Textbox
                  </span>
                </button>
                <button
                  onClick={() => addFieldToCanvas("checkbox")}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-square-check text-sm"></i>
                  <span className="text-sm font-medium whitespace-nowrap">
                    Checkbox
                  </span>
                </button>
              </div>
              <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
                  <i className="fa-solid fa-magnifying-glass-minus"></i>
                </button>
                <span className="text-xs font-medium text-gray-600 w-12 text-center">
                  100%
                </span>
                <button className="p-1.5 rounded hover:bg-gray-100 text-gray-600">
                  <i className="fa-solid fa-magnifying-glass-plus"></i>
                </button>
              </div>
            </div>

            {/* Document Surface */}
            <div className="flex-1 overflow-auto p-12 bg-slate-100 flex justify-center items-start relative">
              {pdfUrl ? (
                <div className="relative">
                  <iframe
                    src={pdfUrl}
                    className="w-[800px] min-h-[1100px] bg-white shadow-lg"
                    title="PDF Preview"
                  />
                  {/* Overlay for fields */}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {fields.map((field) => {
                      const colors = roleColors[field.roleColor];
                      return (
                        <div
                          key={field.id}
                          style={{
                            position: "absolute",
                            top: `${field.y}px`,
                            left: `${field.x}px`,
                            width: `${field.width}px`,
                            height: `${field.height}px`,
                          }}
                          className={`${colors.bg} border-2 ${colors.border} rounded flex items-center justify-between px-3 cursor-move hover:shadow-md group z-10 pointer-events-auto`}
                        >
                          <div
                            className={`flex items-center gap-2 ${colors.text} font-bold text-sm`}
                          >
                            <i
                              className={`fa-solid ${
                                field.type === "signature"
                                  ? "fa-signature"
                                  : field.type === "date"
                                  ? "fa-calendar-day"
                                  : field.type === "initials"
                                  ? "fa-font"
                                  : field.type === "checkbox"
                                  ? "fa-square-check"
                                  : "fa-text-width"
                              }`}
                            ></i>
                            <span className="capitalize">
                              {field.type} ({field.roleName})
                            </span>
                          </div>
                          <button
                            onClick={() => removeField(field.id)}
                            className="bg-white rounded-full p-1 text-gray-500 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                          <div
                            className={`absolute -right-1 -bottom-1 size-3 ${colors.dot} cursor-se-resize rounded-full`}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="bg-gray-200 rounded-full p-6 mb-4">
                    <i className="fa-solid fa-file-pdf text-4xl text-gray-400"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No Document Uploaded
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload a PDF document to start adding signature fields
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">
                Save as Template
              </h2>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Save this setup to reuse later.
            </p>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Contract_v2_template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-900">
                    Category
                  </label>
                  <button className="text-xs text-blue-600 hover:underline font-medium">
                    Manage Categories
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none pr-8"
                  >
                    <option value="">Select a category...</option>
                    <option value="hr">Human Resources</option>
                    <option value="legal">Legal &amp; Compliance</option>
                    <option value="sales">Sales Contracts</option>
                    <option value="finance">Finance</option>
                  </select>
                  <i className="fa-solid fa-chevron-down absolute right-3 top-3 text-gray-400 text-xs pointer-events-none"></i>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Categorizing templates helps your team find them faster.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Description{" "}
                  <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of when to use this template..."
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                ></textarea>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
