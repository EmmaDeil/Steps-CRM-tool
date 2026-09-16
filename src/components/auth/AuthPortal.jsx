import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";
import { ShieldCheck, Layers, CheckCircle, ArrowRight, Lock, Sparkles, Building2 } from "lucide-react";

const AuthPortal = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine mode from path
  const getModeFromPath = (path) => {
    if (path === "/signup") return "signup";
    if (path === "/forgot-password") return "forgot-password";
    return "login";
  };

  const [mode, setMode] = useState(() => getModeFromPath(location.pathname));
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setMode(getModeFromPath(location.pathname));
  }, [location.pathname]);

  const switchMode = (newMode) => {
    if (newMode === mode || animating) return;
    setAnimating(true);
    setMode(newMode);
    
    // Update browser URL
    const targetPath = newMode === "signup" ? "/signup" : newMode === "forgot-password" ? "/forgot-password" : "/";
    navigate(targetPath, { replace: true });

    setTimeout(() => {
      setAnimating(false);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-slate-100/80 flex items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl shadow-slate-300/60 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[680px] relative z-10">
        
        {/* Left Side: SaaS Showcase Hero Panel (5 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          {/* Brand Header */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-0.5 shadow-lg flex items-center justify-center">
                <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  STEPS <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white font-semibold">CRM & ERP</span>
                </h1>
                <p className="text-xs text-indigo-100">Enterprise Operating Platform</p>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-4 mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                Streamline operations across your <span className="text-indigo-200 underline decoration-indigo-300/40">entire enterprise</span>
              </h2>
              <p className="text-sm text-indigo-100 leading-relaxed">
                Integrated Procurement, Sales Workflows, Multi-level Approvals, Financial Accounting, and Automated Stock Control in one platform.
              </p>
            </div>

            {/* Feature Highlights List */}
            <div className="space-y-3.5 my-6">
              {[
                { title: "Material Request & Payment Gate", desc: "5-stage procurement workflow with GRN inventory sync" },
                { title: "Multi-level Approval Engine", desc: "Configurable approval chains and role routing" },
                { title: "Real-Time WebSocket Sync", desc: "Live operational updates and security activity tracking" },
              ].map((feat, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm">
                  <CheckCircle className="w-5 h-5 text-indigo-200 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                    <p className="text-[11px] text-indigo-100">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Metrics */}
          <div className="pt-6 border-t border-white/20 flex items-center justify-between text-xs text-indigo-100">
            <span className="flex items-center gap-1.5 font-medium text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Enterprise RBAC Security
            </span>
            <span className="text-indigo-200">v2.6 Pro</span>
          </div>
        </div>

        {/* Right Side: Visible Pure White Form Area (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-10 flex flex-col justify-between relative">
          
          {/* Top Mode Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  mode === "login"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  mode === "signup"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => switchMode("forgot-password")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
                  mode === "forgot-password"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Reset Password
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>256-bit Encrypted</span>
            </div>
          </div>

          {/* Sliding Container Content Wrapper */}
          <div className="flex-grow flex flex-col justify-center relative min-h-[480px] overflow-hidden">
            
            {/* LOGIN SLIDE MODE */}
            <div
              className={`w-full transition-all duration-500 ease-in-out transform ${
                mode === "login"
                  ? "opacity-100 translate-x-0 relative z-20 pointer-events-auto"
                  : "opacity-0 -translate-x-full absolute top-0 left-0 z-10 pointer-events-none"
              }`}
            >
              <Login onSwitchMode={switchMode} isEmbedded={true} />
            </div>

            {/* SIGNUP SLIDE MODE */}
            <div
              className={`w-full transition-all duration-500 ease-in-out transform ${
                mode === "signup"
                  ? "opacity-100 translate-x-0 relative z-20 pointer-events-auto"
                  : "opacity-0 translate-x-full absolute top-0 left-0 z-10 pointer-events-none"
              }`}
            >
              <Signup onSwitchMode={switchMode} isEmbedded={true} />
            </div>

            {/* FORGOT PASSWORD SLIDE MODE */}
            <div
              className={`w-full transition-all duration-500 ease-in-out transform ${
                mode === "forgot-password"
                  ? "opacity-100 translate-x-0 relative z-20 pointer-events-auto"
                  : "opacity-0 translate-x-full absolute top-0 left-0 z-10 pointer-events-none"
              }`}
            >
              <ForgotPassword onSwitchMode={switchMode} isEmbedded={true} />
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} STEPS CRM Enterprise. All rights reserved.
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPortal;
