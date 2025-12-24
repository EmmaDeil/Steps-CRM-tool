import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Auth from "./components/auth/Auth";
import Home from "./home/Home";
import AnalyticsPage from "./dashboard/AnalyticsPage";
import PrivateRoute from "./components/PrivateRoute";
import NotFound from "./components/NotFound";
import { Toaster } from "react-hot-toast";

function App() {
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

        {/* Backward-compat: redirect old routes to home */}
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="/modules" element={<Navigate to="/home" replace />} />
        <Route path="/modules/:id" element={<Navigate to="/home/:id" replace />} />
        
        {/* Analytics page */}
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <AnalyticsPage />
            </PrivateRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
