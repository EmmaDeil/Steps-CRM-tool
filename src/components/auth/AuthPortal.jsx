import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
import ForgotPassword from "./ForgotPassword";
import { ShieldCheck, CheckCircle, Lock, Building2 } from "lucide-react";

const MODES = ["login", "signup", "forgot-password"];

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
  const modeRef = useRef(mode);

  useEffect(() => {
    const newMode = getModeFromPath(location.pathname);
    modeRef.current = newMode;
    setMode(newMode);
  }, [location.pathname]);

  const switchMode = (newMode) => {
    if (newMode === modeRef.current) return;
    modeRef.current = newMode;
    setMode(newMode);

    // Update browser URL
    const targetPath = newMode === "signup" ? "/signup" : newMode === "forgot-password" ? "/forgot-password" : "/";
    navigate(targetPath, { replace: true });
  };

  const activeIndex = MODES.indexOf(mode);

  // Positional slide classes: panels stay mounted (preserving typed input) and
  // slide left/right based on their position relative to the active tab.
  const slideClass = (m) => {
    const offset = MODES.indexOf(m) - activeIndex;
    if (offset === 0) {
      return "opacity-100 translate-x-0 visible relative z-20 pointer-events-auto";
    }
    return `opacity-0 invisible absolute top-0 left-0 w-full z-10 pointer-events-none ${offset < 0 ? "-translate-x-12" : "translate-x-12"
      }`;
  };

  return (
    <div className="min-h-screen w-full bg-slate-100/80 flex items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Animated Gradient Accents */}
      <div className="absolute -top-8 -left-8 w-[26rem] h-[26rem] bg-indigo-300/40 rounded-full blur-3xl pointer-events-none auth-float"></div>
      <div className="absolute -bottom-12 -right-8 w-[26rem] h-[26rem] bg-blue-300/40 rounded-full blur-3xl pointer-events-none auth-float-delayed"></div>

      {/* Main Container */}
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl shadow-slate-300/60 border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 lg:min-h-[680px] relative z-10 auth-scale-in">

        {/* Left Side: SaaS Showcase Hero Panel (5 cols) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 auth-gradient-shift p-8 lg:p-12 flex-col justify-between relative overflow-hidden text-white">
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none auth-float"></div>
          <div className="absolute -left-24 top-1/4 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none auth-float-delayed"></div>

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
                  Intranet <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white font-semibold">Possibilty</span>
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
            <div className="space-y-3.5 my-6 auth-stagger">
              {[
                { title: "Material Request & Payment Gate", desc: "5-stage procurement workflow with GRN inventory sync" },
                { title: "Multi-level Approval Engine", desc: "Configurable approval chains and role routing" },
                { title: "Real-Time WebSocket Sync", desc: "Live operational updates and security activity tracking" },
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm hover:bg-white/15 hover:translate-x-1 transition-all duration-300"
                >
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

          {/* Mobile Brand Header */}
          <div className="flex lg:hidden items-center gap-3 mb-6 auth-fade-up">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-slate-900">
                Intranet <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-semibold align-middle">Possibility</span>
              </h1>
              <p className="text-[11px] text-slate-500">Enterprise Operating Platform</p>
            </div>
          </div>

          {/* Top Mode Navigation Tabs with Sliding Indicator */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-6">
            <div className="relative grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200 w-full max-w-[360px]">
              <span
                aria-hidden="true"
                className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] bg-indigo-600 rounded-lg shadow-sm transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${activeIndex * 100}%)` }}
              ></span>
              {["Sign In", "Create Account", "Reset Password"].map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => switchMode(MODES[idx])}
                  className={`relative z-10 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors duration-300 ${activeIndex === idx ? "text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>256-bit Encrypted</span>
            </div>
          </div>

          {/* Sliding Container — panels stay mounted (preserving form state) and slide
              horizontally with a fade based on their position vs the active tab */}
          <div className="flex-grow flex flex-col justify-center relative min-h-[480px]">
            <div
              aria-hidden={activeIndex !== 0}
              className={`w-full transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${slideClass("login")}`}
            >
              <Login onSwitchMode={switchMode} isEmbedded={true} />
            </div>

            <div
              aria-hidden={activeIndex !== 1}
              className={`w-full transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${slideClass("signup")}`}
            >
              <Signup onSwitchMode={switchMode} isEmbedded={true} />
            </div>

            <div
              aria-hidden={activeIndex !== 2}
              className={`w-full transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${slideClass("forgot-password")}`}
            >
              <ForgotPassword onSwitchMode={switchMode} isEmbedded={true} />
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-100 mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Intranet Enterprise. All rights reserved.
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPortal;
