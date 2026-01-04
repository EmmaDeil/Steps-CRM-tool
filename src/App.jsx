import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import ForgotPassword from "./components/auth/ForgotPassword";
import Home from "./home/Home";
import Profile from "./components/Profile";
import PrivateRoute from "./components/PrivateRoute";
import NotFound from "./components/NotFound";
import { Toaster } from "react-hot-toast";
import RetirementManagement from "./components/modules/RetirementManagement";
import DocSign from "./components/modules/DocSign";
import Navbar from "./components/Navbar";

function App() {
  const { user } = useAuth();

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
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

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

        <Route
          path="/modules/docsign"
          element={
            <PrivateRoute>
              <DocSign />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={<Navigate to="/home/profile" replace />}
        />
        <Route
          path="/retirement-management"
          element={<Navigate to="/home/retirement-management" replace />}
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
