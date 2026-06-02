import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";
import { useCurrency } from "../../context/useCurrency";
import { useAuth } from "../../context/useAuth";
import ModuleLoader from "../common/ModuleLoader";

const SystemSettings = () => {
  const { user } = useAuth();
  const { setCurrency } = useCurrency();
  const [activeSettingsTab, setActiveSettingsTab] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Backup, Restore & Delete state
  const [restoreFile, setRestoreFile] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

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
      toast.success("Your preferences were saved successfully");
    } catch (error) {
      console.error("Error saving user settings:", error);
      toast.error(error?.serverData?.error || "Failed to save user preferences");
    } finally {
      setIsSavingUserSettings(false);
    }
  };

  // API Key operations
  const handleCopyApiKey = () => {
    if (!integrations.appApiKey) {
      toast.error("No API key configured yet");
      return;
    }
    navigator.clipboard.writeText(integrations.appApiKey);
    toast.success("API key copied to clipboard!");
  };

  const handleGenerateApiKey = async () => {
    if (!window.confirm("Are you sure you want to regenerate the system API authorization key? Any external sync clients using the current key will lose access immediately.")) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiService.post("/api/admin/system-settings/app-api-key/generate");
      if (response && response.appApiKey) {
        setIntegrations((prev) => ({
          ...prev,
          appApiKey: response.appApiKey,
        }));
        toast.success("New API key generated and persisted!");
      }
    } catch (error) {
      console.error("API Key regeneration failed:", error);
      toast.error("Failed to generate new key");
    } finally {
      setIsSaving(false);
    }
  };

  // Danger Zone Handlers
  const handleBackup = async () => {
    try {
      const response = await apiService.get("/api/admin/backup");
      if (response) {
        const fileContent = JSON.stringify(response, null, 2);
        const blob = new Blob([fileContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `database-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Database backup downloaded successfully!");
      }
    } catch (error) {
      console.error("Backup failed:", error);
      toast.error("Database backup failed");
    }
  };

  const handleRestore = async (e) => {
    e.preventDefault();
    if (!restoreFile) {
      toast.error("Please upload a backup file (.json) first");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsRestoring(true);
        const backupData = JSON.parse(event.target.result);
        const response = await apiService.post("/api/admin/restore", backupData);
        if (response) {
          toast.success("Database restored successfully!");
          setRestoreFile(null);
        }
      } catch (err) {
        console.error("Restore failed:", err);
        toast.error("Invalid backup file format or restore failed");
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(restoreFile);
  };

  const handleDeleteDatabase = async (e) => {
    e.preventDefault();
    if (resetConfirmation !== "RESET DATABASE") {
      toast.error("Confirmation text does not match");
      return;
    }

    setIsResetting(true);
    try {
      const response = await apiService.delete("/api/admin/system-settings/database");
      if (response) {
        toast.success("Database erased successfully!");
        setShowResetModal(false);
        setResetConfirmation("");
      }
    } catch (error) {
      console.error("Database deletion failed:", error);
      toast.error(error.response?.data?.message || "Failed to reset database");
    } finally {
      setIsResetting(false);
    }
  };

  // Search logic to determine if a tab contains matching queries
  const tabKeywords = {
    general: ["company", "email", "timezone", "date", "currency", "format", "acme", "general", "parameters"],
    personal: ["theme", "language", "timezone", "date", "currency", "notifications", "digest", "preferences", "personal"],
    branding: ["color", "logo", "preview", "accent", "primary", "theme", "branding", "mockup"],
    integrations: ["slack", "smtp", "api key", "webhook", "token", "mail", "integrations", "services"],
    danger: ["maintenance", "block", "backup", "restore", "erase", "wipe", "delete", "destroy", "danger", "reset"]
  };

  const doesTabMatchSearch = (tab) => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase().trim();
    return tabKeywords[tab].some(keyword => keyword.includes(query) || query.includes(keyword));
  };

  const highlightClass = (fieldName) => {
    if (!searchQuery) return "";
    const query = searchQuery.toLowerCase().trim();
    return fieldName.toLowerCase().includes(query)
      ? "ring-2 ring-amber-400 ring-offset-2 transition-all duration-300 rounded-xl"
      : "";
  };

  if (isLoading) {
    return <ModuleLoader moduleName="System Settings" />;
  }

  // Define brand styling object dynamically
  const activeTabAccentStyle = {
    borderColor: themeSettings.primaryColor || "#137fec",
    color: themeSettings.primaryColor || "#137fec",
  };

  const brandButtonStyle = {
    backgroundColor: themeSettings.primaryColor || "#137fec",
  };

  return (
    <div className="bg-[#f8fafc] rounded-2xl shadow-xl border border-slate-200/80 min-h-[calc(100vh-140px)] flex flex-col overflow-hidden transition-all duration-300">
      
      {/* 1. Header Area */}
      <div className="px-8 py-6 border-b border-slate-200/80 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <i className="fa-solid fa-gears text-lg" style={{ color: themeSettings.primaryColor }} />
            System Control Panel
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage company configs, branding colors, webhooks, and database maintenance tools.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search setting parameters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-xs outline-none focus:border-slate-350 focus:ring-4 focus:ring-slate-100 focus:bg-white transition-all font-medium"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
              >
                <i className="fa-solid fa-circle-xmark text-xs" />
              </button>
            )}
          </div>

          {activeSettingsTab !== "personal" && activeSettingsTab !== "danger" && (
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              style={brandButtonStyle}
              className="px-5 py-2.5 text-white rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] hover:brightness-95 flex-shrink-0"
            >
              {isSaving ? (
                <i className="fa-solid fa-spinner fa-spin" />
              ) : (
                <i className="fa-solid fa-circle-check" />
              )}
              Save Configuration
            </button>
          )}
        </div>
      </div>

      {/* 2. Horizontal Navigation Bar */}
      <div className="bg-white border-b border-slate-200/80 px-8 flex justify-between items-center overflow-x-auto flex-shrink-0">
        <div className="flex gap-2 py-1">
          {[
            { id: "general", label: "General Config", icon: "fa-sliders" },
            { id: "personal", label: "Personal Prefs", icon: "fa-user-gear" },
            { id: "branding", label: "Branding & Appearance", icon: "fa-paint-roller" },
            { id: "integrations", label: "Integrations & Services", icon: "fa-plug" },
            { id: "danger", label: "Danger & Maintenance", icon: "fa-triangle-exclamation" },
          ].map((tab) => {
            const isActive = activeSettingsTab === tab.id;
            const hasMatch = doesTabMatchSearch(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                style={isActive ? activeTabAccentStyle : {}}
                className={`relative flex items-center gap-2.5 px-4 py-4.5 text-xs font-extrabold border-b-2 transition-all select-none ${
                  isActive
                    ? "border-b-2 border-[#137fec]"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-200"
                } ${hasMatch ? "bg-amber-50/40" : ""}`}
              >
                <i className={`fa-solid ${tab.icon} text-sm ${isActive ? "" : "text-slate-400"}`} style={isActive ? { color: themeSettings.primaryColor } : {}} />
                <span>{tab.label}</span>
                {hasMatch && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping absolute top-3 right-3" />
                )}
              </button>
            );
          })}
        </div>

        {/* Live System Stats Quick Badges */}
        <div className="hidden lg:flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Currency: {generalSettings.currency}</span>
          </div>
          <div className={`flex items-center gap-1.5 border px-3 py-1 rounded-full text-[10px] font-bold ${
            maintenanceMode
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-250 text-emerald-700"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${maintenanceMode ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <span>{maintenanceMode ? "Maintenance Mode Active" : "Workspace Online"}</span>
          </div>
        </div>
      </div>

      {/* 3. Panel Area */}
      <div className="flex-grow p-8">
        <div className="w-full max-w-6xl">
          
          {/* General Config Panel */}
          {activeSettingsTab === "general" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className={`bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6 ${highlightClass("general parameters")}`}>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Company Metadata</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className={highlightClass("company name")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        value={generalSettings.companyName}
                        onChange={handleGeneralChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-800"
                      />
                    </div>
                    <div className={highlightClass("contact email")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        name="contactEmail"
                        value={generalSettings.contactEmail}
                        onChange={handleGeneralChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Localization & Defaults</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className={highlightClass("timezone")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Default Timezone
                      </label>
                      <select
                        name="timezone"
                        value={generalSettings.timezone}
                        onChange={handleGeneralChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="UTC">UTC (Universal Time)</option>
                        <option value="EST">EST (Eastern Standard Time)</option>
                        <option value="PST">PST (Pacific Standard Time)</option>
                        <option value="GMT">GMT (Greenwich Mean Time)</option>
                      </select>
                    </div>
                    <div className={highlightClass("date format")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Date Format
                      </label>
                      <select
                        name="dateFormat"
                        value={generalSettings.dateFormat}
                        onChange={handleGeneralChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div className={`sm:col-span-2 ${highlightClass("currency")}`}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Base System Currency
                      </label>
                      <select
                        name="currency"
                        value={generalSettings.currency}
                        onChange={handleGeneralChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
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
                    </div>
                  </div>
                </div>
              </div>

              {/* General Config Help Column */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-md border border-slate-800 relative overflow-hidden">
                  <div className="h-28 w-28 bg-slate-750 rounded-full absolute -right-8 -top-8 opacity-20" />
                  <h4 className="font-extrabold text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <i className="fa-solid fa-circle-info text-blue-400" />
                    Localization Note
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Adjusting currency coordinates changes display headers globally across Accounting sheets, Vendor invoices, and Budget targets instantly. Make sure transaction ledger books are reconciled before modifying the base currency.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Workspace Profile</h4>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 font-extrabold text-sm uppercase">
                      {generalSettings.companyName.substring(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{generalSettings.companyName}</p>
                      <p className="text-xs text-slate-450 font-medium">System Admin Domain</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personal Preferences Panel */}
          {activeSettingsTab === "personal" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">My User Preferences</h3>
                    <button
                      onClick={handleSaveUserSettings}
                      disabled={isSavingUserSettings}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                    >
                      {isSavingUserSettings ? (
                        <i className="fa-solid fa-spinner fa-spin" />
                      ) : (
                        <i className="fa-solid fa-floppy-disk" />
                      )}
                      Apply Preferences
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className={highlightClass("interface theme")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Interface Theme
                      </label>
                      <select
                        name="theme"
                        value={userStandardSettings.theme}
                        onChange={handleUserSettingChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="system">System Default</option>
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                      </select>
                    </div>

                    <div className={highlightClass("language")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Language
                      </label>
                      <select
                        name="language"
                        value={userStandardSettings.language}
                        onChange={handleUserSettingChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="en">English (US)</option>
                        <option value="fr">French (Français)</option>
                        <option value="es">Spanish (Español)</option>
                      </select>
                    </div>

                    <div className={highlightClass("personal timezone")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Personal Timezone
                      </label>
                      <select
                        name="timezone"
                        value={userStandardSettings.timezone}
                        onChange={handleUserSettingChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Africa/Lagos">Africa/Lagos (West Africa)</option>
                        <option value="America/New_York">America/New_York (Eastern)</option>
                        <option value="Europe/London">Europe/London (GMT/BST)</option>
                      </select>
                    </div>

                    <div className={highlightClass("preferred date format")}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Preferred Date Format
                      </label>
                      <select
                        name="dateFormat"
                        value={userStandardSettings.dateFormat}
                        onChange={handleUserSettingChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div className={`sm:col-span-2 ${highlightClass("display currency")}`}>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Display Currency Override
                      </label>
                      <select
                        name="currency"
                        value={userStandardSettings.currency}
                        onChange={handleUserSettingChange}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-bold text-slate-700 cursor-pointer"
                      >
                        <option value="NGN">NGN (₦)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="KES">KES (KSh)</option>
                        <option value="GHS">GHS (₵)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Prefs Alert Cards Column */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Notification Switches</h4>
                  <div className="space-y-4">
                    <label className={`flex items-center gap-3 cursor-pointer group ${highlightClass("email notifications")}`}>
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={userStandardSettings.emailNotifications}
                        onChange={handleUserSettingChange}
                        className="rounded border-slate-350 text-[#137fec] focus:ring-blue-500/20 h-4.5 w-4.5 transition-all"
                      />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Dispatch Transaction Emails</span>
                    </label>

                    <label className={`flex items-center gap-3 cursor-pointer group ${highlightClass("in-app notifications")}`}>
                      <input
                        type="checkbox"
                        name="inAppNotifications"
                        checked={userStandardSettings.inAppNotifications}
                        onChange={handleUserSettingChange}
                        className="rounded border-slate-350 text-[#137fec] focus:ring-blue-500/20 h-4.5 w-4.5 transition-all"
                      />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Show App Notification Badges</span>
                    </label>

                    <label className={`flex items-center gap-3 cursor-pointer group ${highlightClass("weekly digest")}`}>
                      <input
                        type="checkbox"
                        name="weeklyDigest"
                        checked={userStandardSettings.weeklyDigest}
                        onChange={handleUserSettingChange}
                        className="rounded border-slate-350 text-[#137fec] focus:ring-blue-500/20 h-4.5 w-4.5 transition-all"
                      />
                      <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 transition-colors">Weekly Workspace Digests</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Branding & Appearance Panel */}
          {activeSettingsTab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Branding Customizer Form */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Appearance Assets</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className={highlightClass("brand primary color")}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Accent Primary Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        name="primaryColor"
                        value={themeSettings.primaryColor}
                        onChange={handleThemeChange}
                        className="h-11 w-16 p-1 rounded-xl border border-slate-200 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        name="primaryColor"
                        value={themeSettings.primaryColor}
                        onChange={handleThemeChange}
                        className="flex-1 h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-mono uppercase font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className={highlightClass("company logo url")}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Company Logo URL
                    </label>
                    <input
                      type="text"
                      name="logoUrl"
                      value={themeSettings.logoUrl}
                      onChange={handleThemeChange}
                      placeholder="e.g. /images/logo.png"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className={`bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex items-center gap-4 ${highlightClass("logo badge preview")}`}>
                  <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                    {themeSettings.logoUrl ? (
                      <img
                        src={themeSettings.logoUrl}
                        alt="Logo Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                        }}
                      />
                    ) : (
                      <i className="fa-solid fa-image text-slate-400 text-lg"></i>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-700">Logo Badge Preview</p>
                    <p className="text-[10px] text-slate-400 font-bold">Image loaded from parameters.</p>
                  </div>
                </div>
              </div>

              {/* Brand Mockup Preview Panel */}
              <div className={`bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm ${highlightClass("interactive color mockup")}`}>
                <div>
                  <h4 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-wand-magic-sparkles text-amber-500" />
                    Interactive Custom Mockup
                  </h4>
                  <p className="text-[10px] text-slate-500 mb-4 font-medium leading-relaxed">
                    Check how buttons and menu bars dynamically inherit settings below:
                  </p>
                </div>

                <div className="flex-grow rounded-xl border border-slate-200/60 bg-slate-50/50 flex overflow-hidden min-h-[220px] shadow-inner select-none">
                  {/* Sidebar Mock */}
                  <div className="w-16 border-r border-slate-200/60 p-2 flex flex-col items-center gap-2.5 flex-shrink-0" style={{ backgroundColor: themeSettings.primaryColor + '12' }}>
                    <div className="h-6 w-6 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden mb-1">
                      {themeSettings.logoUrl ? (
                        <img src={themeSettings.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[8px] font-bold text-slate-500">CRM</span>
                      )}
                    </div>
                    <div className="h-3.5 w-11 rounded" style={{ backgroundColor: themeSettings.primaryColor }} />
                    <div className="h-2.5 w-11 bg-slate-200 rounded" />
                    <div className="h-2.5 w-11 bg-slate-200 rounded" />
                    <div className="h-2.5 w-11 bg-slate-200 rounded" />
                  </div>
                  
                  {/* Content Area Mock */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Header Mock */}
                    <div className="h-8 border-b border-slate-100 bg-white px-2.5 flex items-center justify-between">
                      <div className="h-2 w-14 bg-slate-200 rounded" />
                      <div className="flex items-center gap-1.5">
                        <div className="h-4 w-4 rounded-full bg-slate-100 border border-slate-200" />
                        <div className="h-2 w-8 bg-slate-200 rounded" />
                      </div>
                    </div>
                    {/* Body Mock */}
                    <div className="flex-1 p-3 space-y-2 bg-slate-50/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white border border-slate-150 p-2 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.01)] space-y-1">
                          <div className="h-1.5 w-8 bg-slate-200 rounded" />
                          <div className="h-3 w-12 font-bold text-xs" style={{ color: themeSettings.primaryColor }}>₦2.4M</div>
                        </div>
                        <div className="bg-white border border-slate-150 p-2 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.01)] space-y-1">
                          <div className="h-1.5 w-8 bg-slate-200 rounded" />
                          <div className="h-3 w-12 font-bold text-xs" style={{ color: themeSettings.primaryColor }}>14 Tickets</div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-slate-150 p-2.5 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.01)] space-y-2">
                        <div className="h-2 w-20 bg-slate-200 rounded" />
                        <div className="h-1.5 w-full bg-slate-100 rounded" />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <div className="h-4 w-8 bg-slate-100 rounded text-[6px] flex items-center justify-center text-slate-400 font-bold border border-slate-150">Cancel</div>
                          <div className="h-4 w-12 rounded text-[6px] flex items-center justify-center text-white font-bold transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1)]" style={{ backgroundColor: themeSettings.primaryColor }}>Submit</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Panel */}
          {activeSettingsTab === "integrations" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Slack Alert */}
                <div className={`bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between gap-4 ${highlightClass("slack alerts hook")}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="h-11 w-11 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 flex-shrink-0 animate-pulse">
                        <i className="fa-brands fa-slack text-xl" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">Slack Webhooks Integration</h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                            integrations.slackEnabled 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                              : "bg-slate-50 border-slate-200 text-slate-600"
                          }`}>
                            <span className={`h-1 w-1 rounded-full ${integrations.slackEnabled ? "bg-emerald-500 animate-ping" : "bg-slate-400"}`} />
                            <span>{integrations.slackEnabled ? "Active" : "Inactive"}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-550 mt-1 font-medium">Forward system tickets, leave reminders, and expense forms to Slack channels.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        name="slackEnabled"
                        checked={integrations.slackEnabled}
                        onChange={handleIntegrationChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                {/* SMTP Server Info */}
                <div className={`bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 ${highlightClass("smtp host address")}`}>
                  <div className="flex gap-4 mb-2">
                    <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#137fec] border border-blue-100 flex-shrink-0">
                      <i className="fa-solid fa-envelope text-lg" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">SMTP Outbox Gateway</h4>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                          integrations.emailSmtp 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${integrations.emailSmtp ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
                          <span>{integrations.emailSmtp ? "Configured" : "Needs Setup"}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-550 mt-1 font-medium font-medium">Route notifications directly through corporate mail servers.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      SMTP Host Endpoint Address
                    </label>
                    <input
                      type="text"
                      name="emailSmtp"
                      value={integrations.emailSmtp}
                      onChange={handleIntegrationChange}
                      placeholder="e.g. smtp.mailtrap.io"
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#137fec] focus:ring-4 focus:ring-blue-100 transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>

                {/* API Authorization Token */}
                <div className={`bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4 ${highlightClass("system api access token")}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-650 border border-indigo-100 flex-shrink-0">
                        <i className="fa-solid fa-key text-lg" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-sm">System API Access Token</h4>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${
                            integrations.appApiKey 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                              : "bg-amber-50 border-amber-200 text-amber-750"
                          }`}>
                            <span className={`h-1 w-1 rounded-full ${integrations.appApiKey ? "bg-emerald-500" : "bg-amber-500 animate-ping"}`} />
                            <span>{integrations.appApiKey ? "Active Token" : "Unassigned"}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-550 mt-1 font-medium">Validates integration keys for synchronization endpoints.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleGenerateApiKey}
                      disabled={isSaving}
                      className="px-3.5 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-750 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                    >
                      <i className="fa-solid fa-rotate" />
                      Generate Token
                    </button>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Authorization Key String
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? "text" : "password"}
                          name="appApiKey"
                          value={integrations.appApiKey}
                          readOnly
                          placeholder="No token mapped. Click Generate to assign."
                          className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none font-mono font-bold tracking-widest text-slate-700"
                        />
                        {integrations.appApiKey && (
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-650 transition-colors"
                          >
                            <i className={`fa-solid ${showApiKey ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyApiKey}
                        disabled={!integrations.appApiKey}
                        className="h-11 w-12 flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-40"
                        title="Copy to Clipboard"
                      >
                        <i className="fa-solid fa-copy text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrations Information Sidebar */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Endpoint Webhooks</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Webhooks are routed asynchronously to prevent network latency on critical operations. In app logs, triggers will register under the Action category <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">API Key</span>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Security & Danger Panel */}
          {activeSettingsTab === "danger" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-2 space-y-6">
                
                {/* Maintenance Banner */}
                <div className={`bg-rose-50/40 p-6 rounded-2xl border border-rose-100/80 flex items-start justify-between gap-4 shadow-sm ${highlightClass("global maintenance block")}`}>
                  <div className="space-y-1">
                    <h4 className="font-bold text-red-800 text-sm flex items-center gap-1.5">
                      <i className="fa-solid fa-power-off text-red-650" />
                      Global Maintenance Mode
                    </h4>
                    <p className="text-xs text-red-700/80 max-w-xl font-medium leading-relaxed">
                      Enabling this blocks non-admin personnel from accessing Steps-CRM operations. 
                      Only accounts carrying the verified Admin role can bypass the blocking overlay.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-red-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>

                {/* DB snap operations */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Database Administration</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Backup */}
                    <div className={`bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between min-h-[160px] ${highlightClass("download configuration snapshot")}`}>
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Export Configuration Backup</h5>
                        <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed font-semibold">
                          Generates a complete JSON file snapshot including user records, asset registers, expenses, and log chains.
                        </p>
                      </div>
                      <button
                        onClick={handleBackup}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm active:scale-98 mt-4"
                      >
                        <i className="fa-solid fa-download" />
                        Download Backup (.json)
                      </button>
                    </div>

                    {/* Restore */}
                    <div className={`bg-slate-50 p-5 rounded-2xl border border-slate-200/60 flex flex-col justify-between min-h-[160px] ${highlightClass("upload snapshot file")}`}>
                      <div>
                        <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Upload Backup Snapshot</h5>
                        <p className="text-[10px] text-slate-450 mt-1.5 leading-relaxed font-semibold">
                          Wipes transactional tables and inserts the uploaded snapshot data records.
                        </p>
                      </div>
                      <form onSubmit={handleRestore} className="space-y-2 mt-4">
                        <input
                          type="file"
                          accept=".json"
                          onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                          className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-[#137fec] hover:file:bg-blue-100 border border-slate-250 rounded-lg p-1.5 bg-white"
                        />
                        <button
                          type="submit"
                          disabled={isRestoring || !restoreFile}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-98"
                        >
                          {isRestoring ? (
                            <>
                              <i className="fa-solid fa-spinner fa-spin" />
                              <span>Restoring snapshot...</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-upload" />
                              <span>Import Snapshot</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>

                {/* Reset Section */}
                <div className={`bg-rose-50/50 p-6 rounded-2xl border border-rose-100/70 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${highlightClass("erase & wipes database")}`}>
                  <div className="space-y-1 max-w-xl">
                    <h5 className="font-bold text-red-800 text-sm flex items-center gap-1.5">
                      <i className="fa-solid fa-radiation text-red-600" />
                      Erase All System Transactional Data
                    </h5>
                    <p className="text-xs text-red-700/80 font-medium leading-relaxed">
                      Clears invoices, tickets, expense spreadsheets, history log files, and comments. 
                      Preserves company branding preferences, system roles definitions, and your own Admin user profile.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowResetModal(true)}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all duration-200 shadow-md shadow-red-500/10 active:scale-95 flex-shrink-0"
                  >
                    <i className="fa-solid fa-trash-can mr-1.5" />
                    Wipe Database
                  </button>
                </div>
              </div>

              {/* Danger Zone Sidebar */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">Destructive Precautions</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Wiping the database is an irreversible action. Ensure a local configuration snapshot is downloaded beforehand. A log containing the name of the authoring admin will be permanently registered in the server's outer security log chain.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Database Delete/Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-rose-100 flex flex-col animate-scale-in">
            <div className="p-5 border-b border-rose-100 flex items-center justify-between bg-red-50/30">
              <h3 className="text-sm font-extrabold text-red-800 flex items-center gap-1.5">
                <i className="fa-solid fa-triangle-exclamation text-red-600 animate-pulse" />
                Confirm Workspace Wipe
              </h3>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetConfirmation("");
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all active:scale-90"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteDatabase} className="p-6 space-y-5">
              <div className="rounded-xl bg-red-50 p-4 text-xs text-red-800 border border-red-100/70 space-y-2">
                <p className="font-bold flex items-center gap-1">
                  <i className="fa-solid fa-skull-crossbones text-red-650" />
                  PERMANENT DESTRUCTIVE ACTION
                </p>
                <p className="font-medium leading-relaxed">
                  This wipes invoices, transactions, tickets, logs, and attendance sheets. 
                  Your admin access and system credentials will not be revoked.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">
                  Type <span className="font-extrabold text-red-700 font-mono">RESET DATABASE</span> to authorize:
                </label>
                <input
                  required
                  type="text"
                  placeholder="RESET DATABASE"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-red-200 text-sm focus:outline-none focus:ring-4 focus:ring-red-100 transition-all font-mono font-bold uppercase tracking-widest text-red-700 text-center"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetConfirmation("");
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetConfirmation !== "RESET DATABASE"}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10"
                >
                  {isResetting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" />
                      <span>Purging Database...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash-can" />
                      <span>Erase All Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
