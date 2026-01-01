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

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear inline error for that field when user changes it
    setErrors((prev) => ({ ...prev, [name]: null }));
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 px-4 py-8">
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>

      <div className="w-full max-w-2xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/50 mb-4">
            <i className="fa-solid fa-user-plus text-2xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600">Join us to get started</p>
        </div>

        {/* Signup Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-user text-gray-400"></i>
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-2">
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-user text-gray-400"></i>
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-2">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fa-solid fa-envelope text-gray-400"></i>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-2">{errors.email}</p>
              )}
            </div>

            {/* Department Field */}
            <div>
              <label
                htmlFor="department"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Department
              </label>
              <div className="relative">
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={departmentsLoading}
                  className="block w-full pl-3 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 disabled:opacity-60"
                >
                  <option value="">
                    {departmentsLoading
                      ? "Loading departments..."
                      : "Select department"}
                  </option>
                  {departments.map((d) => (
                    <option key={d._id || d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.department && (
                <p className="text-red-500 text-sm mt-2">{errors.department}</p>
              )}
            </div>

            {/* Job Title Field */}
            <div className="mb-4">
              <label
                htmlFor="jobTitle"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Job Title
              </label>
              <div className="relative">
                <select
                  id="jobTitle"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  disabled={jobTitlesLoading}
                  className="block w-full pl-3 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 disabled:opacity-60"
                >
                  <option value="">
                    {jobTitlesLoading
                      ? "Loading job titles..."
                      : "Select job title"}
                  </option>
                  {jobTitles.map((jt) => (
                    <option key={jt} value={jt}>
                      {jt}
                    </option>
                  ))}
                </select>
              </div>
              {errors.jobTitle && (
                <p className="text-red-500 text-sm mt-2">{errors.jobTitle}</p>
              )}
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-lock text-gray-400"></i>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i
                      className={`fa-solid ${
                        showPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 8 characters
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i className="fa-solid fa-lock text-gray-400"></i>
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i
                      className={`fa-solid ${
                        showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    ></i>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-2">{errors.password}</p>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  checked={!!formData.terms}
                  onChange={handleChange}
                  className="w-4 h-4 border-gray-300 rounded text-purple-600 focus:ring-purple-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="terms" className="text-gray-700">
                  I agree to the{" "}
                  <a
                    href="#"
                    className="font-semibold text-purple-600 hover:text-purple-700"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="font-semibold text-purple-600 hover:text-purple-700"
                  >
                    Privacy Policy
                  </a>
                </label>
                {errors.terms && (
                  <p className="text-red-500 text-sm mt-2">{errors.terms}</p>
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
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Creating Account...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-user-plus mr-2"></i>
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full py-3 px-4 border-2 border-gray-300 rounded-xl shadow-sm text-base font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
            >
              <i className="fa-solid fa-right-to-bracket mr-2"></i>
              Sign In
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Netlink App. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
