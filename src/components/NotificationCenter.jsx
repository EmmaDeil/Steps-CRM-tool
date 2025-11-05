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
    <div className="position-relative">
      <button
        className="btn btn-link position-relative p-2"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z" />
        </svg>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ zIndex: 1040 }}
            onClick={() => setShowDropdown(false)}
          />
          <div
            className="position-absolute end-0 mt-2 card shadow-lg"
            style={{
              width: "350px",
              maxHeight: "500px",
              zIndex: 1050,
              overflow: "hidden",
            }}
          >
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="mb-0">Notifications</h6>
              {notifications.length > 0 && (
                <button
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={handleClearAll}
                >
                  Clear All
                </button>
              )}
            </div>
            <div
              className="card-body p-0"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              {notifications.length === 0 ? (
                <div className="text-center p-4 text-secondary">
                  <div className="mb-2">🔔</div>
                  <p className="mb-0">No notifications</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`list-group-item list-group-item-action ${
                        !notification.read ? "bg-light" : ""
                      }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <h6 className="mb-1">
                          <span className="me-2">
                            {getNotificationIcon(notification.type)}
                          </span>
                          {notification.title}
                        </h6>
                        <small className="text-secondary">
                          {new Date(
                            notification.timestamp
                          ).toLocaleTimeString()}
                        </small>
                      </div>
                      <p className="mb-1 small">{notification.message}</p>
                      {!notification.read && (
                        <span className="badge bg-primary badge-sm">New</span>
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
