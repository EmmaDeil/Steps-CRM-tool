// src/dashboard/LogoutButton.jsx
import React from "react";
import { signOut } from "../firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message || "Logout failed");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
    >
      Logout
    </button>
  );
};

export default LogoutButton;
