import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { apiService } from "../../services/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/useAuth";
import ModuleLoader from "../common/ModuleLoader";
import Breadcrumb from "../Breadcrumb";

const DocSignView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Document details states
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myRecipient, setMyRecipient] = useState(null);

  // Sign fields state (copies of fields in DB)
  const [filledFields, setFilledFields] = useState([]);
  
  // Signature capture modal states
  const [showSignModal, setShowSignModal] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState(null);
  const [signatureType, setSignatureType] = useState("draw"); // 'draw' or 'type'
  const [typedName, setTypedName] = useState("");
  const [typedFont, setTypedFont] = useState("font-serif");

  // Canvas drawing states
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please login to sign this document");
      navigate(`/?redirect=${encodeURIComponent(location.pathname)}`);
    }
  }, [user, authLoading, navigate, location]);

  // Load document
  useEffect(() => {
    if (!id || !user) return;

    const loadDoc = async () => {
      try {
        setLoading(true);
        const doc = await apiService.documents.getById(id);
        setDocument(doc);
        setFilledFields(doc.fields || []);

        // Find current user in recipients
        const actorEmail = String(user?.email || "").trim().toLowerCase();
        const recipient = (doc.recipients || []).find(
          (r) => String(r.email || "").trim().toLowerCase() === actorEmail
        );
        setMyRecipient(recipient || null);

        if (!recipient) {
          toast.error("You are not registered as a recipient/signer for this document");
        }
      } catch (err) {
        console.error("Error loading document:", err);
        toast.error("Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [id, user]);

  // Signature Canvas Mouse handlers
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse and touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#1e3a8a"; // Navy signature ink
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Open Signature Pad for a specific field
  const handleOpenSignModal = (fieldId) => {
    if (document.status === "Completed") return;
    setActiveFieldId(fieldId);
    setTypedName(user?.name || user?.fullName || "");
    setShowSignModal(true);
  };

  // Complete signature capture
  const saveSignature = () => {
    let signatureData = "";

    if (signatureType === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Check if canvas is empty
      const buffer = new Uint32Array(
        canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data.buffer
      );
      const isCanvasEmpty = !buffer.some((color) => color !== 0);

      if (isCanvasEmpty) {
        toast.error("Please draw a signature first");
        return;
      }
      signatureData = canvas.toDataURL("image/png");
    } else {
      if (!typedName.trim()) {
        toast.error("Please type your name");
        return;
      }
      // Convert typed name to a structured data representation
      signatureData = JSON.stringify({ name: typedName, font: typedFont });
    }

    // Update locally filled fields
    setFilledFields((prev) =>
      prev.map((f) =>
        f.id === activeFieldId
          ? { ...f, value: signatureData, isTyped: signatureType === "type" }
          : f
      )
    );

    setShowSignModal(false);
    setActiveFieldId(null);
    toast.success("Signature captured!");
  };

  // Handle textbox or date input directly
  const handleFieldChange = (fieldId, value) => {
    setFilledFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, value } : f))
    );
  };

  // Validate and submit signature
  const handleSubmitSignature = async () => {
    if (!myRecipient) {
      toast.error("You are not authorized to sign this document.");
      return;
    }

    // Check if user has filled all required fields assigned to them
    const myRequiredFields = filledFields.filter(
      (f) => f.assignedTo === myRecipient.id && f.required
    );
    const missingFields = myRequiredFields.filter((f) => !f.value);

    if (missingFields.length > 0) {
      toast.error(`Please fill all required fields (${missingFields.length} remaining)`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Save all fields with their current values via PATCH
      await apiService.documents.update(id, { fields: filledFields });

      // 2. Perform the sign action
      const mySignatureField = filledFields.find(
        (f) => f.assignedTo === myRecipient.id && (f.type === "signature" || f.type === "initials")
      );

      const signPayload = {
        signatures: [
          {
            id: myRecipient.id,
            type: mySignatureField?.isTyped ? "text" : "image",
            data: mySignatureField?.value || user?.fullName || "Signed",
            position: mySignatureField?.position || { x: 50, y: 80 },
            size: mySignatureField?.size || { width: 180, height: 50 },
          },
        ],
      };

      await apiService.documents.sign(id, signPayload);

      toast.success("Document signed successfully!");
      
      // Navigate back to DocSign dashboard after delay
      setTimeout(() => {
        navigate("/home/9"); // Route for DocSign module in Home page
      }, 1500);
    } catch (error) {
      console.error("Error submitting signatures:", error);
      toast.error("Failed to submit signatures. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Pre-fill Date fields assigned to user
  useEffect(() => {
    if (!myRecipient || filledFields.length === 0) return;
    
    // Automatically fill current date for date fields assigned to current user
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    setFilledFields((prev) =>
      prev.map((f) =>
        f.assignedTo === myRecipient.id && f.type === "dateSigned" && !f.value
          ? { ...f, value: dateStr }
          : f
      )
    );
  }, [myRecipient, loading, filledFields.length]);

  if (loading || authLoading) {
    return <ModuleLoader moduleName="Signing Portal" subtitle="Loading document..." />;
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <i className="fa-solid fa-exclamation-triangle text-5xl text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Document Not Found</h2>
        <p className="text-gray-600 mb-6">The document you are trying to view does not exist or you do not have permission.</p>
        <button
          onClick={() => navigate("/home")}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go back to Home
        </button>
      </div>
    );
  }

  // Count signed vs unsigned fields for stats
  const assignedFields = filledFields.filter((f) => f.assignedTo === myRecipient?.id);
  const signedCount = assignedFields.filter((f) => f.value).length;
  const isFinished = assignedFields.length === signedCount;

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col font-sans">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "DocSign", href: "/home/9", icon: "fa-pen-fancy" },
          { label: "Review & Sign", icon: "fa-signature" },
        ]}
      />

      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <i className="fa-solid fa-file-contract text-blue-600" />
            {document.name}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Sent by <span className="font-semibold text-gray-800">{document.uploadedByName}</span> • Status:{" "}
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                document.status === "Completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-orange-100 text-orange-700 animate-pulse"
              }`}
            >
              {document.status}
            </span>
          </p>
        </div>

        {document.status !== "Completed" && myRecipient && (
          <button
            onClick={handleSubmitSignature}
            disabled={submitting || !isFinished}
            className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" />
                Submitting...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check-circle" />
                Finish Signing ({signedCount}/{assignedFields.length} Filled)
              </>
            )}
          </button>
        )}
      </header>

      {/* Body Viewport */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row gap-6 p-4 md:p-6 overflow-hidden">
        {/* Left Side: Summary & Actions */}
        <aside className="w-full lg:w-80 shrink-0 bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-fit flex flex-col gap-5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 border-b border-gray-100 pb-2">
              Signing Progress
            </h3>
            {myRecipient ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-gray-600">Your Action Fields:</span>
                  <span className="text-blue-600">
                    {signedCount} / {assignedFields.length}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${assignedFields.length > 0 ? (signedCount / assignedFields.length) * 100 : 0}%`,
                    }}
                    className="bg-blue-600 h-full transition-all duration-300"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg font-medium">
                You are viewing this document in Read-Only mode.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-100 pb-2">
              Recipients
            </h3>
            <div className="flex flex-col gap-3">
              {(document.recipients || []).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-gray-50 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {rec.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{rec.email}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rec.status === "signed"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rec.status === "signed" ? "Signed" : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Side: Document rendering with fields overlay */}
        <section className="flex-1 bg-gray-800 rounded-xl border border-gray-700 shadow-inner flex flex-col justify-start items-center p-4 md:p-8 overflow-y-auto max-h-[calc(100vh-180px)] min-h-[500px]">
          <div className="relative bg-white shadow-2xl rounded overflow-hidden">
            {/* The PDF Preview */}
            {document.fileURL ? (
              <iframe
                src={document.fileURL}
                className="w-[800px] h-[1100px] bg-white border-0 z-0 pointer-events-auto"
                title="Document View"
              />
            ) : (
              <div className="w-[800px] h-[1100px] bg-white flex items-center justify-center">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-gray-400" />
              </div>
            )}

            {/* Document Overlay of interactive fields */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              {filledFields.map((field) => {
                const isMine = myRecipient && field.assignedTo === myRecipient.id;
                const isSigned = !!field.value;
                
                // Color formatting
                let borderStyle = "border-dashed border-gray-400 text-gray-400 bg-gray-50/70";
                if (isMine) {
                  borderStyle = isSigned
                    ? "border-solid border-green-500 text-green-700 bg-green-50/80 font-bold"
                    : "border-solid border-blue-500 text-blue-700 bg-blue-50/80 hover:bg-blue-100 font-semibold animate-pulse";
                } else if (isSigned) {
                  borderStyle = "border-solid border-gray-400 text-gray-600 bg-gray-100/80";
                }

                return (
                  <div
                    key={field.id}
                    style={{
                      position: "absolute",
                      left: `${field.position.x}%`,
                      top: `${field.position.y}%`,
                      width: `${field.size.width}px`,
                      height: `${field.size.height}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={`rounded shadow-sm flex items-center justify-center p-1 cursor-pointer transition-all border-2 text-xs pointer-events-auto ${borderStyle}`}
                    onClick={() => {
                      if (!isMine || document.status === "Completed") return;
                      if (field.type === "signature" || field.type === "initials") {
                        handleOpenSignModal(field.id);
                      }
                    }}
                  >
                    {/* Render field status or input */}
                    {field.type === "signature" || field.type === "initials" ? (
                      field.value ? (
                        field.isTyped ? (
                          <span
                            className={`text-base font-serif italic text-blue-900 leading-none`}
                            style={{
                              fontFamily:
                                JSON.parse(field.value).font === "font-serif"
                                  ? "Georgia, serif"
                                  : "cursive",
                            }}
                          >
                            {JSON.parse(field.value).name}
                          </span>
                        ) : (
                          <img
                            src={field.value}
                            alt="Signature"
                            className="max-h-full max-w-full object-contain"
                          />
                        )
                      ) : (
                        <div className="flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                          <i className="fa-solid fa-signature" />
                          {field.required ? `${field.label} *` : field.label}
                        </div>
                      )
                    ) : field.type === "dateSigned" ? (
                      <span>{field.value || "Date Signed"}</span>
                    ) : field.type === "textbox" ? (
                      isMine ? (
                        <input
                          type="text"
                          value={field.value || ""}
                          placeholder={field.required ? "Enter text *" : "Enter text"}
                          className="w-full h-full bg-transparent border-0 text-center focus:ring-0 focus:outline-none placeholder-gray-400 text-xs px-2"
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                      ) : (
                        <span>{field.value || "Text Field"}</span>
                      )
                    ) : field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={!!field.value}
                        disabled={!isMine}
                        onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                        className="rounded text-blue-600 border-gray-300 focus:ring-blue-500 h-4 w-4"
                      />
                    ) : (
                      <span>{field.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Signature Capture Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-signature text-xl" />
                <h2 className="text-lg font-bold">Adopt Signature</h2>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-times text-lg" />
              </button>
            </div>

            {/* Selector tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              <button
                onClick={() => setSignatureType("draw")}
                className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
                  signatureType === "draw"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className="fa-solid fa-pencil mr-1.5" /> Draw Signature
              </button>
              <button
                onClick={() => setSignatureType("type")}
                className={`flex-1 py-3 text-center text-sm font-semibold border-b-2 transition-all ${
                  signatureType === "type"
                    ? "border-blue-600 text-blue-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <i className="fa-solid fa-keyboard mr-1.5" /> Type Name
              </button>
            </div>

            {/* Drawing/Typing Body */}
            <div className="p-6 bg-white flex-1 flex flex-col items-center">
              {signatureType === "draw" ? (
                <div className="w-full flex flex-col items-center">
                  <p className="text-xs text-gray-500 mb-2">Draw your signature inside the box below:</p>
                  <div className="w-full aspect-[4/2] border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden relative group">
                    <canvas
                      ref={canvasRef}
                      width={450}
                      height={225}
                      className="w-full h-full cursor-crosshair relative z-10 touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <button
                      onClick={clearCanvas}
                      className="absolute right-3 bottom-3 z-20 px-3 py-1 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border border-gray-200 hover:border-red-200 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    >
                      Clear Canvas
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Type Your Full Name:
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg h-10 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="e.g. John Doe"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Choose Font Style:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setTypedFont("font-serif")}
                        className={`p-3 border-2 rounded-lg text-center font-serif italic text-lg transition-all ${
                          typedFont === "font-serif"
                            ? "border-blue-600 bg-blue-50/50 text-blue-800"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {typedName || "Serif Signature"}
                      </button>
                      <button
                        onClick={() => setTypedFont("font-cursive")}
                        className={`p-3 border-2 rounded-lg text-center text-lg transition-all ${
                          typedFont === "font-cursive"
                            ? "border-blue-600 bg-blue-50/50 text-blue-800 font-bold"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                        style={{ fontFamily: "cursive" }}
                      >
                        {typedName || "Cursive Signature"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm shadow-blue-500/10"
              >
                Adopt &amp; Place
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocSignView;
