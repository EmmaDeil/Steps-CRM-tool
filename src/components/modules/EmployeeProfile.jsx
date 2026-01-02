import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/useAuth";
import { validateEmployeeProfile, validateFile } from "../../utils/validation";
import "../ProfileAnimations.css";

const EmployeeProfile = ({
  onBack,
  fromProfile = false,
  employeeData = null,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [employee, setEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [activityLog, setActivityLog] = useState([]);
  const [showActivityLog, setShowActivityLog] = useState(false);

  // Determine if current user is HR admin
  const isHR = currentUser?.role === "HR" || currentUser?.role === "Admin";
  // Determine if viewing own profile
  const isOwnProfile = !employeeData || employee?._id === currentUser?._id;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    ...(isHR ? [{ id: "activity", label: "Activity Log" }] : []),
  ];

  // Fetch employee data from API
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        let empId;
        if (employeeData) {
          empId = employeeData.id || employeeData._id;
        } else if (fromProfile) {
          empId = currentUser?._id;
        }

        if (!empId) {
          setEmployee(null);
          setLoading(false);
          return;
        }

        const response = await apiService.get(`/api/hr/employees/${empId}`);
        if (response && response.data) {
          setEmployee(response.data);
          setPreviewUrl(response.data.avatar || response.data.profilePicture);
        } else {
          setEmployee(null);
          toast.error("Employee data not found");
        }
      } catch (error) {
        console.error("Error fetching employee details:", error);
        toast.error("Failed to load employee details");
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeData();
  }, [employeeData, fromProfile, currentUser?._id]);

  // Fetch activity log for employee
  useEffect(() => {
    const fetchActivityLog = async () => {
      if (!employee?._id) return;

      try {
        const response = await apiService.get(
          `/api/hr/employees/${employee._id}/activity`
        );
        if (response && response.data) {
          setActivityLog(response.data);
        }
      } catch (error) {
        console.error("Error fetching activity log:", error);
      }
    };

    if (showActivityLog) {
      fetchActivityLog();
    }
  }, [employee?._id, showActivityLog]);

  // Different breadcrumb configurations based on context
  const breadcrumbItems = fromProfile
    ? [
        {
          label: "Home",
          icon: "fa-home",
          href: "/home",
        },
        { label: "My Profile", icon: "fa-user-circle" },
      ]
    : [
        { label: "Home", icon: "fa-home", onClick: onBack },
        { label: "HR Management", icon: "fa-users-gear", onClick: onBack },
        { label: employee?.name || "Employee", icon: "fa-id-card" },
      ];

  const handleEditClick = () => {
    setEditingEmployee({
      ...employee,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingEmployee(null);
    setProfilePictureFile(null);
    setPreviewUrl(employee?.avatar || employee?.profilePicture);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const { isValid, errors } = validateFile(file, 2);

      if (!isValid) {
        toast.error(Object.values(errors).join(", "));
        return;
      }

      setProfilePictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);

      // Show success feedback
      toast.success("Image selected successfully");
    }
  };

  const handleSaveChanges = async () => {
    if (!editingEmployee) return;

    // Validate form data
    const { isValid, errors } = validateEmployeeProfile(editingEmployee, isHR);

    if (!isValid) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors");
      // Add shake animation to error fields
      Object.keys(errors).forEach((field) => {
        const element = document.querySelector(`[name="${field}"]`);
        if (element) {
          element.classList.add("animate-error");
          setTimeout(() => element.classList.remove("animate-error"), 500);
        }
      });
      return;
    }

    try {
      setSaving(true);
      setValidationErrors({});

      // Use FormData for file upload
      const formData = new FormData();
      formData.append("name", editingEmployee.name);
      formData.append("email", editingEmployee.email);
      formData.append("phone", editingEmployee.phone || "");
      formData.append("dateOfBirth", editingEmployee.dateOfBirth || "");
      formData.append("address", editingEmployee.address || "");
      formData.append(
        "emergencyContact",
        JSON.stringify(editingEmployee.emergencyContact || {})
      );
      formData.append("updatedBy", currentUser?._id || "unknown");

      // Only HR can update these fields
      if (isHR) {
        formData.append("department", editingEmployee.department || "");
        formData.append("jobTitle", editingEmployee.jobTitle || "");
        formData.append("status", editingEmployee.status || "Active");
        formData.append("salary", editingEmployee.salary || 0);
      }

      // Handle profile picture upload if changed
      if (profilePictureFile) {
        formData.append("avatar", profilePictureFile);
      }

      const response = await apiService.put(
        `/api/hr/employees/${employee._id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response) {
        setEmployee(response.data || { ...editingEmployee });
        setIsEditing(false);
        setEditingEmployee(null);
        setProfilePictureFile(null);

        // Success animation
        toast.success("Employee profile updated successfully", {
          icon: "✅",
          duration: 3000,
          className: "animate-success",
        });

        // Add success glow to save button temporarily
        const saveBtn = document.querySelector("[data-save-btn]");
        if (saveBtn) {
          saveBtn.classList.add("success-glow");
          setTimeout(() => saveBtn.classList.remove("success-glow"), 1500);
        }
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      toast.error(
        error.response?.data?.message || "Failed to save employee profile",
        {
          icon: "❌",
          duration: 4000,
          className: "animate-error",
        }
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-6">
      {employee ? (
        <div>
          {/* Breadcrumbs */}
          <Breadcrumb items={breadcrumbItems} />

          {/* Profile Header Section */}
          <div className="mx-auto max-w-7xl px-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 md:p-8">
              <div className="flex gap-4 items-center">
                <div className="relative group">
                  <div
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-center bg-cover border-4 border-gray-50 dark:border-gray-900"
                    style={{
                      backgroundImage: `url(${previewUrl || employee?.avatar})`,
                    }}
                  ></div>
                  {isEditing && (isHR || isOwnProfile) && (
                    <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                      <i className="fa-solid fa-camera text-sm"></i>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1">
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editingEmployee?.name || ""}
                        onChange={(e) =>
                          setEditingEmployee({
                            ...editingEmployee,
                            name: e.target.value,
                          })
                        }
                        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                      />
                      {isHR && (
                        <input
                          type="text"
                          value={editingEmployee?.jobTitle || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              jobTitle: e.target.value,
                            })
                          }
                          className="text-gray-500 dark:text-gray-400 text-base px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
                        {employee?.name}
                      </h1>
                      <p className="text-gray-500 dark:text-gray-400 text-base">
                        {employee?.jobTitle}
                      </p>
                    </>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                      {employee?.status || "Active"}
                    </span>
                    <span className="text-gray-500 dark:text-gray-500 text-sm">
                      •
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {employee?.department}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto mt-6">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 md:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      <i className="fa-solid fa-times mr-2 text-xs"></i>
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      data-save-btn
                      className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed btn-hover-scale"
                    >
                      {saving ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin mr-2 text-xs"></i>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-check mr-2 text-xs"></i>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    {(isHR || isOwnProfile) && (
                      <button
                        onClick={handleEditClick}
                        className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
                      >
                        <i className="fa-solid fa-pencil mr-2 text-xs"></i>
                        <span>Edit Profile</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mx-auto max-w-7xl px-4 mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700 gap-8 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 pt-4 whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-600 text-gray-900 dark:text-white font-semibold"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard Grid Content */}
          {activeTab === "overview" && (
            <div className="mx-auto max-w-7xl px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Personal Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Personal Information
                    </h3>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Email Address
                      </p>
                      {isEditing ? (
                        <>
                          <input
                            type="email"
                            name="email"
                            value={editingEmployee?.email || ""}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                email: e.target.value,
                              })
                            }
                            className={`w-full px-2 py-1 border ${
                              validationErrors.email
                                ? "border-red-500 validation-error"
                                : "border-gray-300 dark:border-gray-600"
                            } rounded text-sm dark:bg-gray-700 dark:text-white input-focus`}
                          />
                          {validationErrors.email && (
                            <p className="text-red-500 text-xs mt-1 animate-fade-in">
                              {validationErrors.email}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Phone Number
                      </p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editingEmployee?.phone || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              phone: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.phone || "Not provided"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Address
                      </p>
                      {isEditing ? (
                        <textarea
                          value={editingEmployee?.address || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              address: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white h-20"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium whitespace-pre-line">
                          {employee?.address || "Not provided"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Date of Birth
                      </p>
                      {isEditing ? (
                        <input
                          type="date"
                          value={
                            editingEmployee?.dateOfBirth
                              ? new Date(editingEmployee.dateOfBirth)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              dateOfBirth: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.dateOfBirth
                            ? new Date(
                                employee.dateOfBirth
                              ).toLocaleDateString()
                            : "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employment Details (view for all, edit restricted) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold flex items-center gap-2">
                      Employment Details
                      <span className="text-xs font-normal text-blue-600 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                        {isHR ? "HR managed" : "View only"}
                      </span>
                    </h3>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Employee ID
                      </p>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee?.employeeId || employee?._id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Department
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="text"
                          value={editingEmployee?.department || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.department || "Not set"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Status
                      </p>
                      {isEditing && isHR ? (
                        <select
                          value={editingEmployee?.status || "Active"}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              status: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Terminated">Terminated</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.status || "Active"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Start Date
                      </p>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee?.startDate
                          ? new Date(employee.startDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                    {isHR && (
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Salary
                        </p>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingEmployee?.salary || ""}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                salary: parseFloat(e.target.value),
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                            {employee?.salary
                              ? formatCurrency(employee.salary)
                              : "Not set"}
                          </p>
                        )}
                      </div>
                    )}
                    {!isHR && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Salary is restricted to HR visibility.
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact - User Editable */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Emergency Contact
                      <span className="text-xs font-normal text-green-600 ml-2">
                        (Editable)
                      </span>
                    </h3>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Name
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingEmployee?.emergencyContact?.name || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              emergencyContact: {
                                ...editingEmployee?.emergencyContact,
                                name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.emergencyContact?.name || "Not provided"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Relationship
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={
                            editingEmployee?.emergencyContact?.relationship ||
                            ""
                          }
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              emergencyContact: {
                                ...editingEmployee?.emergencyContact,
                                relationship: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.emergencyContact?.relationship ||
                            "Not provided"}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Phone
                      </p>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editingEmployee?.emergencyContact?.phone || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              emergencyContact: {
                                ...editingEmployee?.emergencyContact,
                                phone: e.target.value,
                              },
                            })
                          }
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.emergencyContact?.phone || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Compensation */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Compensation
                    </h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Base Salary
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.salary
                          ? formatCurrency(employee.salary)
                          : "Not set"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Bonus
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.bonus ? formatCurrency(employee.bonus) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Allowances
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.allowances
                          ? formatCurrency(employee.allowances)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Pay Frequency
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.paySchedule || "Not specified"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Performance
                    </h3>
                    {employee?.performanceRating && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {employee.performanceRating}/5
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Last Review
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.lastReviewDate
                          ? new Date(
                              employee.lastReviewDate
                            ).toLocaleDateString()
                          : "Not recorded"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Goals In Progress
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.goalsInProgress ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Manager
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold truncate max-w-[180px] text-right">
                        {employee?.managerName ||
                          employee?.manager ||
                          "Not assigned"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                        Performance Plan
                      </span>
                      <span className="text-gray-900 dark:text-gray-200 font-semibold">
                        {employee?.performancePlan || "Not set"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time Off Balance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Time Off Balance
                    </h3>
                  </div>
                  <div className="space-y-3 flex-1">
                    {(() => {
                      const balance =
                        employee?.timeOffBalance ||
                        employee?.leaveBalance ||
                        {};
                      const annual = balance.annualLeave ?? balance.annual ?? 0;
                      const sick = balance.sickLeave ?? balance.sick ?? 0;
                      const personal =
                        balance.personalLeave ?? balance.personal ?? 0;
                      const unpaid = balance.unpaidLeave ?? balance.unpaid ?? 0;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Annual Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {annual} days
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Sick Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {sick} days
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Personal Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {personal} days
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Unpaid Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {unpaid} days
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Documents */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full card-animate lg:col-span-3">
                  <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Documents
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Latest uploaded documents
                    </span>
                  </div>
                  {employee?.documents && employee.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {employee.documents.slice(0, 8).map((doc, idx) => (
                        <div
                          key={doc.id || doc._id || idx}
                          className="flex flex-col gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                              <i className="fa-solid fa-file-lines"></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-200 truncate">
                                {doc.name || doc.title || `Document ${idx + 1}`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {doc.type || doc.category || "File"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>
                              {doc.updatedAt
                                ? new Date(doc.updatedAt).toLocaleDateString()
                                : doc.createdAt
                                ? new Date(doc.createdAt).toLocaleDateString()
                                : "Unknown date"}
                            </span>
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                      No documents uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal Tab */}
          {activeTab === "personal" && (
            <div className="mx-auto max-w-7xl px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-5 card-animate">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Contact Details
                    </h3>
                    {isEditing && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Edit mode
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Full Name
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={editingEmployee?.name || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              name: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.name
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.name}
                        </p>
                      )}
                      {validationErrors.name && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Email Address
                      </p>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={editingEmployee?.email || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              email: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.email
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.email}
                        </p>
                      )}
                      {validationErrors.email && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Phone Number
                      </p>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={editingEmployee?.phone || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              phone: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.phone
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.phone || "Not provided"}
                        </p>
                      )}
                      {validationErrors.phone && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Personal & Address */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-5 card-animate">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Personal Details
                    </h3>
                    {isEditing && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Synced on save
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Date of Birth
                      </p>
                      {isEditing ? (
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={
                            editingEmployee?.dateOfBirth
                              ? new Date(editingEmployee.dateOfBirth)
                                  .toISOString()
                                  .split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              dateOfBirth: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.dateOfBirth
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.dateOfBirth
                            ? new Date(
                                employee.dateOfBirth
                              ).toLocaleDateString()
                            : "Not provided"}
                        </p>
                      )}
                      {validationErrors.dateOfBirth && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.dateOfBirth}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Address
                      </p>
                      {isEditing ? (
                        <textarea
                          name="address"
                          value={editingEmployee?.address || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              address: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white h-24"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium whitespace-pre-line">
                          {employee?.address || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-5 card-animate lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Emergency Contact
                    </h3>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      Keep this current
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">
                        Name
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="emergencyContactName"
                          value={editingEmployee?.emergencyContact?.name || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              emergencyContact: {
                                ...editingEmployee?.emergencyContact,
                                name: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.emergencyContact?.name || "Not provided"}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">
                        Relationship
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          name="emergencyContactRelationship"
                          value={
                            editingEmployee?.emergencyContact?.relationship ||
                            ""
                          }
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              emergencyContact: {
                                ...editingEmployee?.emergencyContact,
                                relationship: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.emergencyContact?.relationship ||
                            "Not provided"}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">
                        Phone
                      </p>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="emergencyContactPhone"
                          value={editingEmployee?.emergencyContact?.phone || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              emergencyContact: {
                                ...editingEmployee?.emergencyContact,
                                phone: e.target.value,
                              },
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.emergencyContactPhone
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.emergencyContact?.phone || "Not provided"}
                        </p>
                      )}
                      {validationErrors.emergencyContactPhone && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.emergencyContactPhone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === "employment" && (
            <div className="mx-auto max-w-7xl px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Role & Status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-5 card-animate">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Role & Status
                    </h3>
                    <span className="text-xs text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-full">
                      {isHR ? "HR managed" : "View only"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Job Title
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="text"
                          name="jobTitle"
                          value={editingEmployee?.jobTitle || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              jobTitle: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.jobTitle || "Not set"}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Department
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="text"
                          name="department"
                          value={editingEmployee?.department || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.department || "Not set"}
                        </p>
                      )}
                      {validationErrors.department && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.department}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Status
                      </p>
                      {isEditing && isHR ? (
                        <select
                          name="status"
                          value={editingEmployee?.status || "Active"}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              status: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.status
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        >
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Terminated">Terminated</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.status || "Active"}
                        </p>
                      )}
                      {validationErrors.status && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.status}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Start Date
                        </p>
                        {isEditing && isHR ? (
                          <input
                            type="date"
                            name="startDate"
                            value={
                              editingEmployee?.startDate
                                ? new Date(editingEmployee.startDate)
                                    .toISOString()
                                    .split("T")[0]
                                : ""
                            }
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                startDate: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                            {employee?.startDate
                              ? new Date(
                                  employee.startDate
                                ).toLocaleDateString()
                              : "Not set"}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Employment Type
                        </p>
                        {isEditing && isHR ? (
                          <select
                            name="employmentType"
                            value={editingEmployee?.employmentType || ""}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                employmentType: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select type</option>
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Intern">Intern</option>
                          </select>
                        ) : (
                          <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                            {employee?.employmentType || "Not set"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manager & Work Setup */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-5 card-animate">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Manager & Work Setup
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Org & location
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Manager
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="text"
                          name="manager"
                          value={
                            editingEmployee?.managerName ||
                            editingEmployee?.manager ||
                            ""
                          }
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              managerName: e.target.value,
                              manager: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.managerName ||
                            employee?.manager ||
                            "Not assigned"}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Work Location
                        </p>
                        {isEditing && isHR ? (
                          <input
                            type="text"
                            name="location"
                            value={editingEmployee?.location || ""}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                location: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                        ) : (
                          <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                            {employee?.location || "Not set"}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Work Arrangement
                        </p>
                        {isEditing && isHR ? (
                          <select
                            name="workArrangement"
                            value={editingEmployee?.workArrangement || ""}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                workArrangement: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select arrangement</option>
                            <option value="Onsite">Onsite</option>
                            <option value="Hybrid">Hybrid</option>
                            <option value="Remote">Remote</option>
                          </select>
                        ) : (
                          <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                            {employee?.workArrangement || "Not set"}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Work Email
                        </p>
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium break-all">
                          {employee?.workEmail || employee?.email || "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                          Employee ID
                        </p>
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {employee?.employeeId || employee?._id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compensation & Payroll (HR Only) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-5 card-animate lg:col-span-2">
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                      Compensation & Payroll
                    </h3>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                      HR access
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Salary
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="number"
                          name="salary"
                          value={editingEmployee?.salary || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              salary: e.target.value,
                            })
                          }
                          className={`w-full px-3 py-2 border ${
                            validationErrors.salary
                              ? "border-red-500 validation-error"
                              : "border-gray-300 dark:border-gray-600"
                          } rounded text-sm dark:bg-gray-700 dark:text-white`}
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {isHR
                            ? employee?.salary
                              ? formatCurrency(employee.salary)
                              : "Not set"
                            : "Restricted"}
                        </p>
                      )}
                      {validationErrors.salary && (
                        <p className="text-red-500 text-xs mt-1 animate-fade-in">
                          {validationErrors.salary}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Pay Frequency
                      </p>
                      {isEditing && isHR ? (
                        <select
                          name="paySchedule"
                          value={editingEmployee?.paySchedule || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              paySchedule: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select frequency</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Semi-monthly">Semi-monthly</option>
                          <option value="Bi-weekly">Bi-weekly</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {isHR
                            ? editingEmployee?.paySchedule ||
                              employee?.paySchedule ||
                              "Not set"
                            : "Restricted"}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Bonus
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="number"
                          name="bonus"
                          value={editingEmployee?.bonus || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              bonus: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {isHR
                            ? employee?.bonus
                              ? formatCurrency(employee.bonus)
                              : "Not set"
                            : "Restricted"}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Allowances
                      </p>
                      {isEditing && isHR ? (
                        <input
                          type="number"
                          name="allowances"
                          value={editingEmployee?.allowances || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              allowances: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                          {isHR
                            ? employee?.allowances
                              ? formatCurrency(employee.allowances)
                              : "Not set"
                            : "Restricted"}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isHR && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                      Compensation details are restricted to HR.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Activity Log Tab (HR Only) */}
          {activeTab === "activity" && isHR && (
            <div className="mx-auto max-w-7xl px-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Activity Log
                  </h3>
                  <button
                    onClick={() => {
                      setShowActivityLog(true);
                      // Refetch activity log
                      apiService
                        .get(`/api/hr/employees/${employee._id}/activity`)
                        .then((res) => {
                          if (res && res.data) setActivityLog(res.data);
                        });
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors btn-hover-scale"
                  >
                    <i className="fa-solid fa-refresh mr-2"></i>
                    Refresh
                  </button>
                </div>

                {activityLog.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fa-solid fa-clock-rotate-left text-4xl text-gray-400 mb-4"></i>
                    <p className="text-gray-500 dark:text-gray-400">
                      No activity recorded yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activityLog.map((activity, index) => (
                      <div
                        key={activity.id}
                        className="border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-900 p-4 rounded-r-lg animate-slide-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded">
                              {activity.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              by User #{activity.userId.slice(-6)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {activity.details?.changes && (
                          <div className="mt-3 space-y-2">
                            {activity.details.changes.map((change, idx) => (
                              <div key={idx} className="text-sm">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {change.field}:
                                </span>
                                <span className="text-red-600 dark:text-red-400 line-through mx-2">
                                  {typeof change.oldValue === "object"
                                    ? JSON.stringify(change.oldValue)
                                    : change.oldValue || "empty"}
                                </span>
                                <i className="fa-solid fa-arrow-right text-gray-400 text-xs"></i>
                                <span className="text-green-600 dark:text-green-400 mx-2">
                                  {typeof change.newValue === "object"
                                    ? JSON.stringify(change.newValue)
                                    : change.newValue}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {activity.details?.employeeCount && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <i className="fa-solid fa-users mr-2"></i>
                            Affected {activity.details.employeeCount} employees
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-20"></div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
            <i className="fa-solid fa-user-slash text-4xl text-gray-400 mb-4"></i>
            <p className="text-gray-600 dark:text-gray-400">
              Employee not found
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
