import { useState, useEffect, useCallback } from "react";
import { apiService } from "../services/api";

export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get("/api/departments");
      const depts = response?.departments || response?.data?.departments || [];
      setDepartments(depts);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return { departments, loading, error, refresh: fetchDepartments };
}
