import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
};

const ApiKeySettings = () => {
  const [attendanceApiKey, setAttendanceApiKey] = useState("");
  const [lastUsedAt, setLastUsedAt] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiService.get("/api/admin/system-settings");
        setAttendanceApiKey(String(response?.attendanceApiKey || ""));
        setLastUsedAt(response?.attendanceApiKeyLastUsedAt || null);
      } catch (error) {
        console.error("Error loading API key settings:", error);
        toast.error("Failed to load API key settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await apiService.post(
        "/api/admin/system-settings/attendance-api-key/generate",
      );
      const generatedKey = String(response?.attendanceApiKey || "").trim();
      if (!generatedKey) {
        throw new Error("API key generation returned no key");
      }
      setAttendanceApiKey(generatedKey);
      setLastUsedAt(response?.attendanceApiKeyLastUsedAt || null);
      toast.success("New API key generated");
    } catch (error) {
      console.error("Error generating API key:", error);
      toast.error(error?.serverData?.message || "Failed to generate API key");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    const key = String(attendanceApiKey || "").trim();
    if (!key) {
      toast.error("No API key to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(key);
      toast.success("API key copied");
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      toast.error("Unable to copy API key");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[360px] bg-white rounded-xl border border-gray-200">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#111418]">API Key Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage external integration keys used by the system.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Service API Key
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Used for remote attendance synchronization endpoint
              authentication.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
            <i className="fa-solid fa-shield-halved text-gray-500"></i>
            Secure Setting
          </span>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Key Value
        </label>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 text-left px-3 py-2.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition-colors"
            title="Click to copy"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-sm text-gray-900 truncate">
                {attendanceApiKey || "No API key available"}
              </p>
              <span className="shrink-0 text-xs font-medium text-gray-600 inline-flex items-center gap-1">
                <i className="fa-solid fa-copy"></i>
                Copy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2.5 bg-[#137fec] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {generating ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                Regenerating...
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                Regenerate API Key
              </>
            )}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Last used: {formatDateTime(lastUsedAt)}
        </p>
      </div>
    </div>
  );
};

export default ApiKeySettings;
