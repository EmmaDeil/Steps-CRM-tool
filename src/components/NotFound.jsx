import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div>
      <h2>Oops! Page not found</h2>
      <Link to="/" className="btn btn-primary">
        Go to Dashboard
      </Link>
    </div>
  );
};

NotFound.propTypes = {
  // If you expect props, define here
};

export default NotFound;
