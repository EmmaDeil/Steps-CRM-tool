import { Routes, Route } from "react-router-dom";
import "./App.css";
import Auth from "./components/auth/Auth";
import Dashboard from "./dashboard/Dashboard";
import PrivateRoute from "./components/PrivateRoute";
import ModulePage from "./components/ModulePage";
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
        <Route path="*" element={<NotFound />} />

        {/* Dynamic module page */}
        <Route path="/modules/:id" element={<ModulePage />} />
      </Routes>
    </>
  );
}

export default App;
