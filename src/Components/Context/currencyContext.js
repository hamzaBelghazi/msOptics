import React, { createContext, useContext, useEffect, useState } from "react";
import fx from "money";

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
  const defaultCurrency = "EUR";
  const supportedCurrencies = ["USD", "EUR", "GBP"];

  const [currency, setCurrencyState] = useState(defaultCurrency);
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // Read saved currency on mount
  useEffect(() => {
    const saved = localStorage.getItem("currency");
    if (saved && supportedCurrencies.includes(saved)) {
      setCurrencyState(saved);
    }
    fetchRates();
  }, []);

  // Save to localStorage whenever currency changes
  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  const fetchRates = async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await res.json();
      fx.base = data.base_code;
      fx.rates = data.rates;
      setRatesLoaded(true);
    } catch (err) {
      console.error("Failed to fetch exchange rates:", err);
    }
  };

  const convert = (amount, from = "EUR", to = currency) => {
    if (!ratesLoaded || !fx.rates[to]) return amount;
    return fx.convert(amount, { from, to });
  };

  const setCurrency = (cur) => {
    if (supportedCurrencies.includes(cur)) {
      setCurrencyState(cur);
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        convert,
        supportedCurrencies,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);
