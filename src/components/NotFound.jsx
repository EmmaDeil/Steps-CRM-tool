import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "./NotFound.css";

const NotFound = () => {
  return (
    <div className="notfound-bg">
      <div className="notfound-card">
        <h2 className="notfound-title">Oops! Page not found</h2>
        <p className="notfound-desc">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/home"
          className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <i className="fa-solid fa-home text-base"></i>
          Home
        </Link>
      </div>
    </div>
  );
};

NotFound.propTypes = {
  // If you expect props, define here
};

export default NotFound;
