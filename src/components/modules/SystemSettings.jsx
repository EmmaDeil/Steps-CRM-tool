import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";
import { useCurrency } from "../../context/useCurrency";
import { useAuth } from "../../context/useAuth";
import ModuleLoader from "../common/ModuleLoader";

const SystemSettings = () => {
  const { user } = useAuth();
  const { setCurrency } = useCurrency();
  const [generalSettings, setGeneralSettings] = useState({
    companyName: "Acme Corp",
    contactEmail: "admin@acmecorp.com",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    currency: "NGN",
  });

  const [themeSettings, setThemeSettings] = useState({
    primaryColor: "#137fec",
    logoUrl: "",
  });

  const [integrations, setIntegrations] = useState({
    slackEnabled: false,
    emailSmtp: "smtp.mailtrap.io",
    appApiKey: "",
  });

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [userStandardSettings, setUserStandardSettings] = useState({
    theme: "system",
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    currency: "NGN",
    emailNotifications: true,
    inAppNotifications: true,
    weeklyDigest: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingUserSettings, setIsSavingUserSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiService.get("/api/admin/system-settings");
        if (response) {
          setGeneralSettings({
            companyName: response.companyName || "Acme Corp",
            contactEmail: response.contactEmail || "admin@acmecorp.com",
            timezone: response.timezone || "UTC",
            dateFormat: response.dateFormat || "MM/DD/YYYY",
            currency: response.currency || "NGN",
          });
          setThemeSettings({
            primaryColor: response.primaryColor || "#137fec",
            logoUrl: response.logoUrl || "",
          });
          setIntegrations({
            slackEnabled: response.slackEnabled || false,
            emailSmtp: response.emailSmtp || "smtp.mailtrap.io",
            appApiKey: response.appApiKey || response.attendanceApiKey || "",
          });
          setMaintenanceMode(Boolean(response.maintenanceMode));
        }
      } catch (error) {
        console.error("Error fetching system settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserSettings = async () => {
      if (!user?._id) return;

      try {
        const response = await apiService.get(`/api/user/settings/${user._id}`);
        if (response?.data?.preferences) {
          setUserStandardSettings((prev) => ({
            ...prev,
            ...response.data.preferences,
          }));
        }
      } catch (error) {
        console.error("Error fetching user settings:", error);
      }
    };

    fetchSettings();
    fetchUserSettings();
  }, [user?._id]);

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

  const handleUserSettingChange = (e) => {
    const { name, value, type, checked } = e.target;
    setUserStandardSettings((prev) => ({
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
        maintenanceMode,
      };
      await apiService.patch("/api/admin/system-settings", payload);
      setCurrency(generalSettings.currency);
      toast.success("System settings updated successfully!");
    } catch (error) {
      console.error("Error saving system settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUserSettings = async () => {
    if (!user?._id) {
      toast.error("Unable to identify current user");
      return;
    }

    setIsSavingUserSettings(true);
    try {
      await apiService.patch(`/api/user/settings/${user._id}`, {
        preferences: userStandardSettings,
      });

      setCurrency(userStandardSettings.currency || generalSettings.currency);
      toast.success("Your settings were saved successfully");
    } catch (error) {
      console.error("Error saving user settings:", error);
      toast.error(error?.serverData?.error || "Failed to save user settings");
    } finally {
      setIsSavingUserSettings(false);
    }
  };

  if (isLoading) {
    return <ModuleLoader moduleName="System Settings" />;
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
        <div className="w-full space-y-8">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  name="currency"
                  value={generalSettings.currency}
                  onChange={handleGeneralChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="NGN">NGN - Nigerian Naira (₦)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                  <option value="JPY">JPY - Japanese Yen (¥)</option>
                  <option value="CAD">CAD - Canadian Dollar (CA$)</option>
                  <option value="AUD">AUD - Australian Dollar (A$)</option>
                  <option value="ZAR">ZAR - South African Rand (R)</option>
                  <option value="GHS">GHS - Ghanaian Cedi (₵)</option>
                  <option value="KES">KES - Kenyan Shilling (KSh)</option>
                  <option value="INR">INR - Indian Rupee (₹)</option>
                  <option value="CNY">CNY - Chinese Yuan (¥)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  This currency will be used across all modules in the
                  application.
                </p>
              </div>
            </div>
          </section>

          {/* User Standard Settings Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <i className="fa-solid fa-user-gear text-gray-400"></i>
                User Standard Settings
              </h3>
              <button
                onClick={handleSaveUserSettings}
                disabled={isSavingUserSettings}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSavingUserSettings ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-floppy-disk"></i>
                )}
                Save My Settings
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Theme
                </label>
                <select
                  name="theme"
                  value={userStandardSettings.theme}
                  onChange={handleUserSettingChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="system">System Default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  name="language"
                  value={userStandardSettings.language}
                  onChange={handleUserSettingChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={userStandardSettings.timezone}
                  onChange={handleUserSettingChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="UTC">UTC</option>
                  <option value="Africa/Lagos">Africa/Lagos</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Format
                </label>
                <select
                  name="dateFormat"
                  value={userStandardSettings.dateFormat}
                  onChange={handleUserSettingChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Currency
                </label>
                <select
                  name="currency"
                  value={userStandardSettings.currency}
                  onChange={handleUserSettingChange}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                >
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="KES">KES</option>
                  <option value="GHS">GHS</option>
                </select>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    checked={userStandardSettings.emailNotifications}
                    onChange={handleUserSettingChange}
                  />
                  <span className="text-sm text-gray-700">
                    Email notifications
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="inAppNotifications"
                    checked={userStandardSettings.inAppNotifications}
                    onChange={handleUserSettingChange}
                  />
                  <span className="text-sm text-gray-700">
                    In-app notifications
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="weeklyDigest"
                    checked={userStandardSettings.weeklyDigest}
                    onChange={handleUserSettingChange}
                  />
                  <span className="text-sm text-gray-700">
                    Weekly digest summary
                  </span>
                </label>
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
                  Application API Key
                </label>
                <input
                  type="password"
                  name="appApiKey"
                  value={integrations.appApiKey}
                  onChange={handleIntegrationChange}
                  placeholder="Enter application API key"
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
