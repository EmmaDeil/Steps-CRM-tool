import React, { useState } from "react";

/**
 * Enhanced Audit Log Detail Component
 * Displays audit log information with better organization, visual hierarchy,
 * and interactive metadata display
 */
const AuditLogDetail = ({ log, onClose }) => {
  const [expandedMetadata, setExpandedMetadata] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  if (!log) return null;

  // Helper functions
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relative = "";
    if (diffMins < 1) relative = "Just now";
    else if (diffMins < 60)
      relative = `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    else if (diffHours < 24)
      relative = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    else if (diffDays < 7)
      relative = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    else relative = date.toLocaleDateString();

    return {
      formatted: date.toLocaleString(),
      relative,
      iso: date.toISOString(),
    };
  };

  const parseUserAgent = (uaString) => {
    if (!uaString)
      return { browser: "Unknown", os: "Unknown", version: "Unknown" };

    const getBrowser = () => {
      if (/edg/i.test(uaString)) return "Edge";
      if (/chrome/i.test(uaString)) return "Chrome";
      if (/safari/i.test(uaString) && !/chrome/i.test(uaString))
        return "Safari";
      if (/firefox/i.test(uaString)) return "Firefox";
      if (/opera|opr/i.test(uaString)) return "Opera";
      return "Browser";
    };

    const getOS = () => {
      if (/windows/i.test(uaString)) return "Windows";
      if (/macintosh|mac os/i.test(uaString)) return "macOS";
      if (/linux/i.test(uaString)) return "Linux";
      if (/android/i.test(uaString)) return "Android";
      if (/iphone|ipad/i.test(uaString)) return "iOS";
      return "Unknown";
    };

    const getVersion = () => {
      const match =
        uaString.match(/version\/(\d+)/i) || uaString.match(/chrome\/(\d+)/i);
      return match ? match[1] : "Unknown";
    };

    return {
      browser: getBrowser(),
      os: getOS(),
      version: getVersion(),
      isMobile: /mobile|android|iphone/i.test(uaString),
    };
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getActionIcon = (action) => {
    const iconMap = {
      Login: "fa-sign-in-alt",
      Logout: "fa-sign-out-alt",
      "User Updated": "fa-user-edit",
      "Config Update": "fa-cog",
      "Password Changed": "fa-key",
      "MFA Enabled": "fa-shield-alt",
      "MFA Disabled": "fa-shield-alt",
      "Document Signed": "fa-file-signature",
      "Access Denied": "fa-ban",
      "Session Terminated": "fa-times-circle",
      "Panic Logout": "fa-exclamation-circle",
    };
    return iconMap[action] || "fa-clipboard-list";
  };

  const getStatusIcon = (status) => {
    return status === "Success"
      ? "fa-check-circle text-green-500"
      : "fa-times-circle text-red-500";
  };

  const timestamp = formatTimestamp(log.timestamp);
  const userAgent = parseUserAgent(log.userAgent);
  const actionIcon = getActionIcon(log.action);
  const isSuccess = log.status === "Success";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-xl">
              <i className={`fas ${actionIcon}`}></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Audit Log Detail</h2>
              <p className="text-blue-100 text-sm mt-1">{log.action}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Timestamp Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="text-lg">
                <i className="fas fa-calendar-alt text-blue-600"></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Timestamp</p>
                <p className="text-lg font-bold text-gray-900">
                  {timestamp.formatted}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {timestamp.relative}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(timestamp.iso, "timestamp")}
                className="px-3 py-2 bg-white hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition"
              >
                {copiedField === "timestamp" ? (
                  <>
                    <i className="fas fa-check text-green-500"></i> Copied
                  </>
                ) : (
                  <>
                    <i className="fas fa-copy"></i> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Actor Section */}
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <i className="fas fa-user-circle text-purple-600"></i>
              Information
            </h3>
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
                {log.actor?.initials || "??"}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Name
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {log.actor?.userName || "Unknown"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fas fa-envelope text-gray-400 text-sm"></i>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Email
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {log.actor?.userEmail || "N/A"}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(log.actor?.userEmail || "", "email")
                    }
                    className="p-2 hover:bg-gray-100 rounded transition"
                    title="Copy email"
                  >
                    <i className="fas fa-copy text-gray-400"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action & Status Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <i className="fas fa-bolt text-amber-600"></i>
                Action
              </h3>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 ${log.actionColor === "green" ? "bg-green-100" : log.actionColor === "red" ? "bg-red-100" : "bg-blue-100"} rounded-lg flex items-center justify-center`}
                >
                  <i
                    className={`fas ${actionIcon} ${log.actionColor === "green" ? "text-green-600" : log.actionColor === "red" ? "text-red-600" : "text-blue-600"}`}
                  ></i>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Action Type
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {log.action}
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <i className={`fas ${getStatusIcon(log.status)}`}></i>
                Status
              </h3>
              <div className="flex items-center gap-3">
                <div
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                    isSuccess
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <i
                    className={`fas ${isSuccess ? "fa-check-circle" : "fa-times-circle"}`}
                  ></i>
                  {log.status}
                </div>
              </div>
            </div>
          </div>

          {/* System Information Section */}
          <div className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition">
            <h3 className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <i className="fas fa-network-wired text-cyan-600"></i>
              System Information
            </h3>
            <div className="space-y-4">
              {/* IP Address */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <i className="fas fa-globe text-cyan-600 text-lg"></i>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      IP Address
                    </p>
                    <p className="font-mono text-lg font-semibold text-gray-900">
                      {log.ipAddress || "N/A"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(log.ipAddress || "", "ip")}
                  className="p-2 hover:bg-gray-100 rounded transition"
                  title="Copy IP"
                >
                  {copiedField === "ip" ? (
                    <i className="fas fa-check text-green-500"></i>
                  ) : (
                    <i className="fas fa-copy text-gray-400"></i>
                  )}
                </button>
              </div>

              {/* User Agent Parsed */}
              <div>
                <p className="text-sm font-medium text-gray-600 mb-3">
                  Device Information
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">Browser</p>
                    <div className="flex items-center gap-2 mt-1">
                      <i className="fas fa-browser text-gray-400"></i>
                      <p className="font-semibold text-gray-900">
                        {userAgent.browser}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">OS</p>
                    <div className="flex items-center gap-2 mt-1">
                      <i className="fas fa-desktop text-gray-400"></i>
                      <p className="font-semibold text-gray-900">
                        {userAgent.os}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">Version</p>
                    <p className="font-semibold text-gray-900 mt-1">
                      {userAgent.version}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 font-medium">
                      Device Type
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <i
                        className={`fas ${userAgent.isMobile ? "fa-mobile-alt" : "fa-laptop"} text-gray-400`}
                      ></i>
                      <p className="font-semibold text-gray-900">
                        {userAgent.isMobile ? "Mobile" : "Desktop"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {log.description && (
            <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                <i className="fas fa-info-circle text-indigo-600"></i>
                Description
              </h3>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {log.description}
              </p>
            </div>
          )}

          {/* Metadata Section */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedMetadata(!expandedMetadata)}
                className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition"
              >
                <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <i className="fas fa-code text-gray-600"></i>
                  Additional Metadata
                  <span className="ml-2 text-xs bg-gray-200 px-2.5 py-1 rounded-full font-mono">
                    {Object.keys(log.metadata).length}
                  </span>
                </h3>
                <i
                  className={`fas fa-chevron-${expandedMetadata ? "up" : "down"} text-gray-600 transition`}
                ></i>
              </button>

              {expandedMetadata && (
                <div className="p-6 bg-white border-t border-gray-200">
                  {log.metadata?.changes &&
                    Array.isArray(log.metadata.changes) && (
                      <div className="space-y-3 mb-4">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          Changes:
                        </h4>
                        {log.metadata.changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-50 rounded-lg p-4 space-y-2"
                          >
                            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                              <i className="fas fa-edit text-blue-500 text-xs"></i>
                              {change.field}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <p className="text-gray-500 font-medium mb-1">
                                  Old Value:
                                </p>
                                <p className="font-mono bg-red-50 text-red-800 p-2 rounded break-all">
                                  {typeof change.oldValue === "object"
                                    ? JSON.stringify(change.oldValue)
                                    : change.oldValue || "(empty)"}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500 font-medium mb-1">
                                  New Value:
                                </p>
                                <p className="font-mono bg-green-50 text-green-800 p-2 rounded break-all">
                                  {typeof change.newValue === "object"
                                    ? JSON.stringify(change.newValue)
                                    : change.newValue || "(empty)"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  {log.metadata?.updatedFields && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">
                        Updated Fields:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {log.metadata.updatedFields.map((field, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full"
                          >
                            <i className="fas fa-check-circle"></i>
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Raw Data Section */}
          <details className="border border-gray-200 rounded-xl overflow-hidden">
            <summary className="px-6 py-4 bg-gray-50 hover:bg-gray-100 cursor-pointer font-medium text-gray-700 flex items-center gap-2">
              <i className="fas fa-database text-gray-600"></i>
              Raw JSON Data
            </summary>
            <div className="p-6 bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto border-t border-gray-200">
              <pre>{JSON.stringify(log, null, 2)}</pre>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetail;
