import React, { useState } from "react";
import PropTypes from "prop-types";
import { NavLink, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import stepsLogo from "../assets/steps-logo.ico";
import NotificationCenter from "./NotificationCenter";
import { useAppContext } from "../context/useAppContext";

const Navbar = ({
  user,
  searchQuery,
  setSearchQuery,
  onSearch,
  showBackButton,
  onBack,
  showCompanyBranding = false,
  companyName = "Steps CRM",
  companySubtitle = null,
  companyLogo = null,
}) => {
  const navigate = useNavigate();
  const { searchHistory, addSearchHistory } = useAppContext();
  const [showSearchHistory, setShowSearchHistory] = React.useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch && searchQuery) {
      addSearchHistory(searchQuery);
      onSearch(searchQuery);
      setShowSearchHistory(false);
    }
  };

  const handleSearchHistoryClick = (query) => {
    if (setSearchQuery) setSearchQuery(query);
    if (onSearch) onSearch(query);
    setShowSearchHistory(false);
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/home");
    }
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white dark:bg-[#111418] border-b border-[#dbe0e6] dark:border-gray-800">
      <div className="px-3 md:px-6">
        <div className="flex items-center justify-between py-3">
          {showCompanyBranding ? (
            <div className="flex items-center gap-3">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-10"
                aria-label="Company Logo"
                style={{ backgroundImage: companyLogo ? `url('${companyLogo}')` : "url('/assets/step-logo.ico')" }}
              />
              <div className="flex flex-col">
                <h1 className="text-[#111418] dark:text-white text-base font-bold leading-tight">
                  {companyName}
                </h1>
                {companySubtitle && (
                  <p className="text-[#617589] dark:text-gray-400 text-xs font-medium">
                    {companySubtitle}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <NavLink className="flex items-center gap-2" to="/home">
              <img src={stepsLogo} alt="Steps Logo" className="w-7 h-7" />
              <span className="hidden sm:inline text-sm font-semibold text-[#111418] dark:text-white">
                Steps CRM
              </span>
              <span className="sm:hidden text-sm font-semibold text-[#111418] dark:text-white">
                Steps
              </span>
            </NavLink>
          )}

          <div className="flex items-center gap-2 md:gap-4">
            {/* Back button */}
            {showBackButton && (
              <button
                className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={handleBackClick}
                title="Back to Modules"
              >
                <span className="material-symbols-outlined text-base">
                  arrow_back
                </span>
                Back
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200"
              aria-label="Toggle navigation"
              onClick={() => setIsOpen((v) => !v)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>

        {/* Collapsible content */}
        <div className={`${isOpen ? "block" : "hidden"} md:block pb-3 md:pb-0`}>
          {/* Search */}
          <div className="relative md:my-3">
            <form
              className="flex items-center gap-2"
              onSubmit={handleSearch}
              role="search"
            >
              <input
                className="flex-1 md:w-auto min-w-[200px] rounded-md border border-[#dbe0e6] dark:border-gray-700 bg-white dark:bg-[#1e293b] px-3 py-2 text-sm text-[#111418] dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-primary"
                type="search"
                placeholder="Search modules"
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
              />
              <button
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold rounded-md border border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                type="submit"
              >
                <span className="hidden md:inline">Search</span>
                <span className="md:hidden material-symbols-outlined">
                  search
                </span>
              </button>
            </form>

            {showSearchHistory && searchHistory.length > 0 && (
              <>
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 1040 }}
                  onClick={() => setShowSearchHistory(false)}
                />
                <div
                  className="absolute mt-1 shadow-lg"
                  style={{ zIndex: 1050, width: "100%", maxWidth: "300px" }}
                >
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] p-2">
                    <small className="block text-xs text-[#617589] dark:text-gray-400 px-2">
                      Recent Searches
                    </small>
                    <div className="flex flex-col">
                      {searchHistory.slice(0, 5).map((query, index) => (
                        <button
                          key={index}
                          className="text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                          onClick={() => handleSearchHistoryClick(query)}
                        >
                          <span className="material-symbols-outlined align-middle text-base mr-2">
                            search
                          </span>
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Nav items */}
          <div className="mt-3 md:mt-0 md:flex md:items-center md:justify-end md:gap-3">
            {showBackButton && (
              <button
                className="md:hidden inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={handleBackClick}
                title="Back to Modules"
              >
                <span className="material-symbols-outlined text-base">
                  arrow_back
                </span>
                Back
              </button>
            )}

            <div className="inline-flex items-center gap-3">
              <NotificationCenter />
              <NavLink
                className={({ isActive }) =>
                  `${
                    isActive
                      ? "text-primary"
                      : "text-[#617589] dark:text-gray-400"
                  } inline-flex items-center gap-1 text-sm font-medium hover:text-primary`
                }
                to="/chat"
              >
                <span className="material-symbols-outlined">chat</span>
                <span className="hidden xl:inline">Chat</span>
              </NavLink>
              {user ? (
                <div className="inline-flex items-center gap-2">
                  {!showCompanyBranding && (
                    <div className="hidden lg:block text-right">
                      <div className="text-xs font-semibold text-[#111418] dark:text-white">
                        {user.fullName || user.firstName || "User"}
                      </div>
                      <div className="text-[11px] text-[#617589] dark:text-gray-400">
                        {user.primaryEmailAddress?.emailAddress}
                      </div>
                    </div>
                  )}
                  {showCompanyBranding ? (
                    <div className="flex items-center gap-3 pl-1">
                      <div
                        className="bg-center bg-no-repeat bg-cover rounded-full size-9"
                        aria-label="User avatar"
                        style={{ backgroundImage: "url('/assets/step-logo.ico')" }}
                      />
                      <div className="hidden md:flex flex-col">
                        <p className="text-[#111418] dark:text-white text-sm font-medium leading-tight">
                          {user?.fullName || "User"}
                        </p>
                        <p className="text-[#617589] dark:text-gray-400 text-xs font-normal">
                          {user?.primaryEmailAddress?.emailAddress || ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <UserButton afterSignOutUrl="/" />
                  )}
                </div>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    `${
                      isActive
                        ? "text-primary"
                        : "text-[#617589] dark:text-gray-400"
                    } inline-flex items-center text-sm font-medium hover:text-primary`
                  }
                  to="/"
                >
                  Login
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

Navbar.propTypes = {
  user: PropTypes.object,
  searchQuery: PropTypes.string,
  setSearchQuery: PropTypes.func,
  onSearch: PropTypes.func,
  showBackButton: PropTypes.bool,
  onBack: PropTypes.func,
  showCompanyBranding: PropTypes.bool,
  companyName: PropTypes.string,
  companySubtitle: PropTypes.string,
  companyLogo: PropTypes.string,
};
