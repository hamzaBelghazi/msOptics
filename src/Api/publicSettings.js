"use client";
// Public site settings (which sign-in and payment methods are on) fetched
// once and cached for the tab's lifetime. Fails soft: an unreachable API
// leaves the shop running without optional buttons.
import { useEffect, useState } from "react";
import api from "./axiosConfig";

let promise = null;
const fallback = {
  googleAuth: { enabled: false, oneTap: false, clientId: "" },
  payments: {
    stripe: { enabled: false, publishableKey: "" },
    paypal: { enabled: false, mode: "sandbox", clientId: "" },
    cod: { enabled: false, maxAmount: 0, note: "" },
  },
};

export function getPublicSettings() {
  if (!promise) {
    promise = api
      .get("/settings")
      .then((r) => r.data?.data?.settings || fallback)
      .catch(() => fallback);
  }
  return promise;
}

export function usePublicSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    let alive = true;
    getPublicSettings().then((s) => alive && setSettings(s));
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}
