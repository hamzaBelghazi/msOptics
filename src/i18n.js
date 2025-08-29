import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import I18nextBrowserLanguageDetector from "i18next-browser-languagedetector";
import enTranslations from "./translations/en.json";
import deTranslations from "./translations/de.json";
import arTranslations from "./translations/AR.json";

i18next
  .use(I18nextBrowserLanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      de: {
        translation: deTranslations,
      },
      ar: {
        translation: arTranslations,
      },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "de", "ar"],
    detection: {
      // Prefer cookie so SSR can match client language
      order: ["cookie", "localStorage", "navigator"],
      caches: ["cookie", "localStorage"],
      lookupCookie: "i18next",
      cookieMinutes: 60 * 24 * 365, // 1 year
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18next;
