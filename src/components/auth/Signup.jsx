import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import toast from "react-hot-toast";

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
    department: "",
    jobTitle: "",
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear inline error for that field when user changes it
    setErrors((prev) => ({ ...prev, [name]: null }));

    // Calculate password strength
    if (name === "password") {
      calculatePasswordStrength(value);
    }
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    setPasswordStrength(Math.min(strength, 100));
  };

  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [jobTitlesLoading, setJobTitlesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        // apiService returns response body thanks to interceptor
        const res = await (
          await import("../../services/api")
        ).default.get("/api/departments");
        if (mounted && res?.departments) setDepartments(res.departments);
      } catch (err) {
        console.error("Failed to fetch departments:", err);
      } finally {
        if (mounted) setDepartmentsLoading(false);
      }
    };

    const fetchJobTitles = async () => {
      try {
        setJobTitlesLoading(true);
        const res = await (
          await import("../../services/api")
        ).default.get("/api/job-titles");
        if (mounted && res?.jobTitles) setJobTitles(res.jobTitles);
      } catch (err) {
        console.error("Failed to fetch job titles:", err);
      } finally {
        if (mounted) setJobTitlesLoading(false);
      }
    };

    fetchDepartments();
    fetchJobTitles();
    return () => {
      mounted = false;
    };
  }, []);

  // Validate and return sanitized payload or null on failure. Sets inline errors on failure.
  const validateForm = () => {
    const firstName = (formData.firstName || "").toString().trim();
    const lastName = (formData.lastName || "").toString().trim();
    const email = (formData.email || "").toString().trim().toLowerCase();
    const password = (formData.password || "").toString();
    const confirmPassword = (formData.confirmPassword || "").toString();
    const role = formData.role || "user";
    const department = (formData.department || "").toString().trim();
    const jobTitle = (formData.jobTitle || "").toString().trim();
    const terms = formData.terms === true;

    const newErrors = {};
    if (!firstName) newErrors.firstName = "First name is required";
    if (!lastName) newErrors.lastName = "Last name is required";
    if (!email) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      newErrors.email = "Please provide a valid email address";

    if (!password || password.trim().length === 0)
      newErrors.password = "Password is required";
    else if (password.length < 8)
      newErrors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (!department) newErrors.department = "Please select a department";
    if (!jobTitle) newErrors.jobTitle = "Please select a job title";

    if (!terms)
      newErrors.terms =
        "You must agree to the Terms of Service and Privacy Policy";

    // Validate against loaded lists if available
    if (jobTitles.length > 0 && jobTitle && !jobTitles.includes(jobTitle))
      newErrors.jobTitle = "Please select a valid job title";
    if (
      departments.length > 0 &&
      department &&
      !departments.find((d) => d.name === department || d.code === department)
    )
      newErrors.department = "Please select a valid department";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Optionally show first error via toast for quick feedback
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return null;
    }

    return { firstName, lastName, email, password, role, department, jobTitle };
  };

  const isFormComplete = () => {
    const firstName = (formData.firstName || "").toString().trim();
    const lastName = (formData.lastName || "").toString().trim();
    const email = (formData.email || "").toString().trim();
    const password = (formData.password || "").toString();
    const confirmPassword = (formData.confirmPassword || "").toString();
    const department = (formData.department || "").toString().trim();
    const jobTitle = (formData.jobTitle || "").toString().trim();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !department ||
      !jobTitle ||
      !formData.terms
    )
      return false;
    if (!/^\S+@\S+\.\S+$/.test(email)) return false;
    if (password.length < 8) return false;
    if (password !== confirmPassword) return false;
    if (departmentsLoading || jobTitlesLoading) return false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = validateForm();
    if (!payload) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup(payload);
      if (result.success) {
        toast.success("Account created successfully!");
        navigate("/home");
      } else {
        toast.error(result.error || "Failed to create account");
      }
    } catch (_error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return "Weak";
    if (passwordStrength < 70) return "Medium";
    return "Strong";
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">
      {/* Left Panel - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo and Company Name */}
          <div>
            <div className="flex items-center space-x-3 mb-12">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <i className="fa-solid fa-building text-2xl text-white"></i>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Netlink</h2>
                <p className="text-sm text-purple-200">
                  Enterprise Management System
                </p>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-8 mt-16">
              <h3 className="text-3xl font-bold leading-tight">
                Join Our
                <br />
                Growing Team
              </h3>
              <p className="text-lg text-purple-100 max-w-md">
                Get started with enterprise-grade tools designed for modern
                workforce management.
              </p>

              {/* Benefits */}
              <div className="space-y-4 mt-12">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-check text-xs text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Instant Access</h4>
                    <p className="text-purple-200 text-sm">
                      Start using all features immediately after signup
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-check text-xs text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">
                      Secure & Compliant
                    </h4>
                    <p className="text-purple-200 text-sm">
                      Enterprise-grade security with data encryption
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <i className="fa-solid fa-check text-xs text-white"></i>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">24/7 Support</h4>
                    <p className="text-purple-200 text-sm">
                      Dedicated support team ready to assist you
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-purple-200">
            <p>
              © {new Date().getFullYear()} Netlink App. All rights reserved.
            </p>
            <p className="mt-2">Trusted by organizations worldwide</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-xl py-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-900 to-purple-900 shadow-lg mb-4">
              <i className="fa-solid fa-building text-2xl text-white"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Netlink</h2>
          </div>

          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create your account
            </h1>
            <p className="text-gray-600">
              Fill in your information to get started with Netlink
            </p>
          </div>

          {/* Signup Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-user text-gray-400 text-sm"></i>
                    </div>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                      placeholder="John"
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-red-600 text-sm mt-1.5 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                      {errors.firstName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-user text-gray-400 text-sm"></i>
                    </div>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                      placeholder="Doe"
                    />
                  </div>
                  {errors.lastName && (
                    <p className="text-red-600 text-sm mt-1.5 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Work Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <i className="fa-solid fa-envelope text-gray-400 text-sm"></i>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                    placeholder="your.name@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-600 text-sm mt-1.5 flex items-center">
                    <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Department and Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="department"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Department <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-building text-gray-400 text-sm"></i>
                    </div>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      disabled={departmentsLoading}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 disabled:opacity-60 bg-gray-50 hover:bg-white appearance-none cursor-pointer"
                    >
                      <option value="">
                        {departmentsLoading
                          ? "Loading..."
                          : "Select department"}
                      </option>
                      {departments.map((d) => (
                        <option key={d._id || d.id} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                    </div>
                  </div>
                  {errors.department && (
                    <p className="text-red-600 text-sm mt-1.5 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                      {errors.department}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="jobTitle"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-briefcase text-gray-400 text-sm"></i>
                    </div>
                    <select
                      id="jobTitle"
                      name="jobTitle"
                      value={formData.jobTitle}
                      onChange={handleChange}
                      disabled={jobTitlesLoading}
                      className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 disabled:opacity-60 bg-gray-50 hover:bg-white appearance-none cursor-pointer"
                    >
                      <option value="">
                        {jobTitlesLoading ? "Loading..." : "Select job title"}
                      </option>
                      {jobTitles.map((jt) => (
                        <option key={jt} value={jt}>
                          {jt}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
                    </div>
                  </div>
                  {errors.jobTitle && (
                    <p className="text-red-600 text-sm mt-1.5 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                      {errors.jobTitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Fields */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <i className="fa-solid fa-lock text-gray-400 text-sm"></i>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                    placeholder="Create a strong password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i
                      className={`fa-solid text-sm ${
                        showPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Password strength</span>
                      <span
                        className={`font-medium ${
                          passwordStrength < 40
                            ? "text-red-600"
                            : passwordStrength < 70
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {getPasswordStrengthText()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {errors.password && (
                  <p className="text-red-600 text-sm mt-1.5 flex items-center">
                    <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <i className="fa-solid fa-lock text-gray-400 text-sm"></i>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i
                      className={`fa-solid text-sm ${
                        showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1.5 flex items-center">
                    <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start pt-1">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={!!formData.terms}
                    onChange={handleChange}
                    className="w-4 h-4 border-gray-300 rounded text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="terms"
                    className="text-gray-700 cursor-pointer"
                  >
                    I agree to the{" "}
                    <a
                      href="#"
                      className="font-medium text-purple-600 hover:text-purple-700 underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="#"
                      className="font-medium text-purple-600 hover:text-purple-700 underline"
                    >
                      Privacy Policy
                    </a>
                  </label>
                  {errors.terms && (
                    <p className="text-red-600 text-sm mt-1 flex items-center">
                      <i className="fa-solid fa-circle-exclamation mr-1 text-xs"></i>
                      {errors.terms}
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isLoading ||
                  departmentsLoading ||
                  jobTitlesLoading ||
                  !isFormComplete()
                }
                className="w-full mt-6 flex items-center justify-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white bg-gradient-to-r from-indigo-900 to-purple-900 hover:from-indigo-800 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                    Creating your account...
                  </>
                ) : (
                  <>
                    Create Account
                    <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Sign In Link */}
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center py-3 px-4 border-2 border-gray-300 rounded-lg shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-600 transition-all duration-200"
            >
              Sign In Instead
              <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
            </Link>
          </div>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center">
              <i className="fa-solid fa-shield-halved mr-1.5 text-green-600"></i>
              Your information is protected with enterprise-grade security
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
