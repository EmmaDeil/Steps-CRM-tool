import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { useClerk } from "@clerk/clerk-react";
import stepsLogo from "../assets/steps-logo.ico";
import NotificationCenter from "./NotificationCenter";

const Navbar = ({ user }) => {
  const { signOut } = useClerk();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-[#111418] border-b border-[#dbe0e6] dark:border-gray-800">
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Left: App Name */}
        <div className="flex items-center gap-3">
          <img src={stepsLogo} alt="StepsERP Logo" className="w-8 h-8" />
          <h1 className="text-lg font-bold text-[#111418] dark:text-white">
            stepsERP
          </h1>
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
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="User menu"
              >
                <div
                  className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white font-semibold"
                  title={user?.fullName || "User"}
                >
                  {user?.firstName?.charAt(0).toUpperCase() || "U"}
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#1e293b] rounded-lg shadow-lg border border-[#dbe0e6] dark:border-gray-700 py-2">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-[#dbe0e6] dark:border-gray-700">
                    <p className="text-sm font-semibold text-[#111418] dark:text-white">
                      {user?.fullName || "User"}
                    </p>
                    <p className="text-xs text-[#617589] dark:text-gray-400">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>

                  {/* Profile */}
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      // Add profile navigation if needed
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#111418] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-user text-sm"></i>
                    Profile
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      // Add settings navigation if needed
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#111418] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-gear text-sm"></i>
                    Settings
                  </button>

                  {/* Divider */}
                  <div className="border-t border-[#dbe0e6] dark:border-gray-700 my-2" />

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut({ redirectUrl: "/" });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors font-medium"
                  >
                    <i className="fa-solid fa-sign-out-alt text-sm"></i>
                    Logout
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
