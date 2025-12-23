import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Auth from "./components/auth/Auth";
import Home from "./home/Home";
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
        {/* Auth page */}
        <Route path="/" element={<Auth />} />
        {/* New Home screen (post-login landing) */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
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
        {/* Backward-compat: redirect old dashboard route to home */}
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
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
