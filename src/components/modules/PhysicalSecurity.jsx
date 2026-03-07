import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import Breadcrumb from "../Breadcrumb";
import { apiService } from "../../services/api";

const PhysicalSecurity = () => {
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString(),
  );

  const [cameras, setCameras] = useState([]);
  const [logs, setLogs] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Configuration Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [newCameraName, setNewCameraName] = useState("");
  const [newCameraStatus, setNewCameraStatus] = useState("online");

  // Visitor QR Code Modal State
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [visitorPass, setVisitorPass] = useState(null);
  const [generatingPass, setGeneratingPass] = useState(false);

  // Fetch all physical security data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [camerasRes, logsRes, personnelRes] = await Promise.all([
        apiService.get("/api/physical-security/cameras"),
        apiService.get("/api/physical-security/logs"),
        apiService.get("/api/physical-security/personnel"),
      ]);
      setCameras(camerasRes.data);
      setLogs(logsRes.data);
      setPersonnel(personnelRes.data);
    } catch (error) {
      console.error("Failed to fetch physical security data:", error);
      toast.error("Failed to load security data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTriggerAlarm = () => {
    toast.error("Facility Wide Alarm Triggered! Notifying authorities...", {
      duration: 5000,
      icon: "🚨",
    });
  };

  const handleRegisterVisitor = async () => {
    setGeneratingPass(true);
    setIsVisitorModalOpen(true);
    setVisitorPass(null);
    try {
      const res = await apiService.post(
        "/api/physical-security/visitor-passes",
        {
          createdBy: "Security Officer",
        },
      );
      setVisitorPass(res.data || res);
    } catch (err) {
      console.error("Failed to generate visitor pass:", err);
      toast.error("Failed to generate visitor pass");
      setIsVisitorModalOpen(false);
    } finally {
      setGeneratingPass(false);
    }
  };

  const getVisitorSignInUrl = (token) => {
    const origin = window.location.origin;
    return `${origin}/visitor/${token}`;
  };

  const handleConfigureFeeds = () => {
    setIsConfigModalOpen(true);
  };

  const handleAddCamera = async (e) => {
    e.preventDefault();
    if (!newCameraName.trim()) {
      return toast.error("Camera name is required");
    }

    try {
      await apiService.post("/api/physical-security/cameras", {
        name: newCameraName,
        status: newCameraStatus,
        lastMotion: "No activity",
      });
      toast.success("Camera feed configured successfully!");
      setIsConfigModalOpen(false);
      setNewCameraName("");
      setNewCameraStatus("online");
      fetchData(); // Reload cameras
    } catch (error) {
      console.error(error);
      toast.error("Failed to add camera feed");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Security", icon: "fa-shield-halved" },
        ]}
      />
      <div className="py-8 flex-1">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-4">
          {/* Header Section */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-inter text-gray-900 tracking-tight">
                Security Hub
              </h1>
              <p className="mt-1 text-sm text-gray-500 font-inter">
                Live monitoring, visitor management, and physical perimeter
                control.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={handleConfigureFeeds}
                className="text-xs text-blue-600 font-medium hover:text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200"
              >
                <i className="fa-solid fa-gear mr-1"></i>
                Configure Feeds
              </button>
              <div className="flex items-center gap-2 border-l border-r border-gray-200 px-4">
                <i className="fa-solid fa-clock text-blue-600"></i>
                <span className="font-mono font-medium text-gray-800">
                  {currentTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-gray-600">
                  System Normal
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={handleRegisterVisitor}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                <i className="fa-solid fa-user-plus text-blue-600 text-lg"></i>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                New Visitor
              </span>
            </button>

            <button className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                <i className="fa-solid fa-id-card-clip text-purple-600 text-lg"></i>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                Issue Badge
              </span>
            </button>

            <button className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-400 hover:shadow-md transition-all group">
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors">
                <i className="fa-solid fa-shield-halved text-emerald-600 text-lg"></i>
              </div>
              <span className="text-sm font-semibold text-gray-800">
                Dispatch Guard
              </span>
            </button>

            <button
              onClick={handleTriggerAlarm}
              className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 hover:border-red-400 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-red-100 transition-colors">
                <i className="fa-solid fa-bell text-red-600 text-lg"></i>
              </div>
              <span className="text-sm font-semibold text-red-600">
                Trigger Alarm
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main CCTV Feed Grid (Takes up 2 columns on large screens) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-900 font-inter">
                    <i className="fa-solid fa-video text-gray-400 mr-2"></i>
                    Live Camera Feeds
                  </h3>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {
                        (cameras || []).filter((c) => c.status === "online")
                          .length
                      }{" "}
                      Online
                    </span>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      {
                        (cameras || []).filter((c) => c.status === "offline")
                          .length
                      }{" "}
                      Offline
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-neutral-900 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[400px]">
                  {isLoading ? (
                    <div className="col-span-full flex justify-center items-center text-white space-x-2">
                      <i className="fa-solid fa-circle-notch fa-spin text-4xl"></i>
                    </div>
                  ) : (cameras || []).length === 0 ? (
                    <div className="col-span-full flex flex-col justify-center items-center text-neutral-500 bg-neutral-800 rounded-lg border border-neutral-700">
                      <i className="fa-solid fa-video-slash text-4xl mb-3"></i>
                      <p>No camera feeds configured.</p>
                    </div>
                  ) : (
                    (cameras || []).map((camera) => (
                      <div
                        key={camera._id}
                        className="relative group rounded-lg overflow-hidden bg-neutral-800 aspect-video border border-neutral-700"
                      >
                        {/* Mock Camera Feed Background */}
                        <div
                          className={`absolute inset-0 opacity-20 ${camera.status === "online" ? "bg-blue-400" : "bg-red-900"} mix-blend-overlay`}
                        ></div>

                        {/* TV Static / Placeholder pattern for texture */}
                        {camera.status === "online" ? (
                          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500">
                            <i className="fa-solid fa-video-slash text-3xl mb-2"></i>
                            <span className="text-xs font-mono uppercase tracking-wider">
                              No Signal
                            </span>
                          </div>
                        )}

                        {/* Camera Feed Overlay Info */}
                        <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${camera.status === "online" ? "bg-red-500 animate-pulse" : "bg-neutral-600"}`}
                            ></span>
                            <span className="text-white text-xs font-mono font-medium drop-shadow-md">
                              CAM-
                              {camera._id
                                .substring(camera._id.length - 4)
                                .toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white text-xs font-mono drop-shadow-md bg-black/40 px-1.5 py-0.5 rounded">
                            {currentTime}
                          </span>
                        </div>

                        {/* Bottom Status overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                          <span className="text-gray-200 text-sm font-medium drop-shadow-md truncate pr-2">
                            {camera.name}
                          </span>
                          {camera.status === "online" && camera.lastMotion && (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-blue-300 font-mono uppercase">
                                Last Motion:
                              </span>
                              <span className="text-xs font-mono text-white">
                                {camera.lastMotion}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Section (Takes up 1 column on large screens) */}
            <div className="space-y-6">
              {/* Active Personnel */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                  <h3 className="text-lg font-bold text-gray-900 font-inter">
                    <i className="fa-solid fa-user-shield text-gray-400 mr-2"></i>
                    On Duty Personnel
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <i className="fa-solid fa-spinner fa-spin text-gray-400 text-2xl"></i>
                    </div>
                  ) : (personnel || []).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No personnel currently listed on duty.
                    </p>
                  ) : (
                    (personnel || []).map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              p.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}`
                            }
                            className="w-10 h-10 rounded-full"
                            alt="Guard"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.role} {p.shift ? `• ${p.shift}` : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                          title="Contact"
                        >
                          <i className="fa-solid fa-phone"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col max-h-[400px]">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50 shrink-0">
                  <h3 className="text-lg font-bold text-gray-900 font-inter">
                    <i className="fa-solid fa-list-ul text-gray-400 mr-2"></i>
                    Activity Log
                  </h3>
                </div>
                <div className="p-0 overflow-y-auto flex-1">
                  {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                      <i className="fa-solid fa-circle-notch fa-spin text-gray-400 text-2xl"></i>
                    </div>
                  ) : (logs || []).length === 0 ? (
                    <div className="flex justify-center items-center h-48">
                      <p className="text-gray-500 text-sm">
                        No recent activity detected.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {(logs || []).map((log) => (
                        <li
                          key={log._id}
                          className="p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block w-2 h-2 rounded-full ${
                                  log.severity === "error"
                                    ? "bg-red-500"
                                    : log.severity === "warning"
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                }`}
                              ></span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                {log.type}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 font-mono">
                              {log.time}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 ml-4 font-medium leading-relaxed">
                            {log.details}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-center shrink-0">
                  <button className="text-sm text-blue-600 font-medium hover:text-blue-700">
                    View Full Audit Trap
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Modal */}
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 font-inter">
                  <i className="fa-solid fa-gear text-gray-400 mr-2"></i>
                  Configure Camera Feed
                </h3>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <form
                onSubmit={handleAddCamera}
                className="p-6 space-y-4 text-left"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Camera Name / Location
                  </label>
                  <input
                    type="text"
                    value={newCameraName}
                    onChange={(e) => setNewCameraName(e.target.value)}
                    placeholder="e.g. Front Entrance"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newCameraStatus}
                    onChange={(e) => setNewCameraStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline / Maintenance</option>
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-blue-500/20"
                  >
                    <i className="fa-solid fa-plus mr-2"></i>
                    Add Feed
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Visitor QR Code Modal */}
        {isVisitorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-lg font-bold text-gray-900 font-inter">
                  <i className="fa-solid fa-qrcode text-blue-500 mr-2"></i>
                  Visitor Pass QR Code
                </h3>
                <button
                  onClick={() => {
                    setIsVisitorModalOpen(false);
                    setVisitorPass(null);
                    fetchData();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              <div className="p-6">
                {generatingPass ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <i className="fa-solid fa-spinner fa-spin text-blue-500 text-3xl mb-4"></i>
                    <p className="text-gray-500 text-sm">
                      Generating visitor pass...
                    </p>
                  </div>
                ) : visitorPass ? (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-gray-500 mb-4 text-center">
                      Have the visitor scan this QR code to fill out their
                      sign-in details.
                    </p>

                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 mb-4">
                      <QRCodeSVG
                        value={getVisitorSignInUrl(visitorPass.token)}
                        size={220}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    {/* Link display */}
                    <div className="w-full bg-gray-50 rounded-lg border border-gray-200 p-3 mb-4">
                      <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">
                        Sign-in Link
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-700 font-mono truncate flex-1">
                          {getVisitorSignInUrl(visitorPass.token)}
                        </p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              getVisitorSignInUrl(visitorPass.token),
                            );
                            toast.success("Link copied to clipboard");
                          }}
                          className="shrink-0 p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Copy link"
                        >
                          <i className="fa-solid fa-copy text-sm"></i>
                        </button>
                      </div>
                    </div>

                    {/* Pass info */}
                    <div className="w-full grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-500 font-medium">
                          Status
                        </p>
                        <p className="text-blue-700 font-semibold capitalize">
                          {visitorPass.status}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-xs text-orange-500 font-medium">
                          Expires
                        </p>
                        <p className="text-orange-700 font-semibold">
                          24 hours
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mt-4 text-center">
                      This pass will expire in 24 hours. A new QR code can be
                      generated at any time.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fa-solid fa-triangle-exclamation text-2xl text-red-400 mb-3"></i>
                    <p className="text-sm">
                      Failed to generate pass. Please try again.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button
                  onClick={() => {
                    setIsVisitorModalOpen(false);
                    setVisitorPass(null);
                    fetchData();
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhysicalSecurity;
