import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import toast from "react-hot-toast";

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyMfa } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaPendingToken, setMfaPendingToken] = useState(null);
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const mfaInputRefs = useRef([]);

  useEffect(() => {
    if (mfaStep && mfaInputRefs.current[0]) {
      mfaInputRefs.current[0].focus();
    }
  }, [mfaStep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const isLoginComplete = () => {
    const email = (formData.email || "").toString().trim();
    const password = (formData.password || "").toString();
    if (!email || !password) return false;
    if (!/^\S+@\S+\.\S+$/.test(email)) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation
    const newErrors = {};
    const email = (formData.email || "").toString().trim();
    const password = (formData.password || "").toString();
    if (!email) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      newErrors.email = "Enter a valid email";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);

    try {
      const result = await login(
        formData.email,
        formData.password,
        formData.rememberMe,
      );
      if (result.success) {
        if (result.mfaRequired) {
          // MFA verification needed
          setMfaPendingToken(result.mfaPendingToken);
          setMfaStep(true);
          return;
        }
        if (result.mfaSetupRequired) {
          toast("MFA setup required by your organization", { icon: "🔐" });
          navigate("/home?mfaSetup=true");
          return;
        }
        toast.success("Welcome back!");
        navigate("/home");
      } else {
        toast.error(result.error || "Invalid email or password");
      }
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...mfaCode];
    newCode[index] = value;
    setMfaCode(newCode);
    // Auto-advance to next input
    if (value && index < 5) {
      mfaInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMfaKeyDown = (index, e) => {
    if (e.key === "Backspace" && !mfaCode[index] && index > 0) {
      mfaInputRefs.current[index - 1]?.focus();
    }
  };

  const handleMfaPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...mfaCode];
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || "";
      }
      setMfaCode(newCode);
      const focusIndex = Math.min(pasted.length, 5);
      mfaInputRefs.current[focusIndex]?.focus();
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    const code = mfaCode.join("");
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyMfa(
        mfaPendingToken,
        code,
        formData.rememberMe,
      );
      if (result.success) {
        if (result.usedBackupCode) {
          toast(
            `Verified with backup code. ${result.remainingBackupCodes} remaining.`,
            { icon: "⚠️" },
          );
        } else {
          toast.success("Welcome back!");
        }
        navigate("/home");
      } else {
        toast.error(result.error || "Invalid verification code");
        setMfaCode(["", "", "", "", "", ""]);
        mfaInputRefs.current[0]?.focus();
      }
    } catch (_error) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">
      {/* Left Panel - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo and Company Name */}
          <div>
            <div className="flex items-center space-x-3 mb-12">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <i className="fa-solid fa-building text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Netlink</h2>
                <p className="text-sm text-blue-200">
                  Enterprise Management System
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-8 mt-16">
              <h3 className="text-3xl font-bold leading-tight">
                Streamline Your
                <br />
                Business Operations
              </h3>
              <p className="text-lg text-blue-100 max-w-md">
                Comprehensive enterprise resource planning and management
                solution for modern organizations.
              </p>

              {/* Key Features */}
              <div className="space-y-4 mt-12">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-check text-xs text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      Complete HR Management
                    </h4>
                    <p className="text-blue-200 text-sm">
                      Employee records, payroll, attendance & leave tracking
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-check text-xs text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Financial Control</h4>
                    <p className="text-blue-200 text-sm">
                      Budget management, accounting & financial reporting
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-check text-xs text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      Procurement & Inventory
                    </h4>
                    <p className="text-blue-200 text-sm">
                      Purchase orders, vendor management & stock control
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-blue-200">
            <p>
              © {new Date().getFullYear()} Netlink App. All rights reserved.
            </p>
            <p className="mt-2">Secure • Reliable • Scalable</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-2 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 shadow-lg mb-4">
              <i className="fa-solid fa-building text-2xl text-white"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Netlink</h2>
          </div>

          {mfaStep ? (
            <>
              {/* MFA Verification Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Two-Factor Authentication
                </h1>
                <p className="text-gray-600">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-6 sm:px-8 sm:py-8">
                <form onSubmit={handleMfaSubmit} className="space-y-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <i className="fa-solid fa-shield-halved text-blue-600 text-2xl"></i>
                    </div>
                  </div>

                  {/* 6-digit code input */}
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handleMfaPaste}
                  >
                    {mfaCode.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => (mfaInputRefs.current[i] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleMfaCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleMfaKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                      />
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    You can also use a backup code if you don't have access to
                    your authenticator
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading || mfaCode.join("").length < 6}
                    className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify Code
                        <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaStep(false);
                      setMfaPendingToken(null);
                      setMfaCode(["", "", "", "", "", ""]);
                    }}
                    className="w-full text-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-left mr-1.5"></i>
                    Back to login
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Form Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back
                </h1>
                <p className="text-gray-600">
                  Please enter your credentials to access your account
                </p>
              </div>

              {/* Login Form */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-5 py-6 sm:px-8 sm:py-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Work Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <i className="fa-solid fa-envelope text-gray-400 text-sm"></i>
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                        placeholder="your.name@company.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1.5 flex items-center">
                        <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <i className="fa-solid fa-lock text-gray-400 text-sm"></i>
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <i
                          className={`fa-solid text-sm ${
                            showPassword ? "fa-eye-slash" : "fa-eye"
                          }`}
                        ></i>
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-red-600 text-sm mt-1.5 flex items-center">
                        <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center">
                      <input
                        id="rememberMe"
                        name="rememberMe"
                        type="checkbox"
                        checked={formData.rememberMe}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rememberMe: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                      <label
                        htmlFor="rememberMe"
                        className="ml-2.5 block text-sm text-gray-700 cursor-pointer select-none"
                      >
                        Keep me signed in
                      </label>
                    </div>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !isLoginComplete()}
                    className="w-full mt-6 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                        Signing you in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-white text-gray-500">
                      Don't have an account?
                    </span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <Link
                  to="/signup"
                  className="w-full inline-flex items-center justify-center py-3 px-4 border-2 border-gray-300 rounded-lg shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-200"
                >
                  Create New Account
                  <i className="fa-solid fa-user-plus ml-2 text-sm"></i>
                </Link>
              </div>

              {/* Security Notice */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center">
                  <i className="fa-solid fa-shield-halved mr-1.5 text-green-600"></i>
                  Your connection is secured with enterprise-grade encryption
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
