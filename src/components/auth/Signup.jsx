import React from "react";
import { useForm } from "react-hook-form";
import { registerUser, sendVerificationEmail } from "../../firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const { register, handleSubmit } = useForm();
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
        <label className="block text-gray-700 font-medium mb-1">Full Name</label>
        <input
          type="text"
          {...register("fullName")}
          placeholder="Your Name"
          className="auth-input"
        />
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Username</label>
        <input
          type="text"
          {...register("username")}
          placeholder="Your Username"
          className="auth-input"
        />
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Email</label>
        <input
          type="email"
          {...register("email")}
          placeholder="you@example.com"
          className="auth-input"
        />
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Phone Number</label>
        <input
          type="tel"
          {...register("phoneNumber")}
          placeholder="+1 234 567 8900"
          className="auth-input"
        />
      </div>
      <div>
        <label className="block text-gray-700 font-medium mb-1">Password</label>
        <input
          type="password"
          {...register("password")}
          placeholder="••••••••"
          className="auth-input"
        />
      </div>

      <button
        type="submit"
        className="btn-custom"
      >
        Sign Up
      </button>
    </form>
  );
};

export default Signup;
