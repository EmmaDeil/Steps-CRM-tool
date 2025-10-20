// src/auth/SignupForm.jsx
import React from "react";
import { useForm } from "react-hook-form";
import { registerWithEmail, sendVerificationEmail } from "../firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const userCredential = await registerWithEmail(data.email, data.password);
      // Optionally send verification email
      try {
        await sendVerificationEmail(userCredential.user);
        toast.success("Verification email sent. Check your inbox.");
      } catch (err) {
        // non-critical
        console.warn("Verification email error:", err);
      }

      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.message || "Signup failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-gray-700 font-medium mb-1">Full name</label>
        <input
          type="text"
          {...register("fullName", { required: "Full name is required" })}
          placeholder="John Doe"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        {errors.fullName && (
          <p className="text-sm text-red-500 mt-1">{errors.fullName.message}</p>
        )}
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Email</label>
        <input
          type="email"
          {...register("email", { required: "Email is required" })}
          placeholder="you@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        {errors.email && (
          <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Password</label>
        <input
          type="password"
          {...register("password", {
            required: "Password is required",
            minLength: { value: 6, message: "Minimum length is 6" },
          })}
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        {errors.password && (
          <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="block text-gray-700 font-medium mb-1">Confirm Password</label>
        <input
          type="password"
          {...register("confirmPassword", {
            required: "Confirm your password",
            validate: (val) =>
              val === watch("password") || "Passwords do not match",
          })}
          placeholder="••••••••"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-green-600 text-white font-semibold py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
      >
        {isSubmitting ? "Creating account..." : "Sign Up"}
      </button>
    </form>
  );
};

export default Signup;
