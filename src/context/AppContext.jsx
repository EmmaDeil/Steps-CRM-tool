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

  // Retirement page header state (persisted)
  const [monthYear, setMonthYear] = useState(() => {
    const stored = localStorage.getItem("retirement.monthYear");
    if (stored) return stored;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`; // default to current month
  });
  const [previousClosingBalance, setPreviousClosingBalance] = useState(() => {
    const v = localStorage.getItem("retirement.previousClosingBalance");
    return v !== null ? v : "";
  });
  const [inflowAmount, setInflowAmount] = useState(() => {
    const v = localStorage.getItem("retirement.inflowAmount");
    return v !== null ? v : "";
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

  // Persist retirement header values
  useEffect(() => {
    localStorage.setItem("retirement.monthYear", monthYear || "");
  }, [monthYear]);

  useEffect(() => {
    localStorage.setItem(
      "retirement.previousClosingBalance",
      previousClosingBalance === "" ? "" : String(previousClosingBalance)
    );
  }, [previousClosingBalance]);

  useEffect(() => {
    localStorage.setItem(
      "retirement.inflowAmount",
      inflowAmount === "" ? "" : String(inflowAmount)
    );
  }, [inflowAmount]);

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
    // Retirement header values
    monthYear,
    setMonthYear,
    previousClosingBalance,
    setPreviousClosingBalance,
    inflowAmount,
    setInflowAmount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

AppProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppContext;
