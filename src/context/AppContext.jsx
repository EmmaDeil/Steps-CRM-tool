import React, { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useUser } from "@clerk/clerk-react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState("user"); // Default role
  const [notifications, setNotifications] = useState([]);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem("searchHistory");
    return saved ? JSON.parse(saved) : [];
  });

  // No theme support: removed theme state and DOM data-theme manipulation.

  // Add to search history
  const addSearchHistory = (query) => {
    if (!query.trim()) return;

    const newHistory = [
      query,
      ...searchHistory.filter((q) => q !== query),
    ].slice(0, 10);
    setSearchHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  // If a user is signed in via Clerk, treat them as admin for this project
  // (per project requirement that the currently-signed-in user has full admin rights).
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      setUserRole("admin");
    }
  }, [isLoaded, user]);

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem("searchHistory");
  };

  // Add notification
  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  };

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
  };

  // Check module access based on role
  const hasModuleAccess = (moduleName) => {
    if (userRole === "admin") return true;

    // Define role-based access
    const rolePermissions = {
      user: ["Accounting", "Inventory", "Attendance", "Analytics"],
      manager: [
        "Accounting",
        "Inventory",
        "HR Management",
        "Attendance",
        "Finance",
        "Analytics",
      ],
      admin: ["*"], // All modules
    };

    const allowedModules = rolePermissions[userRole] || [];
    return allowedModules.includes("*") || allowedModules.includes(moduleName);
  };

  const value = {
    userRole,
    setUserRole,
    notifications,
    addNotification,
    markAsRead,
    clearNotifications,
    searchHistory,
    addSearchHistory,
    clearSearchHistory,
    hasModuleAccess,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppContext;
