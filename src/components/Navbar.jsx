import React from "react";
import PropTypes from "prop-types";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
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
}) => {
  const navigate = useNavigate();
  const location = useLocation();
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
      navigate("/modules");
    }
  };

  const isAnalyticsActive =
    location.pathname === "/analytics" ||
    location.pathname.startsWith("/dashboard/analytics");

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div className="container-fluid">
        <NavLink
          className="navbar-brand d-flex align-items-center"
          to="/dashboard"
        >
          <img
            src={stepsLogo}
            alt="Steps Logo"
            style={{ width: "30px", height: "30px", marginRight: "8px" }}
          />
          Steps CRM
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <div className="position-relative ms-3 me-auto">
            <form className="d-flex" onSubmit={handleSearch} role="search">
              <input
                className="form-control me-2"
                type="search"
                placeholder="Search modules"
                aria-label="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchHistory(true)}
              />
              <button className="btn btn-outline-primary" type="submit">
                Search
              </button>
            </form>
            {showSearchHistory && searchHistory.length > 0 && (
              <>
                <div
                  className="position-fixed top-0 start-0 w-100 h-100"
                  style={{ zIndex: 1040 }}
                  onClick={() => setShowSearchHistory(false)}
                />
                <div
                  className="position-absolute card shadow-lg mt-1"
                  style={{ zIndex: 1050, width: "100%", maxWidth: "300px" }}
                >
                  <div className="card-body p-2">
                    <small className="text-secondary px-2">
                      Recent Searches
                    </small>
                    <div className="list-group list-group-flush">
                      {searchHistory.slice(0, 5).map((query, index) => (
                        <button
                          key={index}
                          className="list-group-item list-group-item-action border-0"
                          onClick={() => handleSearchHistoryClick(query)}
                        >
                          <svg
                            width="14"
                            height="14"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            className="me-2"
                          >
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                          </svg>
                          {query}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center gap-2">
            {showBackButton && (
              <li className="nav-item">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleBackClick}
                  title="Back to Modules"
                >
                  Back
                </button>
              </li>
            )}
            <li className="nav-item d-flex align-items-center">
              {/* Analytics / Dashboard toggle: when on analytics page show Dashboard button to return */}
              {isAnalyticsActive ? (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/dashboard")}
                  aria-label="Go to Dashboard"
                  title="Back to Dashboard"
                >
                  🏠 Dashboard
                </button>
              ) : (
                <button
                  className="btn btn-outline-primary"
                  onClick={() => navigate("/analytics")}
                  aria-label="Go to Analytics"
                  title="Open Analytics"
                >
                  📊 Analytics
                </button>
              )}
            </li>
            <li className="nav-item">
              <NotificationCenter />
            </li>
            {/* Theme toggle removed per project settings */}
            <li className="nav-item me-3">
              <NavLink
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                to="/chat"
              >
                Chat
              </NavLink>
            </li>
            <li className="nav-item">
              {user ? (
                <div className="d-flex align-items-center">
                  <div className="me-3 text-end d-none d-lg-block">
                    <div className="fw-bold">
                      {user.fullName || user.firstName || "User"}
                    </div>
                    <div className="small text-secondary">
                      {user.primaryEmailAddress?.emailAddress}
                    </div>
                  </div>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  to="/"
                >
                  Login
                </NavLink>
              )}
            </li>
          </ul>
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
};
