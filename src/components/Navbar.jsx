import React from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import LogoutButton from "../dashboard/LogoutButton";

const Navbar = ({ user, onLogout, searchQuery, setSearchQuery, onSearch }) => {
  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(searchQuery);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div className="container-fluid">
        <NavLink className="navbar-brand" to="/dashboard">
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
            <li className="nav-item me-3">
              <NavLink
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                to="/dashboard"
              >
                Home
              </NavLink>
            </li>
            <li className="nav-item me-3">
              <NavLink
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                to="/modules"
              >
                Modules
              </NavLink>
            </li>
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
                    <div className="fw-bold">{user.displayName || "User"}</div>
                    <div className="small text-secondary">{user.email}</div>
                  </div>
                  <div>
                    {onLogout ? (
                      <button
                        className="btn btn-outline-secondary"
                        onClick={onLogout}
                      >
                        Logout
                      </button>
                    ) : (
                      <LogoutButton />
                    )}
                  </div>
                </div>
              ) : (
                <NavLink
                  className={({ isActive }) =>
                    `nav-link ${isActive ? "active" : ""}`
                  }
                  to="/auth"
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
  onLogout: PropTypes.func,
  searchQuery: PropTypes.string,
  setSearchQuery: PropTypes.func,
  onSearch: PropTypes.func,
};
