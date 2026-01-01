import { useState, useEffect } from "react";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";
import toast from "react-hot-toast";
import { apiService } from "../../services/api";

const Payroll = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const totalSteps = 5;

  // Step 1: Period Selection
  const [selectedPeriod, setSelectedPeriod] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
    paymentSchedule: "Monthly",
  });

  // Employee Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Step 2: Employee Earnings
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] =
    useState("All Departments");

  // Step 3: Deductions
  const [deductions, setDeductions] = useState({
    taxRate: 10,
    pensionRate: 8,
    healthInsurance: 0,
    otherDeductions: 0,
  });

  // Pay Rates
  const [payRates, setPayRates] = useState({
    regularRate: 40,
    overtimeRate: 60,
  });

  // Load saved draft on component mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const savedDraft = localStorage.getItem("payrollDraft");
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          const shouldLoad = window.confirm(
            `Found a saved draft from ${new Date(
              draft.savedAt
            ).toLocaleString()}. Would you like to load it?`
          );

          if (shouldLoad) {
            setSelectedPeriod(draft.period || selectedPeriod);
            setEmployees(draft.employees || []);
            setDeductions(draft.deductions || deductions);
            setPayRates(draft.payRates || payRates);
            setCurrentStep(draft.currentStep || 1);
            toast.success("Draft loaded successfully!");
          }
        }
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch employees when period is selected
  useEffect(() => {
    if (currentStep === 2 && !employees.length) {
      fetchEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiService.get("/api/hr/employees");
      const employeeData = Array.isArray(response)
        ? response
        : response.data || [];

      // Transform employee data for payroll
      const payrollEmployees = employeeData.map((emp) => {
        const regularHours = 80.0;
        const overtime = 0.0;
        const commission = 0.0;
        const grossPay =
          regularHours * payRates.regularRate +
          overtime * payRates.overtimeRate +
          commission;

        return {
          id: emp._id || emp.id,
          name:
            `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.email,
          initials: getInitials(emp.firstName, emp.lastName),
          color: getRandomColor(),
          regularHours,
          overtime,
          commission,
          grossPay,
          status: "Ready",
          statusColor: "green",
          department: emp.department,
        };
      });

      setEmployees(payrollEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      toast.error("Failed to load employees");
      // Fallback to sample data
      setEmployees(sampleEmployees);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0) : "";
    const last = lastName ? lastName.charAt(0) : "";
    return (first + last).toUpperCase() || "??";
  };

  const getRandomColor = () => {
    const colors = ["blue", "purple", "teal", "orange", "pink", "indigo"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Calculate employees with missing hours
  const getMissingHoursCount = () => {
    return employees.filter((emp) => emp.regularHours < 80).length;
  };

  // Calculate end date based on start date and payment schedule
  const calculateEndDate = (startDate, schedule) => {
    if (!startDate) return "";

    const start = new Date(startDate);
    let end = new Date(start);

    switch (schedule) {
      case "Weekly":
        end.setDate(start.getDate() + 6);
        break;
      case "Bi-weekly":
        end.setDate(start.getDate() + 13);
        break;
      case "Semi-monthly":
        end.setDate(start.getDate() + 14);
        break;
      case "Monthly":
        end.setMonth(start.getMonth() + 1);
        end.setDate(start.getDate() - 1);
        break;
      default:
        end.setMonth(start.getMonth() + 1);
        end.setDate(start.getDate() - 1);
    }

    return end.toISOString().split("T")[0];
  };

  // Handle payment schedule change
  const handleScheduleChange = (schedule) => {
    const endDate = calculateEndDate(selectedPeriod.startDate, schedule);
    setSelectedPeriod({
      ...selectedPeriod,
      paymentSchedule: schedule,
      endDate: endDate,
    });
  };

  // Handle start date change
  const handleStartDateChange = (startDate) => {
    const endDate = calculateEndDate(startDate, selectedPeriod.paymentSchedule);
    setSelectedPeriod({
      ...selectedPeriod,
      startDate: startDate,
      endDate: endDate,
    });
  };

  // Open edit modal for employee
  const handleEditEmployee = (employee) => {
    setEditingEmployee({
      ...employee,
      tempRegularHours: employee.regularHours,
      tempOvertime: employee.overtime,
      tempCommission: employee.commission,
    });
    setShowEditModal(true);
  };

  // Save employee edits
  const handleSaveEmployee = () => {
    if (!editingEmployee) return;

    const updatedEmployees = employees.map((emp) => {
      if (emp.id === editingEmployee.id) {
        const regularHours = parseFloat(editingEmployee.tempRegularHours) || 0;
        const overtime = parseFloat(editingEmployee.tempOvertime) || 0;
        const commission = parseFloat(editingEmployee.tempCommission) || 0;

        // Calculate gross pay using configurable rates
        const grossPay =
          regularHours * payRates.regularRate +
          overtime * payRates.overtimeRate +
          commission;

        return {
          ...emp,
          regularHours,
          overtime,
          commission,
          grossPay,
          status: regularHours >= 80 ? "Ready" : "Incomplete",
          statusColor: regularHours >= 80 ? "green" : "amber",
          warning: regularHours < 80,
        };
      }
      return emp;
    });

    setEmployees(updatedEmployees);
    setShowEditModal(false);
    setEditingEmployee(null);
    toast.success("Employee details updated successfully");
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingEmployee(null);
  };

  const sampleEmployees = [
    {
      id: "EMP-001",
      name: "Sarah Jenkins",
      initials: "SJ",
      color: "blue",
      regularHours: 80.0,
      overtime: 2.5,
      commission: 500.0,
      grossPay:
        80.0 * payRates.regularRate + 2.5 * payRates.overtimeRate + 500.0,
      status: "Ready",
      statusColor: "green",
    },
    {
      id: "EMP-007",
      name: "David Kim",
      initials: "DK",
      color: "purple",
      regularHours: 75.0,
      overtime: 0.0,
      commission: 1200.0,
      grossPay:
        75.0 * payRates.regularRate + 0.0 * payRates.overtimeRate + 1200.0,
      status: "Review",
      statusColor: "amber",
      warning: true,
    },
    {
      id: "EMP-012",
      name: "Elena Rodriguez",
      initials: "ER",
      color: "teal",
      regularHours: 80.0,
      overtime: 5.0,
      commission: 0.0,
      grossPay: 80.0 * payRates.regularRate + 5.0 * payRates.overtimeRate + 0.0,
      status: "Ready",
      statusColor: "green",
    },
    {
      id: "EMP-004",
      name: "Michael Ross",
      initials: "MR",
      color: "orange",
      regularHours: 80.0,
      overtime: 0.0,
      commission: 0.0,
      grossPay: 80.0 * payRates.regularRate + 0.0 * payRates.overtimeRate + 0.0,
      status: "Ready",
      statusColor: "green",
    },
  ];

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1 && !selectedPeriod.startDate) {
        toast.error("Please select a payroll period");
        return;
      }
      setCurrentStep(currentStep + 1);
      toast.success(`Moving to step ${currentStep + 1}`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const draftData = {
        period: selectedPeriod,
        employees: employees,
        deductions: deductions,
        payRates: payRates,
        currentStep: currentStep,
        savedAt: new Date().toISOString(),
      };

      // Save to localStorage as draft
      localStorage.setItem("payrollDraft", JSON.stringify(draftData));

      // Optionally save to server
      // await apiService.post("/api/payroll/draft", draftData);

      toast.success("Payroll draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayroll = async () => {
    try {
      setLoading(true);
      // API call to submit payroll
      // const response = await apiService.post("/api/payroll/submit", {
      //   period: selectedPeriod,
      //   employees: employees,
      //   deductions: deductions,
      // });
      toast.success("Payroll submitted for approval!");
      setCurrentStep(5);
    } catch (error) {
      console.error("Error submitting payroll:", error);
      toast.error("Failed to submit payroll");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: "Select Period", completed: currentStep > 1 },
    {
      number: 2,
      label: "Review Earnings",
      active: currentStep === 2,
      completed: currentStep > 2,
    },
    {
      number: 3,
      label: "Deductions",
      active: currentStep === 3,
      completed: currentStep > 3,
    },
    {
      number: 4,
      label: "Final Review",
      active: currentStep === 4,
      completed: currentStep > 4,
    },
    {
      number: 5,
      label: "Payments",
      active: currentStep === 5,
      completed: false,
    },
  ];

  const totalGrossPay = employees.reduce((sum, emp) => sum + emp.grossPay, 0);
  const progressPercentage = (currentStep / totalSteps) * 100;

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
      purple:
        "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300",
      teal: "bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300",
      orange:
        "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300",
      pink: "bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300",
      indigo:
        "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300",
    };
    return colors[color] || colors.blue;
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark">
      <Breadcrumb
        items={[
          { label: "Home", href: "/home", icon: "fa-house" },
          { label: "HR Management", icon: "fa-user-tie", onClick: onBack },
          { label: "Payroll Processing", icon: "fa-money-bill-wave" },
        ]}
      />

      <main className="flex-1 p-3">
        <div className="flex flex-col w-full gap-6">
          {/* Page Heading & Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                Payroll Processing
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Review and approve employee payments for the current period.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setHideAmounts(!hideAmounts)}
                className="flex items-center gap-2 h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <i
                  className={`fa-solid ${
                    hideAmounts ? "fa-eye" : "fa-eye-slash"
                  }`}
                ></i>
                <span className="hidden sm:inline">
                  {hideAmounts ? "Show" : "Hide"} Amounts
                </span>
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="flex h-10 items-center gap-2 justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fa-solid fa-save"></i>
                {loading ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-medium text-gray-900 dark:text-white mb-2">
                <span>
                  Progress: Step {currentStep} of {totalSteps}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {Math.round(progressPercentage)}% Completed
                </span>
              </div>

              {/* Steps Visual */}
              <div className="relative flex items-center justify-between w-full">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
                  }}
                ></div>

                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="flex flex-col items-center gap-2 z-10"
                  >
                    <div
                      className={`size-8 rounded-full flex items-center justify-center font-bold ring-4 ring-white dark:ring-slate-800 ${
                        step.completed
                          ? "bg-blue-600 text-white"
                          : step.active
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {step.completed ? (
                        <i className="fa-solid fa-check text-sm"></i>
                      ) : (
                        step.number
                      )}
                    </div>
                    <span
                      className={`text-xs font-${
                        step.active ? "bold" : "medium"
                      } hidden sm:block ${
                        step.active
                          ? "text-slate-900 dark:text-white"
                          : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content - Step-based rendering */}
          {/* STEP 1: Select Period */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Select Payroll Period
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Month
                  </label>
                  <select
                    value={selectedPeriod.month}
                    onChange={(e) =>
                      setSelectedPeriod({
                        ...selectedPeriod,
                        month: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map((month, idx) => (
                      <option key={idx} value={idx}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Year
                  </label>
                  <select
                    value={selectedPeriod.year}
                    onChange={(e) =>
                      setSelectedPeriod({
                        ...selectedPeriod,
                        year: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    value={selectedPeriod.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-info-circle mr-1"></i>
                    End date will be calculated automatically based on payment
                    schedule
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Payment Schedule
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["Weekly", "Bi-weekly", "Semi-monthly", "Monthly"].map(
                      (schedule) => (
                        <button
                          key={schedule}
                          type="button"
                          onClick={() => handleScheduleChange(schedule)}
                          className={`px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all ${
                            selectedPeriod.paymentSchedule === schedule
                              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700"
                          }`}
                        >
                          {schedule}
                        </button>
                      )
                    )}
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-info-circle mr-1"></i>
                    Select payment frequency - end date will be calculated
                    automatically
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Period End Date
                    <span className="text-xs font-normal text-gray-500 ml-2">
                      (Auto-calculated)
                    </span>
                  </label>
                  <input
                    type="date"
                    value={selectedPeriod.endDate}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-slate-900 dark:text-white cursor-not-allowed"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Regular Hourly Rate (₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      ₦
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payRates.regularRate}
                      onChange={(e) =>
                        setPayRates({
                          ...payRates,
                          regularRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Standard hourly rate for regular working hours
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Overtime Hourly Rate (₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      ₦
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={payRates.overtimeRate}
                      onChange={(e) =>
                        setPayRates({
                          ...payRates,
                          overtimeRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Hourly rate for overtime hours (typically 1.5x regular rate)
                  </p>
                </div>
              </div>
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <i className="fa-solid fa-info-circle mr-2"></i>
                  Select the payroll period for processing. Employees will be
                  loaded based on this period.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Review Earnings */}
          {currentStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Period Summary Sidebar */}
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm sticky top-24">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    Current Period
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Pay Schedule</p>
                      <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-calendar-days text-gray-400 text-base"></i>
                        {selectedPeriod.paymentSchedule}
                      </p>
                    </div>
                    <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Period</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {months[selectedPeriod.month]} {selectedPeriod.year}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Period Start</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedPeriod.startDate
                          ? new Date(
                              selectedPeriod.startDate
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Period End</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedPeriod.endDate
                          ? new Date(selectedPeriod.endDate).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="w-full mt-6 py-2 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-edit text-sm"></i>
                    Edit Period
                  </button>
                </div>

                {/* Alerts */}
                {getMissingHoursCount() > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
                    <div className="flex items-start gap-3">
                      <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400 shrink-0"></i>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          Missing Hours
                        </h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                          {getMissingHoursCount()} employee
                          {getMissingHoursCount() > 1 ? "s have" : " has"}{" "}
                          incomplete time logs. Please review flagged items.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Main Table */}
              <div className="lg:col-span-3 flex flex-col gap-4">
                {/* Filters & Search */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                      <input
                        className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white"
                        placeholder="Search employee name or ID..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm text-gray-700 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                    >
                      <option>All Departments</option>
                      <option>Engineering</option>
                      <option>Sales</option>
                      <option>Marketing</option>
                      <option>Finance</option>
                      <option>HR</option>
                    </select>
                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                    <button
                      onClick={() => toast.info("Filter feature coming soon")}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
                    >
                      <i className="fa-solid fa-filter text-sm"></i>
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                {/* Earnings Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[240px]">
                            Employee
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Reg. Hours
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Overtime
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Commission
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Gross Pay
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {employees.map((employee) => (
                          <tr
                            key={employee.id}
                            className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${
                              employee.warning
                                ? "bg-amber-50/50 dark:bg-amber-900/10"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`size-8 rounded-full ${getColorClasses(
                                    employee.color
                                  )} flex items-center justify-center text-xs font-bold`}
                                >
                                  {employee.initials}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {employee.name}
                                  </p>
                                  <p className="text-xs text-gray-500 font-mono">
                                    ID: {employee.id}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                              {employee.warning ? (
                                <>
                                  <span className="text-amber-600 font-bold">
                                    {employee.regularHours.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-1">
                                    /80
                                  </span>
                                </>
                              ) : (
                                employee.regularHours.toFixed(2)
                              )}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                              {employee.overtime.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-gray-700 dark:text-gray-300">
                              {hideAmounts
                                ? "****"
                                : formatCurrency(employee.commission)}
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-bold text-slate-900 dark:text-white">
                              {hideAmounts
                                ? "****"
                                : formatCurrency(employee.grossPay)}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  employee.statusColor === "green"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                }`}
                              >
                                {employee.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleEditEmployee(employee)}
                                className={`p-1 rounded transition-colors ${
                                  employee.warning
                                    ? "text-blue-600 hover:text-blue-700 bg-blue-100/50"
                                    : "text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                                title={
                                  employee.warning
                                    ? "Complete time logs"
                                    : "Edit employee details"
                                }
                              >
                                <i className="fa-solid fa-pen-to-square text-lg"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing 1-{employees.length} of 24 employees
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled
                        className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button className="px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Deductions */}
          {currentStep === 3 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Configure Deductions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    value={deductions.taxRate}
                    onChange={(e) =>
                      setDeductions({
                        ...deductions,
                        taxRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pension Rate (%)
                  </label>
                  <input
                    type="number"
                    value={deductions.pensionRate}
                    onChange={(e) =>
                      setDeductions({
                        ...deductions,
                        pensionRate: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Health Insurance ({formatCurrency(0)})
                  </label>
                  <input
                    type="number"
                    value={deductions.healthInsurance}
                    onChange={(e) =>
                      setDeductions({
                        ...deductions,
                        healthInsurance: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Other Deductions ({formatCurrency(0)})
                  </label>
                  <input
                    type="number"
                    value={deductions.otherDeductions}
                    onChange={(e) =>
                      setDeductions({
                        ...deductions,
                        otherDeductions: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Total Tax</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency((totalGrossPay * deductions.taxRate) / 100)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Total Pension</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatCurrency(
                      (totalGrossPay * deductions.pensionRate) / 100
                    )}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Net Payable</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(
                      totalGrossPay -
                        (totalGrossPay *
                          (deductions.taxRate + deductions.pensionRate)) /
                          100 -
                        deductions.healthInsurance -
                        deductions.otherDeductions
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Final Review */}
          {currentStep === 4 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                Final Review
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                      Total Gross Pay
                    </p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                      {formatCurrency(totalGrossPay)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                      Total Deductions
                    </p>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-200">
                      {formatCurrency(
                        (totalGrossPay *
                          (deductions.taxRate + deductions.pensionRate)) /
                          100 +
                          deductions.healthInsurance +
                          deductions.otherDeductions
                      )}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                      Net Payable
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                      {formatCurrency(
                        totalGrossPay -
                          (totalGrossPay *
                            (deductions.taxRate + deductions.pensionRate)) /
                            100 -
                          deductions.healthInsurance -
                          deductions.otherDeductions
                      )}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Payroll Summary
                  </h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Period</dt>
                      <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                        {months[selectedPeriod.month]} {selectedPeriod.year}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Total Employees</dt>
                      <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                        {employees.length}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Tax Rate</dt>
                      <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                        {deductions.taxRate}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Pension Rate</dt>
                      <dd className="text-sm font-semibold text-slate-900 dark:text-white">
                        {deductions.pensionRate}%
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Payment Status */}
          {currentStep === 5 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm text-center">
              <div className="max-w-md mx-auto">
                <div className="size-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-check text-4xl text-green-600 dark:text-green-400"></i>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  Payroll Submitted!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your payroll has been submitted for approval. It will be sent
                  to Finance for processing once approved.
                </p>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-left">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-2">
                    Next Steps:
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                    <li className="flex items-start gap-2">
                      <i className="fa-solid fa-circle-check text-blue-600 mt-0.5"></i>
                      <span>Finance team will review the payroll</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <i className="fa-solid fa-circle-check text-blue-600 mt-0.5"></i>
                      <span>
                        Payments will be scheduled in Accounts Payable
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <i className="fa-solid fa-circle-check text-blue-600 mt-0.5"></i>
                      <span>Employees will receive payment notifications</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Footer Action Bar */}
          <div className="sticky bottom-0 z-40 mt-6">
            <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-black/50 p-3 flex justify-between items-center w-full">
              <div className="flex items-center gap-6">
                {currentStep === 2 && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        Total Gross Pay
                      </span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        {hideAmounts ? "****" : formatCurrency(totalGrossPay)}
                      </span>
                    </div>
                    <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">
                        Employees
                      </span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        {employees.length}
                      </span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                {currentStep > 1 && currentStep < 5 && (
                  <button
                    onClick={handlePreviousStep}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                    Previous
                  </button>
                )}
                {currentStep < 4 && (
                  <button
                    onClick={handleNextStep}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentStep === 1 && "Next: Review Earnings"}
                    {currentStep === 2 && "Next: Manage Deductions"}
                    {currentStep === 3 && "Next: Final Review"}
                    <i className="fa-solid fa-arrow-right"></i>
                  </button>
                )}
                {currentStep === 4 && (
                  <button
                    onClick={handleSubmitPayroll}
                    disabled={loading}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-green-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        Submit for Approval
                      </>
                    )}
                  </button>
                )}
                {currentStep === 5 && (
                  <button
                    onClick={onBack}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
                  >
                    <i className="fa-solid fa-home"></i>
                    Back to HR Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Employee Edit Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`size-10 rounded-full ${getColorClasses(
                    editingEmployee.color
                  )} flex items-center justify-center text-sm font-bold`}
                >
                  {editingEmployee.initials}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Edit Employee Details
                  </h3>
                  <p className="text-sm text-gray-500">
                    {editingEmployee.name} - {editingEmployee.id}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <i className="fa-solid fa-times text-xl"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Warning if hours incomplete */}
              {editingEmployee.regularHours < 80 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-start gap-3">
                    <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400"></i>
                    <div>
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        Incomplete Time Logs
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                        This employee has less than 80 regular hours. Please
                        update time logs or add a note.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Regular Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Regular Hours
                  <span className="text-gray-500 font-normal ml-2">
                    (Standard: 80 hours)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="160"
                    value={editingEmployee.tempRegularHours}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        tempRegularHours: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    hrs
                  </span>
                </div>
                {parseFloat(editingEmployee.tempRegularHours) < 80 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    <i className="fa-solid fa-info-circle mr-1"></i>
                    {80 - parseFloat(editingEmployee.tempRegularHours)} hours
                    short of standard
                  </p>
                )}
              </div>

              {/* Overtime Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Overtime Hours
                  <span className="text-gray-500 font-normal ml-2">
                    (1.5x pay rate)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="40"
                    value={editingEmployee.tempOvertime}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        tempOvertime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    hrs
                  </span>
                </div>
              </div>

              {/* Commission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Commission / Bonus
                  <span className="text-gray-500 font-normal ml-2">
                    (Optional)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    ₦
                  </span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={editingEmployee.tempCommission}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        tempCommission: e.target.value,
                      })
                    }
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                  />
                </div>
              </div>

              {/* Calculated Gross Pay Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-3">
                  Gross Pay Calculation
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-300">
                      Regular:{" "}
                      {parseFloat(
                        editingEmployee.tempRegularHours || 0
                      ).toFixed(2)}{" "}
                      hrs × ₦{payRates.regularRate}
                    </span>
                    <span className="font-mono text-blue-900 dark:text-blue-100">
                      {formatCurrency(
                        parseFloat(editingEmployee.tempRegularHours || 0) *
                          payRates.regularRate
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-300">
                      Overtime:{" "}
                      {parseFloat(editingEmployee.tempOvertime || 0).toFixed(2)}{" "}
                      hrs × ₦{payRates.overtimeRate}
                    </span>
                    <span className="font-mono text-blue-900 dark:text-blue-100">
                      {formatCurrency(
                        parseFloat(editingEmployee.tempOvertime || 0) *
                          payRates.overtimeRate
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-800 dark:text-blue-300">
                      Commission/Bonus
                    </span>
                    <span className="font-mono text-blue-900 dark:text-blue-100">
                      {formatCurrency(
                        parseFloat(editingEmployee.tempCommission || 0)
                      )}
                    </span>
                  </div>
                  <div className="h-px bg-blue-200 dark:bg-blue-700"></div>
                  <div className="flex justify-between font-bold">
                    <span className="text-blue-900 dark:text-blue-100">
                      Total Gross Pay
                    </span>
                    <span className="font-mono text-lg text-blue-900 dark:text-blue-100">
                      {formatCurrency(
                        parseFloat(editingEmployee.tempRegularHours || 0) *
                          payRates.regularRate +
                          parseFloat(editingEmployee.tempOvertime || 0) *
                            payRates.overtimeRate +
                          parseFloat(editingEmployee.tempCommission || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleCancelEdit}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEmployee}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-lg shadow-blue-600/30"
              >
                <i className="fa-solid fa-save mr-2"></i>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
