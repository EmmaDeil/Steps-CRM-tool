// src/auth/Auth.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginForm from "./Login";
import SignupForm from "./Signup";
import { signInWithGoogle } from "../../firebase";
import toast from "react-hot-toast";

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
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.45 }}
            >
              <LoginForm />
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.45 }}
            >
              <SignupForm />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="auth-actions">
          <button
            onClick={handleGoogle}
            className="auth-button"
          >
            Continue with Google
          </button>
        </div>

        <div className="text-center mt-4">
          {isLogin ? (
            <p className="small text-secondary">
              Don’t have an account?{" "}
              <button
                className="btn btn-outline-primary fw-medium text-decoration-none hover-underline"
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="small text-secondary">
              Already have an account?{" "}
              <button
                className="btn btn-outline-primary fw-medium text-decoration-none hover-underline"
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

export default Auth;
