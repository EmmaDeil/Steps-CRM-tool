import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import toast from "react-hot-toast";

const ForgotPassword = ({ onSwitchMode, isEmbedded = false }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setEmailSent(true);
        toast.success("Password reset link sent to your email");
      } else {
        toast.error(result.error || "Failed to send reset link");
      }
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmbedded) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            {emailSent
              ? "Temporary password dispatched"
              : "Enter your registered email to receive a temporary login password"}
          </p>
        </div>

        {emailSent ? (
          <div className="text-center space-y-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
              <i className="fa-solid fa-check text-xl"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Temporary Password Dispatched</h3>
              <p className="text-xs text-slate-600 mt-1">
                We sent a temporary password to <span className="font-semibold text-indigo-600">{email}</span>
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
                className="w-full py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Try Another Email
              </button>
              <button
                type="button"
                onClick={() => onSwitchMode ? onSwitchMode('login') : null}
                className="w-full py-2 text-indigo-600 hover:text-indigo-700 text-xs font-bold"
              >
                Return to Sign In
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                />
                <i className="fa-solid fa-envelope absolute left-3.5 top-3.5 text-xs text-slate-400"></i>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Sending Instructions..." : "Send Temporary Password"}
            </button>

            <div className="text-center pt-3 text-xs text-slate-500">
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => onSwitchMode ? onSwitchMode('login') : null}
                className="text-indigo-600 hover:text-indigo-700 font-bold"
              >
                Return to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50 mb-4">
            <i className="fa-solid fa-key text-2xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600">
            {emailSent
              ? "Check your email for reset instructions"
              : "Enter your email to receive a password reset link"}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          {emailSent ? (
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
                <i className="fa-solid fa-check text-3xl"></i>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Email Sent!
                </h3>
                <p className="text-gray-600">
                  We've sent a password reset link to{" "}
                  <span className="font-semibold">{email}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Didn't receive it? Check your spam folder or try again.
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  className="w-full py-3 px-4 border-2 border-gray-300 rounded-xl shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Try Another Email
                </button>
                <Link
                  to="/"
                  className="block w-full py-3 px-4 text-center rounded-xl text-base font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i>
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-envelope text-gray-400"></i>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane mr-2"></i>
                    Send Reset Link
                  </>
                )}
              </button>

              {/* Back to Login Link */}
              <div className="text-center">
                <Link
                  to="/"
                  className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i>
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            {new Date().getFullYear()} Ladeil Innovation Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
