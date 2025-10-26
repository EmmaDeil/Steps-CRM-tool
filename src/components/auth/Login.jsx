// src/auth/LoginForm.jsx
import React from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
// Login/reset disabled — backend removed
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Login = () => {
  // navigate kept for potential future use (prefixed to avoid unused-var lint)
  const _navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async () => {
    toast.error("Login is unavailable (backend removed).");
  };

  // const handleGoogle = async () => {
  //   try {
  //     await signInWithGoogle();
  //     toast.success("Welcome via Google!");
  //     navigate("/dashboard"); // ✅ immediate redirect
  //   } catch (err) {
  //     toast.error(err.message);
  //   }
  // };

  const handleForgotPassword = async () => {
    toast.error("Password reset is unavailable (backend removed).");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="d-block text-dark fw-medium mb-2">
          Email Address
        </label>
        <input
          type="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Invalid email address",
            },
          })}
          placeholder="you@example.com"
          className="auth-input"
        />
        {errors.email && (
          <span className="text-red-500 text-sm">{errors.email.message}</span>
        )}
      </div>

      <div>
        <label className="d-block text-dark fw-medium mb-1">Password</label>
        <input
          type="password"
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 6,
              message: "Password must be at least 6 characters",
            },
          })}
          placeholder="••••••••"
          className="auth-input"
        />
        {errors.password && (
          <span className="text-red-500 text-sm">
            {errors.password.message}
          </span>
        )}
      </div>

      <div className="flex-between">
        <label className="flex-gap">
          <input type="checkbox" className="accent-blue-500" /> Remember me
        </label>
        <button
          type="button"
          onClick={handleForgotPassword}
          className="btn-link-custom"
        >
          Forgot password?
        </button>
      </div>

      <button type="submit" className="btn-custom">
        Login
      </button>

      {/* <button
        type="button"
        onClick={handleGoogle}
        className="w-full mt-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
      >
        Continue with Google
      </button> */}
    </form>
  );
};

Login.propTypes = {
  // If you expect props, define here
};

export default Login;
