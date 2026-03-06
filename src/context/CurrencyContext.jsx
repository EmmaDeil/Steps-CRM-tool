import React, { createContext, useState, useEffect, useCallback } from "react";
import { apiService } from "../services/api";
import { setAppCurrency, getCurrencyConfig } from "../services/currency";

const CurrencyContext = createContext({
  currency: "NGN",
  setCurrency: () => {},
  refreshCurrency: () => {},
});

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrencyState] = useState(getCurrencyConfig().currency);

  const fetchCurrency = useCallback(async () => {
    try {
      const response = await apiService.get("/api/admin/system-settings");
      if (response.data?.currency) {
        setCurrencyState(response.data.currency);
        setAppCurrency(response.data.currency);
      }
    } catch {
      // Keep default currency if fetch fails
    }
  }, []);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  const setCurrency = useCallback((newCurrency) => {
    setCurrencyState(newCurrency);
    setAppCurrency(newCurrency);
  }, []);

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, refreshCurrency: fetchCurrency }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
