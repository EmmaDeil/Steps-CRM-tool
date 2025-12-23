import React from "react";
import PropTypes from "prop-types";
import "./EmptyState.css";

/**
 * Empty State Component
 * Displays a friendly message when no data is available
 */
const EmptyState = ({
  icon = "📭",
  title = "No data found",
  description = "There's nothing to display right now.",
  action = null,
  variant = "default",
}) => {
  return (
    <div className={`empty-state empty-state-${variant}`}>
      <div className="empty-state-icon">{icon}</div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-description">{description}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.element,
  variant: PropTypes.oneOf(["default", "search", "error"]),
};

EmptyState.defaultProps = {
  icon: "📭",
  description: "There's nothing to display right now.",
  action: null,
  variant: "default",
};

export default EmptyState;
