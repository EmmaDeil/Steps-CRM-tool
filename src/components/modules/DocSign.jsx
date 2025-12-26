import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import toast from "react-hot-toast";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";

const DocSign = () => {
  const { user } = useUser();
  const [signatureModal, setSignatureModal] = useState(null);
  const [signatureTab, setSignatureTab] = useState("draw"); // draw, type, upload, recipient
  const [inkColor, setInkColor] = useState("#111418");
  const [typedSignature, setTypedSignature] = useState("");
  const [signatureFont, setSignatureFont] = useState(
    "font-['Brush_Script_MT']"
  );
  const [documentMenuOpen, setDocumentMenuOpen] = useState(null);

  // Multiple placed signatures on document
  const [placedSignatures, setPlacedSignatures] = useState([]);
  const [activeDraggingId, setActiveDraggingId] = useState(null);
  const [isSigned, setIsSigned] = useState(false);

  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Drawing canvas
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState(null);

  // Upload
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const fileInputRef = React.useRef(null);

  // Recipients for document signing
  const [recipients, setRecipients] = useState([]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  // PDF page tracking
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [, setZoomLevel] = useState(100);
  const pdfIframeRef = React.useRef(null);

  // Documents state - starts empty, populated when documents are uploaded
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch documents on component mount
  useEffect(() => {
    if (user?.id) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get(`/api/documents?userId=${user.id}`);
      setDocuments(response.data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.type !== "application/pdf") {
          toast.error("Please upload a PDF file");
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          toast.error("File size must be less than 50MB");
          return;
        }

        try {
          // Convert file to base64 for storage
          const reader = new FileReader();
          reader.onload = async (event) => {
            const fileURL = event.target.result; // Base64 string

            // Create document object
            const newDoc = {
              name: file.name,
              fileURL: fileURL,
              fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              uploadedBy: user?.id,
              uploadedByName: user?.fullName || "You",
              status: "Pending",
              involvedParties: [
                { name: user?.fullName || "You", role: "Owner" },
              ],
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              metadata: {
                icon: "fa-file-pdf",
                iconColor: "text-red-500",
              },
            };

            // Save to backend
            const response = await apiService.post("/api/documents", newDoc);
            const savedDoc = response.data;

            // Add file object for frontend use
            savedDoc.file = file;
            savedDoc.fileURL = URL.createObjectURL(file);

            setDocuments([savedDoc, ...documents]);
            toast.success(`"${file.name}" uploaded successfully`);

            // Open signature interface immediately for instant signing
            setSignatureModal(savedDoc);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Error uploading document:", error);
          toast.error("Failed to upload document");
        }
      }
    };
    input.click();
  };

  const getStatusBadge = (status) => {
    const styles = {
      "Action Required":
        "bg-red-50 text-red-700 border border-red-200 font-semibold",
      Pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      Completed: "bg-green-50 text-green-700 border border-green-200",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs ${
          styles[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {status}
      </span>
    );
  };

  // ========== RECIPIENT HANDLERS ==========
  const handleAddRecipient = () => {
    if (!recipientName.trim() || !recipientEmail.trim()) {
      toast.error("Please enter both name and email");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Add recipient as a field on the document
    const newRecipientField = {
      id: Date.now(),
      type: "recipient",
      data: {
        name: recipientName.trim(),
        email: recipientEmail.trim(),
        role: "Signer",
      },
      position: {
        x: 100 + placedSignatures.length * 20,
        y: 150 + placedSignatures.length * 20,
      },
      size: { width: 240, height: 60 },
    };

    setPlacedSignatures([...placedSignatures, newRecipientField]);
    setRecipientName("");
    setRecipientEmail("");
    toast.success(`Recipient field for ${recipientName} added to document`);
  };

  const handleRemoveRecipient = (id) => {
    setRecipients(recipients.filter((r) => r.id !== id));
    toast.info("Recipient removed");
  };

  // ========== SIGNATURE MODAL HANDLERS ==========
  const handleSignNow = (document) => {
    setSignatureModal(document);
    setSignatureTab("draw");
    setInkColor("#111418");
    setTypedSignature("");
    setDrawnSignature(null);
    setUploadedSignature(null);
    setRecipients(document.recipients || []);
    setCurrentPage(1);
    setTotalPages(document.totalPages || 1);
    setZoomLevel(100);
    setPlacedSignatures(document.signatures || []); // Load existing signatures
    setIsSigned(document.status === "Completed"); // Set signed state if already completed

    // Load PDF and get page count
    if (document.file) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Use a simple approach to estimate pages from file size
          // More accurate would require pdf.js library
          const fileSizeInKB = document.file.size / 1024;
          // Rough estimate: 50KB per page average for PDFs
          const estimatedPages = Math.max(1, Math.round(fileSizeInKB / 50));
          setTotalPages(estimatedPages);
        } catch (error) {
          console.error("Error loading PDF:", error);
          setTotalPages(1);
        }
      };
      reader.readAsArrayBuffer(document.file);
    }
  };

  const handleApplySignature = async () => {
    if (placedSignatures.length === 0) {
      toast.error("Please add at least one signature or field to the document");
      return;
    }

    try {
      // Make all signatures permanent
      setIsSigned(true);

      // Send to backend
      await apiService.post(`/api/documents/${signatureModal._id}/sign`, {
        signatures: placedSignatures,
        recipients,
        userId: user?.id,
        userName: user?.fullName,
      });

      // Update local state
      setDocuments(
        documents.map((doc) =>
          doc._id === signatureModal._id
            ? {
                ...doc,
                status: "Completed",
                signatures: placedSignatures,
                recipients,
                completedAt: new Date(),
              }
            : doc
        )
      );

      toast.success("Document signed successfully!");
      setSignatureModal(null);
    } catch (error) {
      console.error("Error signing document:", error);
      toast.error("Failed to sign document");
      setIsSigned(false);
    }
  };

  const handleClearSignature = () => {
    if (signatureTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setDrawnSignature(null);
      }
    } else if (signatureTab === "type") {
      setTypedSignature("");
    } else if (signatureTab === "upload") {
      setUploadedSignature(null);
    }
    toast.info("Signature cleared");
  };

  const handleCreateSignature = () => {
    let signatureData = null;
    let signatureType = null;

    if (signatureTab === "draw" && drawnSignature) {
      signatureData = drawnSignature;
      signatureType = "image";
    } else if (signatureTab === "type" && typedSignature.trim()) {
      signatureData = { text: typedSignature, font: signatureFont };
      signatureType = "text";
    } else if (signatureTab === "upload" && uploadedSignature) {
      signatureData = uploadedSignature;
      signatureType = "image";
    } else {
      toast.error("Please create a signature first");
      return;
    }

    // Add new signature to the document
    const newSignature = {
      id: Date.now(),
      type: signatureType,
      data: signatureData,
      position: {
        x: 100 + placedSignatures.length * 20,
        y: 200 + placedSignatures.length * 20,
      },
      size: { width: 240, height: 80 },
    };

    setPlacedSignatures([...placedSignatures, newSignature]);
    toast.success("Signature added to document!");

    // Clear current signature to allow creating a new one
    if (signatureTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setDrawnSignature(null);
      }
    } else if (signatureTab === "type") {
      setTypedSignature("");
    } else if (signatureTab === "upload") {
      setUploadedSignature(null);
    }
  };

  // ========== SIGNATURE BOX DRAGGING ==========
  const handleSignatureMouseDown = (e, signatureId) => {
    if (
      e.target.classList.contains("resize-handle") ||
      e.target.closest(".delete-button")
    )
      return;
    e.stopPropagation();
    setActiveDraggingId(signatureId);
    const signature = placedSignatures.find((sig) => sig.id === signatureId);
    if (signature) {
      setDragStart({
        x: e.clientX - signature.position.x,
        y: e.clientY - signature.position.y,
      });
    }
  };

  const handleRemoveSignature = (signatureId) => {
    setPlacedSignatures(
      placedSignatures.filter((sig) => sig.id !== signatureId)
    );
    toast.info("Signature removed");
  };

  React.useEffect(() => {
    if (activeDraggingId) {
      const handleSignatureMouseMove = (e) => {
        setPlacedSignatures((prev) =>
          prev.map((sig) =>
            sig.id === activeDraggingId
              ? {
                  ...sig,
                  position: {
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                  },
                }
              : sig
          )
        );
      };

      const handleSignatureMouseUp = () => {
        setActiveDraggingId(null);
      };

      document.addEventListener("mousemove", handleSignatureMouseMove);
      document.addEventListener("mouseup", handleSignatureMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleSignatureMouseMove);
        document.removeEventListener("mouseup", handleSignatureMouseUp);
      };
    }
  }, [activeDraggingId, dragStart]);

  // ========== DRAWING ON CANVAS ==========
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && signatureTab === "draw") {
      const ctx = canvas.getContext("2d");
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [inkColor, signatureTab]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataURL = canvas.toDataURL();
        setDrawnSignature(dataURL);
      }
    }
    setIsDrawing(false);
  };

  // Touch support for mobile devices
  const handleTouchStart = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    setIsDrawing(true);
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const ctx = canvas.getContext("2d");
    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    ctx.stroke();
    e.preventDefault();
  };

  const handleTouchEnd = () => {
    if (isDrawing) {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataURL = canvas.toDataURL();
        setDrawnSignature(dataURL);
      }
    }
    setIsDrawing(false);
  };

  // ========== FILE UPLOAD FOR SIGNATURE ==========
  const handleSignatureFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPG)");
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      // Read and display the image
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSignature(event.target.result);
        toast.success("Image uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (PNG, JPG)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSignature(event.target.result);
        toast.success("Image uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ========== DOCUMENT MENU ACTIONS ==========
  const handleDocumentMenuToggle = (docId) => {
    setDocumentMenuOpen(documentMenuOpen === docId ? null : docId);
  };

  const handleViewDocument = (doc) => {
    setDocumentMenuOpen(null);
    toast.info(`Opening ${doc.name}...`);
    // Add your document viewer logic here
  };

  const handleDownloadDocument = (doc) => {
    setDocumentMenuOpen(null);
    toast.success(`Downloading ${doc.name}...`);
    // Add your download logic here
  };

  const handleDeleteDocument = async (doc) => {
    setDocumentMenuOpen(null);
    if (window.confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      try {
        await apiService.delete(`/api/documents/${doc._id}`);
        setDocuments(documents.filter((d) => d._id !== doc._id));
        toast.success("Document deleted successfully");
      } catch (error) {
        console.error("Error deleting document:", error);
        toast.error("Failed to delete document");
      }
    }
  };

  const handleShareDocument = (doc) => {
    setDocumentMenuOpen(null);
    toast.info(`Sharing options for ${doc.name}`);
    // Add your share logic here
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "DocSign", icon: "fa-pen-fancy" },
        ]}
      />

      <div className="max-w-[1400px] mx-auto p-2">
        {/* Header with Upload Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">DocSign</h1>
            <p className="text-gray-600">
              Manage and sign your documents electronically
            </p>
          </div>
          <button
            onClick={handleDocumentUpload}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            Upload Document
          </button>
        </div>

        {/* Documents Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Involved Parties
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                        <p className="text-gray-600">Loading documents...</p>
                      </div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <i className="fa-solid fa-inbox text-gray-400 text-2xl"></i>
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium mb-1">
                            No documents found
                          </p>
                          <p className="text-sm text-gray-500">
                            Upload a document to get started
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <i
                            className={`fa-solid ${
                              doc.metadata?.icon || "fa-file-pdf"
                            } ${
                              doc.metadata?.iconColor || "text-red-500"
                            } text-xl`}
                          ></i>
                          <div>
                            <p className="font-medium text-gray-900">
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {doc.fileSize} •{" "}
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          {doc.involvedParties.map((party, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">
                                  {party.name.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm text-gray-900">
                                  {party.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {party.role}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <p className="text-sm text-gray-900">
                          {doc.dueDate
                            ? new Date(doc.dueDate).toLocaleDateString()
                            : "N/A"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {doc.status === "Action Required" &&
                            doc.uploadedBy !== user?.id && (
                              <button
                                onClick={() => handleSignNow(doc)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                              >
                                Sign Now
                              </button>
                            )}
                          {doc.status === "Completed" && (
                            <>
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="Download"
                              >
                                <i className="fa-solid fa-download"></i>
                              </button>
                              <button
                                onClick={() => handleViewDocument(doc)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                title="View"
                              >
                                <i className="fa-solid fa-eye"></i>
                              </button>
                            </>
                          )}
                          <div className="relative">
                            <button
                              onClick={() => handleDocumentMenuToggle(doc.id)}
                              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                              title="More options"
                            >
                              <i className="fa-solid fa-ellipsis-vertical"></i>
                            </button>

                            {/* Dropdown Menu */}
                            {documentMenuOpen === doc.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => handleViewDocument(doc)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <i className="fa-solid fa-eye w-4"></i>
                                    View Document
                                  </button>
                                  <button
                                    onClick={() => handleDownloadDocument(doc)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <i className="fa-solid fa-download w-4"></i>
                                    Download
                                  </button>
                                  <button
                                    onClick={() => handleShareDocument(doc)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <i className="fa-solid fa-share-nodes w-4"></i>
                                    Share
                                  </button>
                                  <hr className="my-1 border-gray-200" />
                                  <button
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <i className="fa-solid fa-trash w-4"></i>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {documents.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600">
                Showing 1-{documents.length} of {documents.length} documents
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded font-medium text-sm">
                  1
                </button>
                <button className="p-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signature Interface Modal */}
      {signatureModal && (
        <div className="fixed inset-0 bg-white dark:bg-[#0d1218] z-50 flex flex-col">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1f2e]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSignatureModal(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <i className="fa-solid fa-arrow-left text-gray-700 dark:text-gray-300"></i>
              </button>
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-file-pdf text-red-500 text-xl"></i>
                <span className="font-medium text-gray-900 dark:text-white">
                  {signatureModal.name}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Recipients Section */}
              <div className="flex items-center gap-2 mr-4">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                  <input
                    type="text"
                    placeholder="Name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-40 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddRecipient}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  >
                    <i className="fa-solid fa-plus"></i>
                  </button>
                </div>
                {recipients.length > 0 && (
                  <div className="flex items-center gap-1">
                    {recipients.slice(0, 3).map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-sm"
                      >
                        <span className="text-blue-800 dark:text-blue-200">
                          {recipient.name}
                        </span>
                        <button
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                        >
                          <i className="fa-solid fa-times text-xs"></i>
                        </button>
                      </div>
                    ))}
                    {recipients.length > 3 && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        +{recipients.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSignatureModal(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySignature}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Sign
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Document Canvas Area */}
            <div className="flex-1 bg-gray-100 dark:bg-[#0d1218] p-8 overflow-auto relative">
              {/* Document Preview */}
              <div className="max-w-4xl mx-auto bg-white dark:bg-white rounded-lg shadow-2xl relative">
                {/* Display the actual uploaded PDF */}
                {signatureModal.fileURL ? (
                  <div className="w-full min-h-[1056px] bg-gray-200">
                    <embed
                      ref={pdfIframeRef}
                      src={`${signatureModal.fileURL}#toolbar=1&navpanes=0&scrollbar=1&page=${currentPage}`}
                      type="application/pdf"
                      className="w-full h-[1056px]"
                      title={signatureModal.name}
                    />
                  </div>
                ) : (
                  /* Fallback message if no file URL */
                  <div className="p-12 text-center text-gray-500 min-h-[1056px] flex items-center justify-center">
                    <div>
                      <i className="fa-solid fa-file-pdf text-6xl mb-4 text-gray-300"></i>
                      <p className="text-lg">Document preview not available</p>
                    </div>
                  </div>
                )}

                {/* Placed Signatures (Multiple, Draggable) */}
                {placedSignatures.map((signature) => (
                  <div
                    key={signature.id}
                    className={`absolute ${
                      isSigned
                        ? "" // No border when signed
                        : signature.type === "recipient"
                        ? "border-2 border-purple-500 bg-purple-50/50 cursor-move group hover:border-purple-600 transition-colors"
                        : "border-2 border-blue-500 bg-blue-50/50 cursor-move group hover:border-blue-600 transition-colors"
                    }`}
                    style={{
                      top: `${signature.position.y}px`,
                      left: `${signature.position.x}px`,
                      width: `${signature.size.width}px`,
                      height: `${signature.size.height}px`,
                    }}
                    onMouseDown={(e) =>
                      !isSigned && handleSignatureMouseDown(e, signature.id)
                    }
                  >
                    {/* Display signature based on type */}
                    {signature.type === "image" ? (
                      <img
                        src={signature.data}
                        alt="Signature"
                        className="w-full h-full object-contain p-1 pointer-events-none"
                      />
                    ) : signature.type === "text" ? (
                      <div className="w-full h-full flex items-center justify-center p-2 pointer-events-none">
                        <span className={`text-2xl ${signature.data.font}`}>
                          {signature.data.text}
                        </span>
                      </div>
                    ) : signature.type === "recipient" ? (
                      <div className="w-full h-full flex flex-col justify-center p-2 pointer-events-none bg-purple-50 dark:bg-purple-900/20">
                        <div className="text-xs text-purple-600 dark:text-purple-300 font-semibold">
                          SIGN HERE
                        </div>
                        <div className="text-sm text-purple-800 dark:text-purple-200 font-medium">
                          {signature.data.name}
                        </div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">
                          {signature.data.email}
                        </div>
                      </div>
                    ) : null}

                    {/* Delete button - only show if not signed */}
                    {!isSigned && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSignature(signature.id);
                        }}
                        className="delete-button absolute -top-3 -right-3 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <i className="fa-solid fa-times text-xs"></i>
                      </button>
                    )}

                    {/* Resize handles - only show if not signed */}
                    {!isSigned && (
                      <div className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar - Signature Tools */}
            {!isSigned && (
              <div className="w-[360px] bg-white dark:bg-[#1a1f2e] border-l border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setSignatureTab("draw")}
                    className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                      signatureTab === "draw"
                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => setSignatureTab("type")}
                    className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                      signatureTab === "type"
                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    Type
                  </button>
                  <button
                    onClick={() => setSignatureTab("upload")}
                    className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
                      signatureTab === "upload"
                        ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    Upload
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {signatureTab === "draw" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Draw your signature
                        </label>
                        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white">
                          <canvas
                            ref={canvasRef}
                            width={300}
                            height={192}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            className="w-full h-48 cursor-crosshair touch-none"
                          />
                          {!drawnSignature && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <i className="fa-solid fa-signature text-gray-300 text-4xl"></i>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ink color
                        </label>
                        <div className="flex gap-2">
                          {["#111418", "#000080", "#b22222"].map((color) => (
                            <button
                              key={color}
                              onClick={() => setInkColor(color)}
                              className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                inkColor === color
                                  ? "border-blue-500 scale-110"
                                  : "border-gray-300 dark:border-gray-600"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          By selecting Create, I agree that the signature and
                          initials will be the electronic representation of my
                          signature and initials for all purposes when I use
                          them on documents.
                        </p>
                      </div>
                    </div>
                  )}

                  {signatureTab === "type" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Type your signature
                        </label>
                        <input
                          type="text"
                          value={typedSignature}
                          onChange={(e) => setTypedSignature(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Choose a font
                        </label>
                        <div className="space-y-2">
                          {[
                            {
                              name: "Script",
                              class: "font-['Brush_Script_MT']",
                              label: "Brush Script",
                            },
                            {
                              name: "Elegant",
                              class: "font-['Lucida_Handwriting']",
                              label: "Lucida Handwriting",
                            },
                            {
                              name: "Classic",
                              class: "font-['Edwardian_Script_ITC']",
                              label: "Edwardian Script",
                            },
                          ].map((font) => (
                            <button
                              key={font.name}
                              onClick={() => setSignatureFont(font.class)}
                              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                                signatureFont === font.class
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                              }`}
                            >
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                {font.label}
                              </p>
                              <p className={`text-2xl ${font.class}`}>
                                {typedSignature || "Your Name"}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {signatureTab === "upload" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Upload signature image
                        </label>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          onChange={handleSignatureFileSelect}
                          className="hidden"
                        />

                        <div
                          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-600 transition-colors cursor-pointer"
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onClick={triggerFileInput}
                        >
                          {uploadedSignature ? (
                            <div className="space-y-3">
                              <img
                                src={uploadedSignature}
                                alt="Uploaded signature"
                                className="max-h-32 mx-auto"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadedSignature(null);
                                }}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <i className="fa-solid fa-cloud-arrow-up text-gray-400 text-4xl mb-3"></i>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                Drag and drop or click to upload
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                PNG or JPG (max 5MB)
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Make sure your uploaded signature has a transparent
                          background for the best results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button
                    onClick={handleCreateSignature}
                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Add
                  </button>
                  <button
                    onClick={handleClearSignature}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Clear
                  </button>
                  <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Use saved signature
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocSign;
