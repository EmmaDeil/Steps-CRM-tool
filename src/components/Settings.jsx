import React, { useState } from "react";
import Breadcrumb from "./Breadcrumb";
import { useAuth } from "../context/useAuth";
import toast from "react-hot-toast";

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("preferences");
  const [saving, setSaving] = useState(false);

  // Mock settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false,
    language: "English",
    twoFactorAuth: false,
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Settings saved successfully");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "Settings", icon: "fa-gear" },
        ]}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {/* Sidebar Navigation */}
            <div className="bg-slate-50 border-r border-slate-200 p-6 md:min-h-[600px]">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Settings</h2>
              <nav className="space-y-2">
                {[
                  { id: "preferences", label: "Preferences", icon: "fa-sliders" },
                  { id: "notifications", label: "Notifications", icon: "fa-bell" },
                  { id: "security", label: "Security", icon: "fa-shield-halved" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <i className={`fa-solid ${tab.icon} w-5`}></i>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="md:col-span-3 p-8">
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">General Preferences</h3>
                    <p className="text-sm text-slate-500 mb-8">Manage your application-wide settings and viewing preferences.</p>
                  </div>

                  <div className="bg-white border text-center border-slate-200 rounded-lg p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800">Language</h4>
                      <p className="text-sm text-slate-500 mt-1">Select your preferred language for the interface.</p>
                    </div>
                    <select
                      className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={settings.language}
                      onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                    >
                      <option>English</option>
                      <option>French</option>
                      <option>Spanish</option>
                    </select>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800">Dark Mode</h4>
                      <p className="text-sm text-slate-500 mt-1">Toggle dark appearance across the application.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.darkMode}
                        onChange={() => handleToggle("darkMode")}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">Notification Settings</h3>
                    <p className="text-sm text-slate-500 mb-8">Control how and when you want to be notified.</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800">Email Notifications</h4>
                      <p className="text-sm text-slate-500 mt-1">Receive daily summaries and important alerts via email.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.emailNotifications}
                        onChange={() => handleToggle("emailNotifications")}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800">SMS Alerts</h4>
                      <p className="text-sm text-slate-500 mt-1">Get text messages for critical approvals and urgent matters.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.smsNotifications}
                        onChange={() => handleToggle("smsNotifications")}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-1">Security Settings</h3>
                    <p className="text-sm text-slate-500 mb-8">Update your password and secure your account.</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800">Change Password</h4>
                      <p className="text-sm text-slate-500 mt-1">It's a good idea to use a strong password that you're not using elsewhere.</p>
                    </div>
                    <button className="px-4 py-2 border-2 border-slate-200 font-medium text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                      Update Password
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-800">Two-Factor Authentication</h4>
                      <p className="text-sm text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.twoFactorAuth}
                        onChange={() => handleToggle("twoFactorAuth")}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-10 pt-6 border-t border-slate-200 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
