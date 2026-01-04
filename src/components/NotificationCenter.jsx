import React, { useState } from "react";
import { useAppContext } from "../context/useAppContext";

const NotificationCenter = () => {
  const { notifications, markAsRead, clearNotifications } = useAppContext();
  const [showDropdown, setShowDropdown] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id) => {
    markAsRead(id);
  };

  const handleClearAll = () => {
    clearNotifications();
    setShowDropdown(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "info":
      default:
        return "ℹ️";
    }
  };

  return (
    <div className="relative">
      <button
        className="relative p-2 text-gray-700 hover:text-gray-900 transition-colors"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-[350px] max-w-[calc(100vw-2rem)] max-h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h6 className="text-base font-semibold text-gray-900 mb-0">
                Notifications
              </h6>
              {notifications.length > 0 && (
                <button
                  className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center p-6 text-gray-500">
                  <div className="text-2xl mb-2">🔔</div>
                  <p className="mb-0">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        !notification.read ? "bg-blue-50" : "bg-white"
                      }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h6 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <span>{getNotificationIcon(notification.type)}</span>
                          {notification.title}
                        </h6>
                        <small className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(
                            notification.timestamp
                          ).toLocaleTimeString()}
                        </small>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white">
                          New
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
