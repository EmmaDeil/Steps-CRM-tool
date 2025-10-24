import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import LogoutButton from "../dashboard/LogoutButton";

const Navbar = ({ active, user, onLogout, searchQuery, setSearchQuery }) => {
  const handleSearch = (e) => {
    e.preventDefault();
    // searchQuery is already controlled via setSearchQuery
    // Could dispatch an event or call a callback here if needed
    console.log("Search for:", searchQuery);
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Steps CRM
        </Link>
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
              <Link
                className={`nav-link ${active === "home" ? "active" : ""}`}
                to="/dashboard"
              >
                Home
              </Link>
            </li>
            <li className="nav-item me-3">
              <Link
                className={`nav-link ${active === "module" ? "active" : ""}`}
                to="/modules"
              >
                Module
              </Link>
            </li>
            <li className="nav-item me-3">
              <Link className="nav-link" to="#">
                Chat
              </Link>
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
                <Link className="nav-link" to="/auth">
                  Login
                </Link>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  active: PropTypes.string,
  user: PropTypes.object,
  onLogout: PropTypes.func,
};

Navbar.defaultProps = {
  active: "home",
};

export default Navbar;
