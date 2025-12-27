import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import stepsLogo from "../assets/steps-logo.ico";
import NotificationCenter from "./NotificationCenter";
import { apiService } from "../services/api";

const Navbar = ({ user }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch user profile picture on component mount
  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const response = await apiService.user.getProfile(user?.id);

        if (response.data.success && response.data.data?.profilePicture) {
          setProfilePicture(response.data.data.profilePicture);
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
        // Silently fail - just use initials
      }
    };

    if (user?.id) {
      fetchProfilePicture();
    }
  }, [user?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleNavigateToProfile = () => {
    setIsDropdownOpen(false);
    navigate("/home/profile");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-[#dbe0e6]">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: App Name */}
        <div className="flex items-center gap-3">
          <img src={stepsLogo} alt="StepsERP Logo" className="w-8 h-8" />
          <h1 className="text-lg font-bold text-[#111418]">NETLINK</h1>
        </div>

        {/* Right: Notification & User */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <NotificationCenter />

          {/* User Avatar with Dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="User menu"
              >
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt={user?.fullName || "User"}
                    className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 hover:border-blue-400"
                    title={user?.fullName || "User"}
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs"
                    title={user?.fullName || "User"}
                  >
                    {user?.firstName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-[#dbe0e6] py-2">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-[#dbe0e6]">
                    <div className="flex items-center gap-3">
                      {profilePicture ? (
                        <img
                          src={profilePicture}
                          alt={user?.fullName || "User"}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                          {user?.firstName?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111418] truncate">
                          {user?.fullName || "User"}
                        </p>
                        <p className="text-xs text-[#617589] truncate">
                          {user?.primaryEmailAddress?.emailAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profile */}
                  <button
                    onClick={handleNavigateToProfile}
                    className="w-full text-left px-4 py-2 text-sm text-[#111418] hover:bg-gray-100 flex items-center gap-3 transition-colors"
                  >
                    <i className="fa-solid fa-user text-sm w-4"></i>
                    <span>View Profile</span>
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      // Add settings navigation if needed
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#111418] hover:bg-gray-100 flex items-center gap-3 transition-colors"
                  >
                    <i className="fa-solid fa-gear text-sm w-4"></i>
                    <span>Settings</span>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-[#dbe0e6] my-2" />

                  {/* Logout */}
                  <button
                    onClick={async () => {
                      setIsDropdownOpen(false);
                      await logout();
                      navigate("/");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                  >
                    <i className="fa-solid fa-sign-out-alt text-sm w-4"></i>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

Navbar.propTypes = {
  user: PropTypes.object,
};
