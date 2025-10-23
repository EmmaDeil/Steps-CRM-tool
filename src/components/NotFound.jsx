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
        <Link to="/" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
};

NotFound.propTypes = {
  // If you expect props, define here
};

export default NotFound;
