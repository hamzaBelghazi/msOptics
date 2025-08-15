import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../Context/currencyContext";

export default function CurrencyChangeAndTranslation() {
  const { t, i18n } = useTranslation();

  const [language, setLanguage] = useState(i18n.language);

  const { currency, setCurrency } = useCurrency();
  // Update i18next language when the user selects a new language
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang); // Change the active language
  };

  // Currency options
  const currencies = [
    { code: "USD", symbol: "$", nameKey: "currency.usd" },
    { code: "EUR", symbol: "€", nameKey: "currency.eur" },
    { code: "GBP", symbol: "£", nameKey: "currency.gbp" },
  ];

  // Language options
  const languages = [
    { code: "en", nameKey: "language.english" },
    { code: "de", nameKey: "language.german" },
  ];

  return (
    <div className="flex flex-row justify-end items-center gap-2 sm:gap-4 bg-gradient-to-r from-background/80 via-card-background/90 to-background/80 backdrop-blur-sm p-2 sm:p-4 w-full">
      {/* Currency Dropdown */}
      <div className="relative group min-w-[100px] sm:min-w-[120px]">
        <label className="hidden sm:block text-text-primary text-[10px] sm:text-xs uppercase tracking-wider font-medium mb-1">
          {t("navigation.currency")}
        </label>
        <div className="relative">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="appearance-none w-full bg-white/5 backdrop-blur-lg border border-gray-500/30 
                     rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-2 sm:px-4 pr-6 sm:pr-10 
                     text-[11px] sm:text-sm font-medium text-text-primary cursor-pointer
                     shadow-sm transition-all duration-300
                     hover:border-primary/50 hover:bg-white/10
                     focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {currencies.map((curr) => (
              <option
                key={curr.code}
                value={curr.code}
                className="bg-background text-text-primary text-[11px] sm:text-sm py-1 sm:py-2"
              >
                {`${curr.symbol} ${t(curr.nameKey)}`}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-3 text-text-primary/70">
            <svg
              className="fill-current h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Language Dropdown */}
      <div className="relative group min-w-[90px] sm:min-w-[120px]">
        <label className="hidden sm:block text-text-primary text-[10px] sm:text-xs uppercase tracking-wider font-medium mb-1">
          {t("navigation.language")}
        </label>
        <div className="relative">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="appearance-none w-full bg-white/5 backdrop-blur-lg border border-gray-500/30 
                     rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-2 sm:px-4 pr-6 sm:pr-10 
                     text-[11px] sm:text-sm font-medium text-text-primary cursor-pointer
                     shadow-sm transition-all duration-300
                     hover:border-primary/50 hover:bg-white/10
                     focus:outline-none focus:ring-1 sm:focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {languages.map((lang) => (
              <option
                key={lang.code}
                value={lang.code}
                className="bg-background text-text-primary text-[11px] sm:text-sm py-1 sm:py-2"
              >
                {t(lang.nameKey)}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-3 text-text-primary/70">
            <svg
              className="fill-current h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:rotate-180"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
