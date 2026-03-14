import React, { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import { apiService } from "../../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../../context/useAuth";
import { useDepartments } from "../../context/useDepartments";
import { validateEmployeeProfile, validateFile } from "../../utils/validation";

const EmployeeProfile = ({
  onBack,
  fromProfile = false,
  employeeData = null,
  initialEditMode = false,
}) => {
  const { user: currentUser } = useAuth();
  const { departments, loading: departmentsLoading } = useDepartments();
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
  const [leaveAllocation, setLeaveAllocation] = useState(null);
  const [managerOptions, setManagerOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  // MFA state
  const [mfaStatus, setMfaStatus] = useState(null);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  // Determine if current user is HR admin
  const isHR = currentUser?.role === "HR" || currentUser?.role === "Admin";
  // Determine if viewing own profile
  const isOwnProfile = !employeeData || employee?._id === currentUser?._id;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    ...(isOwnProfile && fromProfile
      ? [{ id: "security", label: "Security" }]
      : []),
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
          if (initialEditMode) {
            setEditingEmployee({ ...response.data });
            setIsEditing(true);
          }

          // Fetch leave allocation for current year
          // Use the resolved employee _id (not the original empId which may be a User _id)
          try {
            const year = new Date().getFullYear();
            const resolvedEmpId =
              response.data._id || response.data.id || empId;
            const allocRes = await apiService.get(
              `/api/hr/leave-allocations?employeeId=${resolvedEmpId}&year=${year}`,
            );
            const allocData = allocRes?.data;
            if (Array.isArray(allocData) && allocData.length > 0) {
              setLeaveAllocation(allocData[0]);
            } else if (allocData && !Array.isArray(allocData)) {
              setLeaveAllocation(allocData);
            }
          } catch (allocErr) {
            console.error("Error fetching leave allocation:", allocErr);
          }
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
  }, [employeeData, fromProfile, currentUser?._id, initialEditMode]);

  // Fetch activity log for employee
  useEffect(() => {
    const fetchActivityLog = async () => {
      if (!employee?._id) return;

      try {
        const response = await apiService.get(
          `/api/hr/employees/${employee._id}/activity`,
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

  useEffect(() => {
    const fetchEditOptions = async () => {
      try {
        const [employeesRes, locationsRes] = await Promise.all([
          apiService.get("/api/hr/employees"),
          apiService.get("/api/store-locations"),
        ]);

        setManagerOptions(
          Array.isArray(employeesRes?.data) ? employeesRes.data : [],
        );
        setLocationOptions(Array.isArray(locationsRes) ? locationsRes : []);
      } catch (error) {
        console.error("Error fetching profile edit options:", error);
      }
    };

    if (isHR) {
      fetchEditOptions();
    }
  }, [isHR]);

  const departmentOptions = departments.map((dept) => dept.name || dept.code);
  const availableManagerOptions = managerOptions.filter(
    (option) => (option?._id || option?.id) !== (employee?._id || employee?.id),
  );
  const availableLocationOptions = locationOptions.map(
    (location) => location.name || location.code,
  );

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

      const payload = {
        name: editingEmployee.name,
        email: editingEmployee.email,
        phone: editingEmployee.phone || "",
        dateOfBirth: editingEmployee.dateOfBirth || "",
        address: editingEmployee.address || "",
        emergencyContact: editingEmployee.emergencyContact || {},
        updatedBy: currentUser?._id || "unknown",
      };

      // Only HR can update these fields
      if (isHR) {
        Object.assign(payload, {
          department: editingEmployee.department || "",
          jobTitle: editingEmployee.jobTitle || "",
          status: editingEmployee.status || "Active",
          salary: editingEmployee.salary || 0,
          startDate: editingEmployee.startDate || "",
          employmentType: editingEmployee.employmentType || "",
          managerId: editingEmployee.managerId || "",
          managerName: editingEmployee.managerName || "",
          location: editingEmployee.location || "",
          workArrangement: editingEmployee.workArrangement || "",
        });
      }

      // The backend expects base64 image data, not multipart uploads.
      if (profilePictureFile && previewUrl) {
        payload.avatar = previewUrl;
      }

      const response = await apiService.put(
        `/api/hr/employees/${employee._id}`,
        payload,
      );

      if (response) {
        const updatedEmployee = response.data || { ...editingEmployee };
        setEmployee(updatedEmployee);
        setPreviewUrl(
          updatedEmployee.avatar ||
            updatedEmployee.profilePicture ||
            previewUrl,
        );
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
        },
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
    <div className="w-full min-h-screen bg-gray-50 px-1">
      {employee ? (
        <div>
          {/* Breadcrumbs */}
          <Breadcrumb items={breadcrumbItems} />

          {/* Profile Header Section */}
          <div className="mx-auto max-w-7xl px-4 mt-6 mb-8">
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
                                employee.dateOfBirth,
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
                              employee.lastReviewDate,
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
                      if (!leaveAllocation) {
                        return (
                          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                            No leave allocation found for{" "}
                            {new Date().getFullYear()}.
                          </p>
                        );
                      }
                      const annual =
                        (leaveAllocation.annualLeave ?? 0) -
                        (leaveAllocation.annualLeaveUsed ?? 0);
                      const sick =
                        (leaveAllocation.sickLeave ?? 0) -
                        (leaveAllocation.sickLeaveUsed ?? 0);
                      const personal =
                        (leaveAllocation.personalLeave ?? 0) -
                        (leaveAllocation.personalLeaveUsed ?? 0);
                      const unpaid = leaveAllocation.unpaidLeave ?? 0;
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Annual Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {annual} / {leaveAllocation.annualLeave ?? 0} days
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Sick Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {sick} / {leaveAllocation.sickLeave ?? 0} days
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                              Personal Leave
                            </span>
                            <span className="text-gray-900 dark:text-gray-200 font-semibold">
                              {personal} / {leaveAllocation.personalLeave ?? 0}{" "}
                              days
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
                                employee.dateOfBirth,
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
                        <select
                          name="department"
                          value={editingEmployee?.department || ""}
                          onChange={(e) =>
                            setEditingEmployee({
                              ...editingEmployee,
                              department: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          disabled={departmentsLoading}
                        >
                          <option value="">
                            {departmentsLoading
                              ? "Loading departments..."
                              : "Select department"}
                          </option>
                          {departmentOptions.map((departmentName) => (
                            <option key={departmentName} value={departmentName}>
                              {departmentName}
                            </option>
                          ))}
                        </select>
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
                                  employee.startDate,
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
                        <select
                          name="manager"
                          value={editingEmployee?.managerId || ""}
                          onChange={(e) =>
                            setEditingEmployee((prev) => {
                              const selectedManager =
                                availableManagerOptions.find(
                                  (option) =>
                                    (option._id || option.id) ===
                                    e.target.value,
                                );
                              return {
                                ...prev,
                                managerId: e.target.value,
                                managerName: selectedManager?.name || "",
                                manager: selectedManager?.name || "",
                              };
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select manager</option>
                          {availableManagerOptions.map((option) => {
                            const optionId = option._id || option.id;
                            const optionName =
                              option.name || option.email || optionId;
                            return (
                              <option key={optionId} value={optionId}>
                                {optionName}
                              </option>
                            );
                          })}
                        </select>
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
                          <select
                            name="location"
                            value={editingEmployee?.location || ""}
                            onChange={(e) =>
                              setEditingEmployee({
                                ...editingEmployee,
                                location: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select work location</option>
                            {availableLocationOptions.map((locationName) => (
                              <option key={locationName} value={locationName}>
                                {locationName}
                              </option>
                            ))}
                            {editingEmployee?.location &&
                            !availableLocationOptions.includes(
                              editingEmployee.location,
                            ) ? (
                              <option value={editingEmployee.location}>
                                {editingEmployee.location}
                              </option>
                            ) : null}
                          </select>
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

          {/* Security Tab */}
          {activeTab === "security" && isOwnProfile && fromProfile && (
            <div className="mx-auto max-w-7xl px-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-fade-in">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-blue-600"></i>
                  Two-Factor Authentication
                </h3>

                {/* MFA Status */}
                {!mfaStatus ? (
                  <div className="text-center py-8">
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiService.get(
                            "/api/auth/mfa-status",
                          );
                          if (res.success) setMfaStatus(res.data);
                        } catch (_err) {
                          toast.error("Failed to load MFA status");
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Load MFA Settings
                    </button>
                  </div>
                ) : mfaBackupCodes ? (
                  /* Show backup codes after setup */
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-circle-check text-green-600"></i>
                        <p className="font-semibold text-green-800">
                          MFA Enabled Successfully!
                        </p>
                      </div>
                      <p className="text-sm text-green-700">
                        Save these backup codes in a safe place. Each can only
                        be used once.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {mfaBackupCodes.map((code, i) => (
                        <div
                          key={i}
                          className="bg-gray-100 rounded px-3 py-2 text-center font-mono text-sm"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          mfaBackupCodes.join("\n"),
                        );
                        toast.success("Backup codes copied!");
                      }}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      <i className="fa-solid fa-copy mr-2"></i>Copy All
                    </button>
                    <button
                      onClick={() => {
                        setMfaBackupCodes(null);
                        setMfaStatus({ ...mfaStatus, mfaEnabled: true });
                        setMfaSetup(null);
                        setMfaCode("");
                      }}
                      className="ml-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : mfaStatus.mfaEnabled ? (
                  /* MFA is ON — show disable option */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-check text-green-600"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-green-800">
                          MFA is Enabled
                        </p>
                        <p className="text-sm text-green-700">
                          Your account is protected with two-factor
                          authentication.
                          {mfaStatus.mfaVerifiedAt && (
                            <span className="ml-1">
                              Enabled on{" "}
                              {new Date(
                                mfaStatus.mfaVerifiedAt,
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {mfaStatus.orgMfaEnforced && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                        MFA is required by your organization and cannot be
                        disabled.
                      </div>
                    )}

                    {!mfaStatus.orgMfaEnforced && (
                      <div className="border border-red-200 rounded-lg p-4">
                        <p className="font-medium text-gray-900 mb-3">
                          Disable MFA
                        </p>
                        <p className="text-sm text-gray-600 mb-3">
                          Enter your password to confirm disabling MFA.
                        </p>
                        <div className="flex gap-3">
                          <input
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder="Enter your password"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            disabled={!disablePassword || mfaLoading}
                            onClick={async () => {
                              setMfaLoading(true);
                              try {
                                const res = await apiService.post(
                                  "/api/auth/mfa-disable",
                                  { password: disablePassword },
                                );
                                if (res.success) {
                                  toast.success("MFA disabled");
                                  setMfaStatus({
                                    ...mfaStatus,
                                    mfaEnabled: false,
                                  });
                                  setDisablePassword("");
                                } else {
                                  toast.error(
                                    res.error || "Failed to disable MFA",
                                  );
                                }
                              } catch (err) {
                                toast.error(
                                  err.serverData?.error ||
                                    "Failed to disable MFA",
                                );
                              } finally {
                                setMfaLoading(false);
                              }
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {mfaLoading ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              "Disable"
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : !mfaSetup ? (
                  /* MFA is OFF — show enable option */
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-shield-halved text-gray-500"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          MFA is Not Enabled
                        </p>
                        <p className="text-sm text-gray-600">
                          Add an extra layer of security to your account using
                          an authenticator app.
                        </p>
                      </div>
                    </div>

                    {mfaStatus.orgMfaEnforced && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                        <i className="fa-solid fa-triangle-exclamation mr-1"></i>
                        MFA is required by your organization. Please set it up
                        to continue.
                      </div>
                    )}

                    <button
                      disabled={mfaLoading}
                      onClick={async () => {
                        setMfaLoading(true);
                        try {
                          const res = await apiService.post(
                            "/api/auth/mfa-setup",
                          );
                          if (res.success) {
                            setMfaSetup(res.data);
                          } else {
                            toast.error(
                              res.error || "Failed to start MFA setup",
                            );
                          }
                        } catch (_err) {
                          toast.error("Failed to start MFA setup");
                        } finally {
                          setMfaLoading(false);
                        }
                      }}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {mfaLoading ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i>{" "}
                          Setting up...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-shield-halved"></i> Enable
                          MFA
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* MFA Setup — QR code + verification */
                  <div className="space-y-5">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="font-medium text-blue-800 mb-1">
                        Step 1: Scan QR Code
                      </p>
                      <p className="text-sm text-blue-700">
                        Scan this QR code with your authenticator app (Google
                        Authenticator, Authy, etc.)
                      </p>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                        <img
                          src={mfaSetup.qrCode}
                          alt="MFA QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">
                        Or enter this key manually:
                      </p>
                      <code className="bg-gray-100 px-3 py-1.5 rounded text-sm font-mono select-all">
                        {mfaSetup.secret}
                      </code>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="font-medium text-blue-800 mb-1">
                        Step 2: Enter Verification Code
                      </p>
                      <p className="text-sm text-blue-700 mb-3">
                        Enter the 6-digit code shown in your authenticator app
                        to verify setup.
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={mfaCode}
                          onChange={(e) =>
                            setMfaCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="000000"
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          disabled={mfaCode.length < 6 || mfaLoading}
                          onClick={async () => {
                            setMfaLoading(true);
                            try {
                              const res = await apiService.post(
                                "/api/auth/mfa-confirm",
                                { code: mfaCode },
                              );
                              if (res.success) {
                                setMfaBackupCodes(res.data.backupCodes);
                                toast.success("MFA enabled!");
                              } else {
                                toast.error(res.error || "Invalid code");
                              }
                            } catch (err) {
                              toast.error(
                                err.serverData?.error || "Verification failed",
                              );
                            } finally {
                              setMfaLoading(false);
                            }
                          }}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                          {mfaLoading ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            "Verify"
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setMfaSetup(null);
                        setMfaCode("");
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <i className="fa-solid fa-arrow-left mr-1"></i> Cancel
                      setup
                    </button>
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
