import React from "react";
import PropTypes from "prop-types";
import { SignIn } from "@clerk/clerk-react";
import "./Auth.css";

const Auth = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Welcome to Steps CRM</h1>
        <div className="d-flex justify-content-center mt-4">
          <SignIn afterSignInUrl="/dashboard" redirectUrl="/dashboard" />
        </div>
      </div>
    </div>
  );
};

Auth.propTypes = {};

export default Auth;
