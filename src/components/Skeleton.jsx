import React from "react";
import PropTypes from "prop-types";

/**
 * Skeleton Loader Component
 * Shows placeholder while content is loading
 */
const Skeleton = ({
  count = 1,
  height = 20,
  width = "100%",
  circle = false,
  className = "",
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${
            circle ? "rounded-full" : "rounded"
          } mb-2.5 ${className}`}
          style={{
            height: `${height}px`,
            width: circle ? `${height}px` : width,
            animation: "skeleton-loading 1.5s ease-in-out infinite",
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

Skeleton.propTypes = {
  count: PropTypes.number,
  height: PropTypes.number,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  circle: PropTypes.bool,
  className: PropTypes.string,
};

export default Skeleton;
