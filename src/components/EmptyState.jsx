import React from "react";
import PropTypes from "prop-types";

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
  const variantClasses = {
    default: "bg-gray-50 text-gray-600",
    search: "bg-yellow-50 text-yellow-800",
    error: "bg-red-50 text-red-800",
  };

  const titleClasses = {
    default: "text-gray-900",
    search: "text-yellow-800",
    error: "text-red-900",
  };

  const descClasses = {
    default: "text-gray-600",
    search: "text-yellow-700",
    error: "text-red-700",
  };

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg my-8 min-h-[300px] ${variantClasses[variant]}`}
    >
      <div className="text-5xl sm:text-6xl leading-none mb-4 opacity-60">
        {icon}
      </div>
      <h4
        className={`text-xl sm:text-2xl font-semibold mb-2 ${titleClasses[variant]}`}
      >
        {title}
      </h4>
      <p
        className={`text-sm sm:text-base mb-6 max-w-md ${descClasses[variant]}`}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
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
