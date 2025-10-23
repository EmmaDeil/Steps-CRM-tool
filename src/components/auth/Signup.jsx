import React from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { registerUser, sendVerificationEmail } from "../../firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const userCredential = await registerUser(data.email, data.password);
      await sendVerificationEmail(userCredential.user);
      toast.success("Verification email sent! Please check your inbox.");
      navigate("/");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-gray-700 font-medium mb-1">
          Full Name
        </label>
        <input
          type="text"
          {...register("fullName", { required: "Full name is required" })}
          placeholder="Your Name"
          className="auth-input"
        />
        {errors.fullName && (
          <span className="text-red-500 text-sm">
            {errors.fullName.message}
          </span>
        )}
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Username</label>
        <input
          type="text"
          {...register("username", { required: "Username is required" })}
          placeholder="Your Username"
          className="auth-input"
        />
        {errors.username && (
          <span className="text-red-500 text-sm">
            {errors.username.message}
          </span>
        )}
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Email</label>
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
        <label className="block text-gray-700 font-medium mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          {...register("phoneNumber", {
            required: "Phone number is required",
            pattern: {
              value: /^\+?[0-9\s-]{7,15}$/,
              message: "Invalid phone number",
            },
          })}
          placeholder="+1 234 567 8900"
          className="auth-input"
        />
        {errors.phoneNumber && (
          <span className="text-red-500 text-sm">
            {errors.phoneNumber.message}
          </span>
        )}
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Password</label>
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

      <button type="submit" className="btn-custom">
        Sign Up
      </button>
    </form>
  );
};

Signup.propTypes = {
  // If you expect props, define here
};

export default Signup;
