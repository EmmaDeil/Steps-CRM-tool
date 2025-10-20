// src/auth/Auth.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginForm from "./Login";
import SignupForm from "./Signup";
import { signInWithGoogle } from "../firebase";
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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 to-blue-300 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md relative overflow-hidden">
        <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">
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

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleGoogle}
            className="flex-1 py-2 rounded-lg border hover:shadow-sm transition font-medium"
          >
            Continue with Google
          </button>
        </div>

        <div className="text-center mt-4">
          {isLogin ? (
            <p className="text-sm text-gray-600">
              Don’t have an account?{" "}
              <button
                className="text-blue-600 font-medium hover:underline"
                onClick={() => setIsLogin(false)}
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                className="text-blue-600 font-medium hover:underline"
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
