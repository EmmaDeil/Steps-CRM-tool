// src/auth/LoginForm.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { loginUser, resetPassword } from "../../firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const navigate = useNavigate();
  const { register, handleSubmit } = useForm();

  const onSubmit = async (data) => {
    try {
      await loginUser(data.email, data.password);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    }
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
    const email = prompt("Enter your email for password reset:");
    if (email) {
      try {
        await resetPassword(email);
        toast.success("Password reset email sent!");
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="d-block text-dark fw-medium mb-2">
          Email Address
        </label>
        <input
          type="email"
          {...register("email")}
          placeholder="you@example.com"
          className="auth-input"
        />
      </div>

      <div>
        <label className="d-block text-dark fw-medium mb-1">
          Password
        </label>
        <input
          type="password"
          {...register("password")}
          placeholder="••••••••"
          className="auth-input"
        />
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

      <button
        type="submit"
        className="btn-custom"
      >
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

export default Login;
