import React, { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Lock, ShieldAlert, CheckCircle, Eye, EyeOff } from "lucide-react";

const ChangePasswordModal = ({ isOpen, onSuccess }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post("/api/auth/change-password", { newPassword });
      toast.success("Password changed successfully! You may now access the system.");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-white relative">
        <div className="flex items-center gap-3 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
          <ShieldAlert size={28} className="shrink-0" />
          <div>
            <h3 className="font-bold text-sm">Temporary Password Detected</h3>
            <p className="text-[11px] text-amber-300/80">You logged in using a temporary password. You must set a new secure password to proceed.</p>
          </div>
        </div>

        {error && <div className="mb-4 p-2.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Permanent Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 text-xs"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-bold rounded-xl text-xs hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? "Updating Password..." : "Set New Password & Proceed"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
