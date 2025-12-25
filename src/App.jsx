import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Auth from "./components/auth/Auth";
import Home from "./home/Home";
import PrivateRoute from "./components/PrivateRoute";
import NotFound from "./components/NotFound";
import { Toaster } from "react-hot-toast";
import RetirementManagement from "./components/modules/RetirementManagement";

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

        {/* Retirement Management (protected) */}
        <Route
          path="/retirement-management"
          element={
            <PrivateRoute>
              <RetirementManagement />
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
