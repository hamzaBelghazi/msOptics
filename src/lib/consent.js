// Cookie consent state — single source of truth.
// Categories: necessary (always on), preferences, analytics, marketing.
const KEY = "msoptics-cookie-consent";
const EVENT = "msoptics:consent-changed";

export const CATEGORIES = ["necessary", "preferences", "analytics", "marketing"];

export function defaultConsent() {
  return { necessary: true, preferences: false, analytics: false, marketing: false, ts: null };
}

export function getConsent() {
  if (typeof window === "undefined") return { ...defaultConsent(), decided: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultConsent(), decided: false };
    const parsed = JSON.parse(raw);
    return { ...defaultConsent(), ...parsed, necessary: true, decided: !!parsed.ts };
  } catch {
    return { ...defaultConsent(), decided: false };
  }
}

export function setConsent(patch) {
  const next = { ...defaultConsent(), ...getConsent(), ...patch, necessary: true, ts: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }
  return next;
}

export function onConsentChange(fn) {
  if (typeof window === "undefined") return () => {};
  const handler = (e) => fn(e.detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

// Re-open the banner from anywhere (e.g. cookie policy page)
export function openCookieSettings() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("msoptics:consent-open"));
  }
}

export function onConsentOpen(fn) {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener("msoptics:consent-open", handler);
  return () => window.removeEventListener("msoptics:consent-open", handler);
}
