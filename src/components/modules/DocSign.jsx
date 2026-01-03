import React, { useState, useRef, useEffect } from "react";
import Navbar from "../Navbar";
import Breadcrumb from "../Breadcrumb";

const DocSign = () => {
  // Signature state
  const [signatureTab, setSignatureTab] = useState("draw");
  const [showSignaturePopover, setShowSignaturePopover] = useState(false);
  const [currentSignature, setCurrentSignature] = useState(null);
  const [typedSignature, setTypedSignature] = useState("");
  const [uploadedSignature, setUploadedSignature] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Canvas ref for drawing
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Drawing functions
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = "#137fec";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSignature(event.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("File must be less than 5MB");
    }
  };

  const adoptSignature = () => {
    if (signatureTab === "type" && typedSignature) {
      setCurrentSignature(typedSignature);
    } else if (signatureTab === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        const dataUrl = canvas.toDataURL();
        setCurrentSignature(dataUrl);
      }
    } else if (signatureTab === "upload" && uploadedSignature) {
      setCurrentSignature(uploadedSignature);
    }
    setShowSignaturePopover(false);
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && signatureTab === "draw") {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [signatureTab]);

  return (
    <div className="w-full p-3 min-h-screen bg-white flex flex-col">
      <Navbar />
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Document Signing", icon: "fa-pen-fancy" },
        ]}
      />

      {/* Top Navigation & Context Header */}
      <header className="flex-none bg-white border-b border-[#f0f2f4] z-30 shadow-sm">
        {/* Top Row: Logo & Utilities */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-[#137fec]">
              <i className="fa-solid fa-file-signature"></i>
            </div>
            <h2 className="text-lg font-bold tracking-tight">DocuSignify</h2>
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
          </div>
        </div>

        {/* Second Row: Context & Progress */}
        <div className="px-6 py-4 bg-gray-50 border-t border-[#f0f2f4] flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold leading-tight">Review and Sign</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <span className="font-medium text-gray-900">John Doe</span> has
              requested your signature.
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
                This Master Service Agreement ("Agreement") is entered into as
                of the date of last signature below ("Effective Date") by and
                between Acme Corp ("Provider") and the undersigned client
                ("Client").
              </p>

              <p className="font-bold mt-8 mb-2">1. SERVICES PROVIDED</p>
              <p>
                Provider agrees to perform the services described in the
                attached Statement of Work ("SOW"). All services shall be
                performed in a professional manner in accordance with industry
                standards. Provider shall assign qualified personnel to perform
                such services.
              </p>

              <p className="font-bold mt-8 mb-2">2. COMPENSATION</p>
              <p>
                Client agrees to pay Provider the fees set forth in the SOW.
                Payment terms are Net 30 days from the date of invoice. Late
                payments shall incur interest at the rate of 1.5% per month or
                the maximum rate permitted by law, whichever is less.
              </p>

              <p className="font-bold mt-8 mb-2">3. CONFIDENTIALITY</p>
              <p>
                Each party acknowledges that it may have access to certain
                confidential information of the other party. "Confidential
                Information" means all information identified as confidential or
                that should reasonably be understood to be confidential given
                the nature of the information and the circumstances of
                disclosure.
              </p>

              {/* Signature Section */}
              <div className="mt-16 pt-8 border-t-2 border-black flex justify-between gap-12">
                <div className="w-1/2">
                  <p className="font-bold mb-8">Provider Signature:</p>
                  {/* Pre-filled signature (Sender) */}
                  <div className="h-16 border-b border-black relative">
                    <span
                      className="text-3xl absolute bottom-1 left-0 opacity-80 text-blue-900"
                      style={{ fontFamily: "'Dancing Script', cursive" }}
                    >
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
                      typeof currentSignature === "string" &&
                      currentSignature.startsWith("data:image") ? (
                        <img
                          src={currentSignature}
                          alt="Signature"
                          className="h-12 object-contain"
                        />
                      ) : (
                        <span
                          className="text-3xl text-blue-900"
                          style={{ fontFamily: "'Dancing Script', cursive" }}
                        >
                          {currentSignature}
                        </span>
                      )
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
                    01/03/2026
                  </div>
                </div>
                <div className="w-1/3 relative">
                  <p className="font-bold mb-4">Initials:</p>
                  {/* Example of a completed field */}
                  <div className="h-10 border-b border-black relative flex items-center px-2">
                    <span
                      className="text-xl text-blue-800"
                      style={{ fontFamily: "'Dancing Script', cursive" }}
                    >
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
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      width={300}
                      height={128}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="border-2 border-dashed border-gray-200 rounded-lg bg-white cursor-crosshair w-full"
                    />
                    <button
                      onClick={clearCanvas}
                      className="absolute bottom-2 right-2 text-xs text-gray-400 hover:text-red-500 bg-white px-2 py-1 rounded"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {signatureTab === "type" && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your name"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-[#137fec] outline-none"
                    />
                    <div className="border-2 border-gray-200 rounded-lg h-20 bg-white flex items-center justify-center">
                      <span
                        className="text-3xl text-blue-900"
                        style={{ fontFamily: "'Dancing Script', cursive" }}
                      >
                        {typedSignature || "Your Name"}
                      </span>
                    </div>
                  </div>
                )}

                {signatureTab === "upload" && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg h-32 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-[#137fec] transition-colors"
                  >
                    {uploadedSignature ? (
                      <img
                        src={uploadedSignature}
                        alt="Uploaded signature"
                        className="max-h-28 object-contain"
                      />
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up text-gray-400 text-4xl mb-2"></i>
                        <p className="text-sm text-gray-600 mb-1">
                          Drag and drop or click to upload
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG or JPG (max 5MB)
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={adoptSignature}
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
              By clicking Finish, I agree to be legally bound by this document
              and the DocuSignify Terms of Use.
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
  );
};

export default DocSign;
