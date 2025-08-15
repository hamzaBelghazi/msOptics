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

function MyApp({ Component, pageProps }) {
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
export default MyApp;
