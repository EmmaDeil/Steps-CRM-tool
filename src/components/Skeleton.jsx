import React from "react";
import PropTypes from "prop-types";
import "./Skeleton.css";

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
          className={`skeleton ${circle ? "skeleton-circle" : ""} ${className}`}
          style={{
            height: `${height}px`,
            width: circle ? `${height}px` : width,
            marginBottom: "10px",
          }}
        />
      ))}
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
