"use client";

// Currency for the storefront.
//
// Prices are stored in EUR. Every other currency is a *display* conversion:
// rates come from our own /api/currency/rates endpoint (which proxies a free
// provider and caches it), so a blocked upstream or a rate limit can never leave
// the shop showing wrong or missing prices.
//
// The rates are mirrored into localStorage so a return visit formats prices
// immediately, before the network answers.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SERVER_URL } from "@/Api/adminApi";

export const BASE_CURRENCY = "EUR";

const RATES_KEY = "mhs-fx-rates";
const CURRENCY_KEY = "mhs-currency";
// the cookie is what lets the first client render (and, later, the server) know
// the choice without waiting for an effect
const CURRENCY_COOKIE = "currency";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// Codes we are willing to show, with the symbol the switcher prints. Only those
// present in the live rate table are offered.
const CURRENCIES = [
  { code: "EUR", symbol: "€", nameKey: "currency.eur" },
  { code: "USD", symbol: "$", nameKey: "currency.usd" },
  { code: "GBP", symbol: "£", nameKey: "currency.gbp" },
  { code: "CHF", symbol: "CHF" },
  { code: "MAD", symbol: "DH" },
  { code: "AED", symbol: "AED" },
  { code: "SAR", symbol: "SAR" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "JPY", symbol: "¥" },
  { code: "SEK", symbol: "kr" },
  { code: "PLN", symbol: "zł" },
  { code: "TRY", symbol: "₺" },
  { code: "INR", symbol: "₹" },
];

const ZERO_DECIMAL = new Set(["JPY", "KRW"]);

const readCurrencyCookie = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${CURRENCY_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]).toUpperCase() : "";
};

const writeCurrencyCookie = (code) => {
  if (typeof document === "undefined") return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${CURRENCY_COOKIE}=${code}; path=/; max-age=${oneYear}; SameSite=Lax`;
};

/** Intl formatting for an amount already in `code`. */
export function formatMoney(code, amount, locale = "en") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: ZERO_DECIMAL.has(code) ? 0 : 2,
    }).format(n);
  } catch (_) {
    return `${n.toFixed(2)} ${code}`;
  }
}

const CurrencyContext = createContext(null);

export const CurrencyProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const locale = i18n?.language || "en";

  // initial value comes from the cookie so the very first client render is
  // already in the shopper's currency; localStorage is the fallback
  const [currency, setCurrencyState] = useState(() => {
    const fromCookie = readCurrencyCookie();
    if (fromCookie) return fromCookie;
    try {
      return localStorage.getItem(CURRENCY_KEY) || BASE_CURRENCY;
    } catch (_) {
      return BASE_CURRENCY;
    }
  });
  const [rates, setRates] = useState({ [BASE_CURRENCY]: 1 });
  const [meta, setMeta] = useState({ fetchedAt: 0, provider: "", stale: true });
  const [ratesLoaded, setRatesLoaded] = useState(false);

  // last known rates, before the request comes back
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(RATES_KEY) || "null");
      if (cached?.rates?.[BASE_CURRENCY]) {
        setRates(cached.rates);
        setMeta({ fetchedAt: cached.fetchedAt || 0, provider: cached.provider || "cache", stale: true });
        setRatesLoaded(true);
      }
    } catch (_) {}
  }, []);

  // live rates
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/currency/rates`);
        const body = await res.json();
        const data = body?.data;
        if (!alive || !data?.rates?.[BASE_CURRENCY]) return;
        setRates(data.rates);
        setMeta({ fetchedAt: data.fetchedAt || Date.now(), provider: data.provider || "", stale: !!data.stale });
        setRatesLoaded(true);
        try {
          localStorage.setItem(
            RATES_KEY,
            JSON.stringify({
              rates: data.rates,
              fetchedAt: data.fetchedAt || Date.now(),
              provider: data.provider || "",
              savedAt: Date.now(),
            })
          );
        } catch (_) {}
      } catch (e) {
        // the cached snapshot stays in place; the shop keeps working offline
        console.warn("[currency] rates unavailable:", e.message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, currency);
    } catch (_) {}
    writeCurrencyCookie(currency);
  }, [currency]);

  const setCurrency = useCallback((code) => {
    if (!code) return;
    setCurrencyState(String(code).toUpperCase());
  }, []);

  /** Available currencies: everything with a rate, in the curated order. */
  const currencies = useMemo(() => {
    const available = CURRENCIES.filter((c) => Number.isFinite(rates[c.code]));
    // before the first response only the three the shop has always offered
    const list = available.length > 1 ? available : CURRENCIES.slice(0, 3);
    if (!list.some((c) => c.code === currency)) {
      list.push({ code: currency, symbol: currency });
    }
    return list;
  }, [rates, currency]);

  /** Amount in EUR -> amount in `to`. Falls back to the EUR amount until rates land. */
  const convert = useCallback(
    (amount, from = BASE_CURRENCY, to = currency) => {
      const n = Number(amount);
      if (!Number.isFinite(n)) return 0;
      if (from === to) return n;
      const fromRate = from === BASE_CURRENCY ? 1 : rates[from];
      const toRate = to === BASE_CURRENCY ? 1 : rates[to];
      if (!Number.isFinite(fromRate) || !Number.isFinite(toRate)) return n;
      return (n / fromRate) * toRate;
    },
    [rates, currency]
  );

  /** EUR amount formatted in the active currency (EUR until its rate is known). */
  const format = useCallback(
    (amount) => {
      const usable = currency === BASE_CURRENCY || Number.isFinite(rates[currency]);
      // no rate yet: show the real base price instead of mislabelling it
      if (!usable) return formatMoney(BASE_CURRENCY, amount, locale);
      return formatMoney(currency, convert(amount), locale);
    },
    [currency, convert, rates, locale]
  );

  /** EUR amount formatted in EUR, no conversion (admin screens, receipts). */
  const formatBase = useCallback((amount) => formatMoney(BASE_CURRENCY, amount, locale), [locale]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencies,
      convert,
      format,
      formatBase,
      rates,
      ratesLoaded,
      rate: rates[currency] || 1,
      baseCurrency: BASE_CURRENCY,
      updatedAt: meta.fetchedAt,
      provider: meta.provider,
      stale: meta.stale,
    }),
    [currency, setCurrency, currencies, convert, format, formatBase, rates, ratesLoaded, meta]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  // Screens rendered outside the provider (portal/SSR edge cases) still get a
  // working formatter instead of a crash.
  if (!ctx) {
    return {
      currency: BASE_CURRENCY,
      setCurrency: () => {},
      currencies: CURRENCIES.slice(0, 3),
      convert: (a) => Number(a) || 0,
      format: (a) => formatMoney(BASE_CURRENCY, a),
      formatBase: (a) => formatMoney(BASE_CURRENCY, a),
      rates: { [BASE_CURRENCY]: 1 },
      ratesLoaded: false,
      rate: 1,
      baseCurrency: BASE_CURRENCY,
      updatedAt: 0,
      provider: "",
      stale: true,
    };
  }
  return ctx;
};

export { CURRENCIES };
