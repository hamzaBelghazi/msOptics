import "@/styles/globals.css";
import "@/styles/JeelizVTOWidget.css";

import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/Components/Context/AuthContext";
import { CartProvider } from "@/Components/Context/CartContext";
import { ToastProvider } from "@/Components/Context/ToastContext";
import { I18nextProvider } from "react-i18next";
import i18next from "@/i18n";
import { LoadingProvider } from "@/Components/Context/LoadContext";
import { WishlistProvider } from "@/Components/Context/WishlistContext";
import { CurrencyProvider } from "@/Components/Context/currencyContext";
import { useEffect } from "react";
import App from "next/app";

function MyApp({ Component, pageProps }) {
  // Keep <html> lang and dir in sync with i18n
  useEffect(() => {
    const applyDir = (lng) => {
      if (typeof document === "undefined") return;
      const isRTL = lng === "ar";
      document.documentElement.setAttribute("lang", lng || "en");
      document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
    };
    // initial
    applyDir(i18next.language);
    // on change
    const handler = (lng) => applyDir(lng);
    i18next.on("languageChanged", handler);
    return () => {
      i18next.off("languageChanged", handler);
    };
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <LoadingProvider>
        <WishlistProvider>
          <AuthProvider>
            <I18nextProvider i18n={i18next}>
              <ToastProvider>
                <CartProvider>
                  <CurrencyProvider>
                    <Component {...pageProps} />
                  </CurrencyProvider>
                </CartProvider>
              </ToastProvider>
            </I18nextProvider>
          </AuthProvider>
        </WishlistProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}

// Ensure SSR renders the same language as client by reading the i18next cookie
MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  const req = appContext?.ctx?.req;
  if (req && req.headers && req.headers.cookie) {
    const cookieHeader = req.headers.cookie;
    // Minimal cookie parser
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const idx = c.indexOf("=");
        const key = decodeURIComponent(c.slice(0, idx).trim());
        const val = decodeURIComponent(c.slice(idx + 1).trim());
        return [key, val];
      })
    );
    const lng = cookies["i18next"] || cookies["i18nextLng"];
    if (lng && i18next.language !== lng) {
      try {
        await i18next.changeLanguage(lng);
      } catch {}
    }
  }
  return { ...appProps };
};
export default MyApp;
