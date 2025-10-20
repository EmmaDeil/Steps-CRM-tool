// src/auth/LoginForm.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { loginUser, signInWithGoogle, resetPassword } from "../firebase";
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

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      toast.success("Welcome via Google!");
      navigate("/dashboard"); // ✅ immediate redirect
    } catch (err) {
      toast.error(err.message);
    }
  };

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
        <label className="block text-gray-700 font-medium mb-1">
          Email Address
        </label>
        <input
          type="email"
          {...register("email")}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">
          Password
        </label>
        <input
          type="password"
          {...register("password")}
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="accent-blue-500" /> Remember me
        </label>
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-blue-600 hover:underline"
        >
          Forgot password?
        </button>
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Login
      </button>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full mt-2 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition"
      >
        Continue with Google
      </button>
    </form>
  );
};

export default Login;
