import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";

const SystemSettings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Acme Corp",
    contactEmail: "admin@acmecorp.com",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
  });

  const [themeSettings, setThemeSettings] = useState({
    primaryColor: "#137fec",
    logoUrl: "",
  });

  const [integrations, setIntegrations] = useState({
    slackEnabled: false,
    emailSmtp: "smtp.mailtrap.io",
    attendanceApiKey: "",
  });

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiService.get('/api/admin/system-settings');
        if (response.data) {
          setGeneralSettings({
            companyName: response.data.companyName || "Acme Corp",
            contactEmail: response.data.contactEmail || "admin@acmecorp.com",
            timezone: response.data.timezone || "UTC",
            dateFormat: response.data.dateFormat || "MM/DD/YYYY",
          });
          setThemeSettings({
            primaryColor: response.data.primaryColor || "#137fec",
            logoUrl: response.data.logoUrl || "",
          });
          setIntegrations({
            slackEnabled: response.data.slackEnabled || false,
            emailSmtp: response.data.emailSmtp || "smtp.mailtrap.io",
            attendanceApiKey: response.data.attendanceApiKey || "",
          });
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handlers
  const handleGeneralChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleThemeChange = (e) => {
    const { name, value } = e.target;
    setThemeSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleIntegrationChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIntegrations((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...generalSettings,
        ...themeSettings,
        ...integrations,
      };
      await apiService.patch('/api/admin/system-settings', payload);
      toast.success("System settings updated successfully!");
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-10">
        <i className="fa-solid fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 className="text-xl font-bold text-[#111418]">System Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage global configuration, branding, and integrations for the
            platform.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-4 py-2 bg-[#137fec] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <i className="fa-solid fa-spinner fa-spin"></i>
          ) : (
            <i className="fa-solid fa-check"></i>
          )}
          Save Changes
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* General Settings Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-gray-400"></i>
              General Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={generalSettings.companyName}
                  onChange={handleGeneralChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={generalSettings.contactEmail}
                  onChange={handleGeneralChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Timezone
                </label>
                <select
                  name="timezone"
                  value={generalSettings.timezone}
                  onChange={handleGeneralChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="GMT">GMT (Greenwich Mean Time)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <select
                  name="dateFormat"
                  value={generalSettings.dateFormat}
                  onChange={handleGeneralChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </section>

          {/* Theme & Branding Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-paint-roller text-gray-400"></i>
              Theme & Branding
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    name="primaryColor"
                    value={themeSettings.primaryColor}
                    onChange={handleThemeChange}
                    className="h-10 w-12 p-1 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    value={themeSettings.primaryColor}
                    onChange={handleThemeChange}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 font-mono uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">
                    {themeSettings.logoUrl ? (
                      <img
                        src={themeSettings.logoUrl}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <i className="fa-solid fa-image text-gray-400"></i>
                    )}
                  </div>
                  <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Upload Image
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Integrations Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-plug text-gray-400"></i>
              Integrations & Services
            </h3>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-6">
              <div className="flex items-center justify-between py-2 border-b border-gray-200 pb-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    Slack Notifications
                  </h4>
                  <p className="text-sm text-gray-500">
                    Send system alerts right to your workspace channels.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="slackEnabled"
                    checked={integrations.slackEnabled}
                    onChange={handleIntegrationChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Server Address
                </label>
                <input
                  type="text"
                  name="emailSmtp"
                  value={integrations.emailSmtp}
                  onChange={handleIntegrationChange}
                  placeholder="e.g. smtp.gmail.com"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attendance App API Key
                </label>
                <input
                  type="password"
                  name="attendanceApiKey"
                  value={integrations.attendanceApiKey}
                  onChange={handleIntegrationChange}
                  placeholder="Enter token for module 8"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                />
              </div>
            </div>
          </section>

          {/* Maintenance Mode Section */}
          <section>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  Maintenance Mode
                </h3>
                <p className="text-sm text-red-600 mt-1 max-w-lg">
                  Enabling maintenance mode will temporarily disable access for
                  all non-admin users. Use this only when performing critical
                  system updates.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-red-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
