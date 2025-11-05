import React from "react";
import PropTypes from "prop-types";
import { NavLink, useNavigate } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import stepsLogo from "../assets/steps-logo.ico";

const Navbar = ({
  user,
  searchQuery,
  setSearchQuery,
  onSearch,
  showBackButton,
  onBack,
}) => {
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/modules");
    }
  };

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
          <form
            className="d-flex ms-3 me-auto"
            onSubmit={handleSearch}
            role="search"
          >
            <input
              className="form-control me-2"
              type="search"
              placeholder="Search modules"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-outline-primary" type="submit">
              Search
            </button>
          </form>

          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 align-items-lg-center">
            {showBackButton && (
              <button
                className="btn btn-outline-secondary btn-md ms-1"
                onClick={handleBackClick}
                title="Back to Modules"
              >
                Back
              </button>
            )}
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
