import React, { useState } from "react";
import Breadcrumb from "../Breadcrumb";
import { formatCurrency } from "../../services/currency";

const EmployeeProfile = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showCompensation, setShowCompensation] = useState(false);

  // Sample employee data - in production, this would come from props or API
  const employee = {
    id: "EMP-2021-042",
    name: "John Doe",
    jobTitle: "Senior Software Engineer",
    status: "Active",
    department: "Engineering Department",
    profilePicture:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDEZYYrr5mOTdWdIinFjaEgIBrRjucNOXw01MnjR1uDdVE4pPR5g7mgOMFHjMxBXbSLL5-KzTMN91HlHCH1uqpC2YU9-KDyrWq0R7XZlM3le8X4UQvia6t9AOi-5FjaqWJKC5-Wq_kkbN05Tm_UsqS6s5Z_gM8fRTwfmL689esgSpkV3EI-6akNk6ZYWW3PZBRuiIwKR7UDaGBQOyKsd5Vs5-4CGVqOf2Hwiz-i8KZj8eL4T8JcACHNdOWwCc92X6GUyPpGvU3NEZw",
    email: "john.doe@example.com",
    phone: "+1 (555) 012-3456",
    address: "123 Tech Park Blvd, Suite 400\nSan Francisco, CA 94107",
    dateOfBirth: "August 14, 1988",
    startDate: "Jan 12, 2021",
    departmentName: "Product Engineering",
    employmentType: "Full-Time (Permanent)",
    manager: {
      name: "Sarah Jenkins",
      title: "Director of Engineering",
      profilePicture:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuChOcUlKZZLmDejt-Oxy8gAT_Xy0fj_O9wC1SM_FKflLB9jRhptfgEkskDh490PH0Y9qSTapr4evHPxzYsAq806z5dX2llTTlmYS2XzJ8xqjLjRV1yt0atWM6mhlZIjhtoGo_JY_PakYD-muEMwyu85GOcYuw0w7tEyqYgGX3HPucq2ZuDC-UkIvaLeMD3k1bFFSyyYVktxJmNiR1UaE35bx1e9Bg-3OOjOXfOIq8xiaG4x_1vt3hhWL1fdRc8swSTAgz7zxax9St0",
    },
    compensation: {
      annualSalary: 145000.0,
      bonus: "15% Annual Performance Bonus",
      benefits: [
        "Gold Health Insurance Plan",
        "Dental & Vision Coverage",
        "401k Matching (5%)",
      ],
    },
    timeOff: {
      vacation: { used: 12, total: 20, expiryDate: "Dec 31" },
      sick: { used: 8, total: 10 },
      upcoming: { dates: "Nov 24 - Nov 26", type: "Vacation" },
    },
    performance: {
      lastReview: { period: "Q4 2023", rating: 4.2 },
      nextReview: "November 15, 2024",
      recentTraining: [
        { name: "Advanced React Patterns", status: "Completed" },
        { name: "Security Awareness 2024", status: "In Progress" },
      ],
    },
    documents: [
      {
        name: "Employment_Contract_2021.pdf",
        date: "Jan 12, 2021",
        type: "pdf",
        color: "red",
      },
      {
        name: "NDA_Signed.pdf",
        date: "Jan 12, 2021",
        type: "pdf",
        color: "blue",
      },
      {
        name: "ID_Card_Copy_Front.png",
        date: "Feb 01, 2023",
        type: "image",
        color: "gray",
      },
    ],
  };

  const breadcrumbItems = [
    { label: "Home", icon: "fa-home", onClick: onBack },
    { label: "Employees", icon: "fa-users", onClick: onBack },
    { label: "Profile", icon: "fa-user" },
  ];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "personal", label: "Personal" },
    { id: "employment", label: "Employment" },
    { id: "documents", label: "Documents" },
    { id: "performance", label: "Performance" },
  ];

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fa-solid fa-star text-sm ${
            i < fullStars
              ? "text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        ></i>
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Breadcrumb items={breadcrumbItems} />

      <div className="px-4 md:px-10 lg:px-40 py-5">
        <div className="max-w-[1200px] mx-auto">
          {/* Profile Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex gap-4 items-center">
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-center bg-cover border-4 border-gray-50 dark:border-gray-900"
                  style={{ backgroundImage: `url(${employee.profilePicture})` }}
                ></div>
                <div className="flex flex-col justify-center">
                  <h1 className="text-gray-900 dark:text-white text-2xl md:text-3xl font-bold">
                    {employee.name}
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-base">
                    {employee.jobTitle}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                      {employee.status}
                    </span>
                    <span className="text-gray-500 dark:text-gray-500 text-sm">
                      •
                    </span>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {employee.department}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button className="flex-1 md:flex-none px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg text-sm font-semibold transition-colors border border-transparent dark:border-gray-600">
                  <span>More</span>
                  <i className="fa-solid fa-chevron-down ml-2 text-xs"></i>
                </button>
                <button className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors">
                  <i className="fa-solid fa-pencil mr-2 text-xs"></i>
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 gap-8 overflow-x-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
              {/* Personal Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                    Personal Information
                  </h3>
                  <button className="text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors">
                    <i className="fa-solid fa-pencil text-sm"></i>
                  </button>
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Email Address
                    </p>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-envelope text-sm text-gray-500"></i>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee.email}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Phone Number
                    </p>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-phone text-sm text-gray-500"></i>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee.phone}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Address
                    </p>
                    <div className="flex items-start gap-2">
                      <i className="fa-solid fa-location-dot text-sm text-gray-500 mt-1"></i>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium whitespace-pre-line">
                        {employee.address}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Date of Birth
                    </p>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-cake-candles text-sm text-gray-500"></i>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee.dateOfBirth}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                    Employment Details
                  </h3>
                  <button className="text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors">
                    <i className="fa-solid fa-pencil text-sm"></i>
                  </button>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Employee ID
                      </p>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                        Start Date
                      </p>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee.startDate}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Department
                    </p>
                    <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                      {employee.departmentName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Reporting Manager
                    </p>
                    <div className="flex items-center gap-3 mt-1 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
                      <div
                        className="w-8 h-8 rounded-full bg-center bg-cover"
                        style={{
                          backgroundImage: `url(${employee.manager.profilePicture})`,
                        }}
                      ></div>
                      <div>
                        <p className="text-gray-900 dark:text-gray-200 text-sm font-bold group-hover:text-blue-600">
                          {employee.manager.name}
                        </p>
                        <p className="text-gray-500 dark:text-gray-500 text-xs">
                          {employee.manager.title}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Employment Type
                    </p>
                    <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                      {employee.employmentType}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compensation */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                    Compensation
                  </h3>
                  <button
                    onClick={() => setShowCompensation(!showCompensation)}
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <i
                      className={`fa-solid ${
                        showCompensation ? "fa-eye-slash" : "fa-eye"
                      } text-sm`}
                    ></i>
                  </button>
                </div>
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Annual Salary
                    </p>
                    <p className="text-gray-900 dark:text-gray-200 text-xl font-bold font-mono tracking-tight">
                      {showCompensation
                        ? formatCurrency(employee.compensation.annualSalary)
                        : "••••••••"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                      Bonus Structure
                    </p>
                    <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                      {employee.compensation.bonus}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-transparent dark:border-gray-600">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                      Active Benefits
                    </p>
                    <ul className="space-y-2">
                      {employee.compensation.benefits.map((benefit, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200"
                        >
                          <i className="fa-solid fa-circle-check text-emerald-500 text-base"></i>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Time & Attendance */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                    Time Off Balances
                  </h3>
                  <a className="text-blue-600 text-sm font-medium hover:underline cursor-pointer">
                    Request Leave
                  </a>
                </div>
                <div className="space-y-6 flex-1">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        Vacation Leave
                      </span>
                      <span className="text-sm font-bold text-blue-600">
                        {employee.timeOff.vacation.used} /{" "}
                        {employee.timeOff.vacation.total} Days
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: `${
                            (employee.timeOff.vacation.used /
                              employee.timeOff.vacation.total) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
                      Expires {employee.timeOff.vacation.expiryDate}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                        Sick Leave
                      </span>
                      <span className="text-sm font-bold text-emerald-500">
                        {employee.timeOff.sick.used} /{" "}
                        {employee.timeOff.sick.total} Days
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div
                        className="bg-emerald-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            (employee.timeOff.sick.used /
                              employee.timeOff.sick.total) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <i className="fa-solid fa-calendar-check text-blue-600 text-xl"></i>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        Upcoming Leave
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {employee.timeOff.upcoming.dates} (
                        {employee.timeOff.upcoming.type})
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance & Development */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                    Performance
                  </h3>
                  <a className="text-blue-600 text-sm font-medium hover:underline cursor-pointer">
                    Full History
                  </a>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                      Last Review ({employee.performance.lastReview.period})
                    </p>
                    <div className="flex items-center gap-1">
                      {renderStars(employee.performance.lastReview.rating)}
                      <span className="text-sm font-bold ml-1 dark:text-white">
                        {employee.performance.lastReview.rating}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-2">
                      Next Review
                    </p>
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-calendar text-sm text-gray-500"></i>
                      <p className="text-gray-900 dark:text-gray-200 text-sm font-medium">
                        {employee.performance.nextReview}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                      Recent Training
                    </p>
                    <div className="flex flex-col gap-2">
                      {employee.performance.recentTraining.map(
                        (training, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-900 dark:text-gray-200 truncate pr-2">
                              {training.name}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                training.status === "Completed"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}
                            >
                              {training.status}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                  <h3 className="text-gray-900 dark:text-white text-lg font-bold">
                    Documents
                  </h3>
                  <button className="text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors">
                    <i className="fa-solid fa-upload text-sm"></i>
                  </button>
                </div>
                <div className="space-y-3 flex-1">
                  {employee.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    >
                      <div
                        className={`p-2 rounded ${
                          doc.color === "red"
                            ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            : doc.color === "blue"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            doc.type === "image" ? "fa-image" : "fa-file-pdf"
                          } text-lg`}
                        ></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Added {doc.date}
                        </p>
                      </div>
                      <i className="fa-solid fa-download text-gray-500 hover:text-blue-600 text-xl opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                  ))}
                  <div className="mt-2 text-center">
                    <a className="text-xs font-medium text-blue-600 hover:underline cursor-pointer">
                      View All Documents
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tab content placeholders */}
          {activeTab !== "overview" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 text-center">
              <i className="fa-solid fa-circle-info text-4xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} content
                coming soon
              </p>
            </div>
          )}

          <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
