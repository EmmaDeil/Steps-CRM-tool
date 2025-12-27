import { Routes, Route, Navigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import "./App.css";
import Auth from "./components/auth/Auth";
import Home from "./home/Home";
import Profile from "./components/Profile";
import PrivateRoute from "./components/PrivateRoute";
import NotFound from "./components/NotFound";
import { Toaster } from "react-hot-toast";
import RetirementManagement from "./components/modules/RetirementManagement";
import Navbar from "./components/Navbar";

function App() {
  const { user } = useUser();

  const PageWithNavbar = ({ children }) => (
    <div className="min-h-screen d-flex flex-column">
      <Navbar user={user} />
      <div className="flex-grow-1">{children}</div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Auth page */}
        <Route path="/" element={<Auth />} />

        {/* Home - module list and detail view (protected) */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/home/:id"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        {/* Profile page inside app chrome (protected) */}
        <Route
          path="/home/profile"
          element={
            <PrivateRoute>
              <PageWithNavbar>
                <Profile />
              </PageWithNavbar>
            </PrivateRoute>
          }
        />

        {/* Retirement Management inside app chrome (protected) */}
        <Route
          path="/home/retirement-management"
          element={
            <PrivateRoute>
              <PageWithNavbar>
                <RetirementManagement />
              </PageWithNavbar>
            </PrivateRoute>
          }
        />

        {/* Redirects for backward compatibility */}
        <Route
          path="/profile"
          element={<Navigate to="/home/profile" replace />}
        />
        <Route
          path="/retirement-management"
          element={<Navigate to="/home/retirement-management" replace />}
        />

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
