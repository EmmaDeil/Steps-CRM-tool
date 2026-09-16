import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/useAuth";
import AuthPortal from "./components/auth/AuthPortal";
import VerifyEmail from "./components/auth/VerifyEmail";
import Home from "./home/Home";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import PrivateRoute from "./components/PrivateRoute";
import NotFound from "./components/NotFound";
import VisitorSignIn from "./components/VisitorSignIn";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";

// Defined outside App so React never sees a new component type on re-renders,
// preventing unmount/remount of child routes when App re-renders.
const PageWithNavbar = ({ children }) => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen d-flex flex-column">
      <Navbar user={user} />
      <div className="flex-grow-1">{children}</div>
    </div>
  );
};

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<AuthPortal />} />
        <Route path="/login" element={<AuthPortal />} />
        <Route path="/signup" element={<AuthPortal />} />
        <Route path="/forgot-password" element={<AuthPortal />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/visitor/:token" element={<VisitorSignIn />} />

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
          path="/home/settings"
          element={
            <PrivateRoute>
              <PageWithNavbar>
                <Settings />
              </PageWithNavbar>
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={<Navigate to="/home/profile" replace />}
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default App;
