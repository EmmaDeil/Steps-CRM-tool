import { createContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import apiService from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is already logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        // Verify token with backend
        const response = await apiService.get("/api/auth/verify");
        if (response.success) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
          // Token invalid, clear it
          localStorage.removeItem("authToken");
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("authToken");
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.post("/api/auth/login", {
        email,
        password,
      });
      if (response && response.success) {
        localStorage.setItem("authToken", response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: response?.error || "Login failed" };
    } catch (error) {
      console.error("Login error:", error);
      const serverMsg = error.serverData?.error || error.serverData?.message;
      return {
        success: false,
        error: serverMsg || error.message || "Login failed",
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await apiService.post("/api/auth/signup", userData);
      // response is now the response body (thanks to interceptor)
      if (response && response.success) {
        localStorage.setItem("authToken", response.data.token);
        setUser(response.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, error: response?.error || "Signup failed" };
    } catch (error) {
      console.error("Signup error:", error);
      // Prefer server-sent error messages when available
      const serverMsg = error.serverData?.error || error.serverData?.message;
      return {
        success: false,
        error: serverMsg || error.message || "Signup failed",
      };
    }
  };

  const logout = async () => {
    try {
      await apiService.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("authToken");
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      const response = await apiService.post("/api/auth/forgot-password", {
        email,
      });
      return response;
    } catch (error) {
      console.error("Reset password error:", error);
      return {
        success: false,
        error: error.message || "Failed to send reset email",
      };
    }
  };

  const updatePassword = async (token, newPassword) => {
    try {
      const response = await apiService.post("/api/auth/reset-password", {
        token,
        newPassword,
      });
      return response;
    } catch (error) {
      console.error("Update password error:", error);
      return {
        success: false,
        error: error.message || "Failed to update password",
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    signup,
    logout,
    resetPassword,
    updatePassword,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
