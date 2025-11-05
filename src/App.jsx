import { Routes, Route } from "react-router-dom";
import "./App.css";
import Auth from "./components/auth/Auth";
import Dashboard from "./dashboard/Dashboard";
import DashboardAnalytics from "./components/DashboardAnalytics";
import AnalyticsPage from "./dashboard/AnalyticsPage";
import PrivateRoute from "./components/PrivateRoute";
import Module from "./components/Module";
import NotFound from "./components/NotFound";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Main dashboard page */}
        <Route path="/" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Modules list and module details (protected) */}
        <Route
          path="/modules"
          element={
            <PrivateRoute>
              <Module showNavbar={true} />
            </PrivateRoute>
          }
        />
        <Route
          path="/modules/:id"
          element={
            <PrivateRoute>
              <Module showNavbar={true} />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <AnalyticsPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
