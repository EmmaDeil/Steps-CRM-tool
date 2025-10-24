// src/auth/Auth.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { AnimatePresence } from "framer-motion";
import LoginForm from "./Login";
import SignupForm from "./Signup";
import { signInWithGoogle } from "../../firebase";
import toast from "react-hot-toast";
import "./Auth.css";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      toast.success("Signed in with Google");
      // firebase observer will redirect via App route logic
    } catch (err) {
      toast.error(err.message || "Google sign-in failed");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          {isLogin ? "Welcome Back 👋" : "Create an Account ✨"}
        </h1>

        <AnimatePresence mode="wait">
          {isLogin ? (
            <div key="login">
              <LoginForm />
            </div>
          ) : (
            <div key="signup">
              <SignupForm />
            </div>
          )}
        </AnimatePresence>

        <div className="auth-actions">
          <button onClick={handleGoogle} className="auth-button google">
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google"
              className="google-icon"
            />
            Continue with Google
          </button>
        </div>

        <div className="text-center mt-4">
          {isLogin ? (
            <p className="small text-secondary">
              Don’t have an account?{" "}
              <button
                className="btn-outline-custom"
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="small text-secondary">
              Already have an account?{" "}
              <button
                className="btn-outline-custom"
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

Auth.propTypes = {
  // If you expect children or other props, define here
};

export default Auth;
