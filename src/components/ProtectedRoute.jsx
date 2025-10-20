// src/components/ProtectedRoute.jsx
import React from "react";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { subscribeToAuthChanges } from "../firebase";

const ProtectedRoute = ({ children }) => {
  const [authState, setAuthState] = useState({ initialized: false, user: null });

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setAuthState({ initialized: true, user });
    });
    return unsubscribe;
  }, []);

  if (!authState.initialized) {
    // or show a spinner
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!authState.user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;
