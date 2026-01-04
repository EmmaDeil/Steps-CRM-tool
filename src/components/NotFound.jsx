import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 sm:p-10 max-w-md w-full text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4">
          Oops! Page not found
        </h2>
        <p className="text-gray-600 mb-8 text-sm sm:text-base">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/home"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 transition-colors"
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
