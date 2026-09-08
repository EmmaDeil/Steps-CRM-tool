import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

const VisitorSignIn = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | form | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [passInfo, setPassInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    company: "",
    purpose: "",
    hostName: "",
  });

  useEffect(() => {
    const fetchPass = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/visitor/sign-in/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.message || "Invalid or expired visitor pass");
          setStatus("error");
          return;
        }
        setPassInfo(data.pass);
        setStatus("form");
      } catch {
        setErrorMsg("Unable to connect to server. Please try again.");
        setStatus("error");
      }
    };
    fetchPass();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/visitor/sign-in/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Sign-in failed");
        setSubmitting(false);
        return;
      }
      setStatus("success");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <i className="fa-solid fa-shield-halved text-white text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Sign-In</h1>
          <p className="text-sm text-gray-500 mt-1">
            Please fill in your details to complete check-in
          </p>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <i className="fa-solid fa-spinner fa-spin text-blue-500 text-3xl mb-4"></i>
            <p className="text-gray-500">Verifying your visitor pass...</p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-xmark text-red-500 text-2xl"></i>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Unable to Sign In
            </h2>
            <p className="text-sm text-gray-500">{errorMsg}</p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-circle-check text-green-500 text-2xl"></i>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Welcome, {form.visitorName}!
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              You have been successfully signed in. Please proceed to the front
              desk to collect your visitor badge.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              <i className="fa-solid fa-check"></i>
              Check-in Complete
            </div>
          </div>
        )}

        {/* Sign-in Form */}
        {status === "form" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {passInfo && (
              <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-sm text-blue-700">
                <i className="fa-solid fa-info-circle"></i>
                <span>
                  Pass created by <strong>{passInfo.createdBy}</strong>
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.visitorName}
                  onChange={(e) =>
                    setForm({ ...form, visitorName: e.target.value })
                  }
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.visitorEmail}
                    onChange={(e) =>
                      setForm({ ...form, visitorEmail: e.target.value })
                    }
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={form.visitorPhone}
                    onChange={(e) =>
                      setForm({ ...form, visitorPhone: e.target.value })
                    }
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                  placeholder="Your company name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose of Visit <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="">Select purpose</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Interview">Interview</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Consultation">Consultation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Person You Are Visiting
                </label>
                <input
                  type="text"
                  value={form.hostName}
                  onChange={(e) =>
                    setForm({ ...form, hostName: e.target.value })
                  }
                  placeholder="Name of your host"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket"></i>
                    Sign In
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Secure visitor management system
        </p>
      </div>
    </div>
  );
};

export default VisitorSignIn;
