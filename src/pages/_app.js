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
import { useEffect, useRef } from "react";
import App from "next/app";
import { useRouter } from "next/router";
import { CurrencyProvider } from "@/Components/Context/currencyContext";

// Global scroll restoration per route using sessionStorage
function ScrollRestoration() {
  const router = useRouter();
  const lastPathRef = useRef("");
  const DEBUG = false; // set to false to silence logs
  const log = (...args) => DEBUG && console.debug("[ScrollRestore]", ...args);
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!router?.isReady) return;

    const save = (path) => {
      try {
        const scroller = document.scrollingElement || document.documentElement || document.body;
        const y = Math.max((scroller && scroller.scrollTop) || window.scrollY || 0, 0);
        sessionStorage.setItem(`scroll:${path}`, String(y));
        log("save", { path, y });
      } catch {}
    };

    const restore = (path) => {
      try {
        const raw = sessionStorage.getItem(`scroll:${path}`);
        if (!raw) return;
        const y = parseInt(raw, 10);
        if (isNaN(y)) return;
        // Retry a few times until content height is enough
        let tries = 0;
        const maxTries = 60; // up to ~6s
        const tick = () => {
          tries += 1;
          const scroller = document.scrollingElement || document.documentElement || document.body;
          const docH = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
          );
          if (docH >= y || tries >= maxTries) {
            log("restore:scrollTo", { path, y, docH, tries });
            if (scroller) scroller.scrollTop = y; else window.scrollTo(0, y);
          } else {
            if (tries % 5 === 0) log("restore:waiting", { path, y, docH, tries });
            setTimeout(tick, 100);
          }
        };
        // next tick to let layout settle
        log("restore:start", { path, y });
        setTimeout(tick, 0);
      } catch {}
    };

    // Prevent browser's automatic scroll restoration from fighting ours
    try {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
        log("history.scrollRestoration = manual");
      }
    } catch {}

    // Save current before navigating away
    const onRouteChangeStart = () => {
      // Save using the SOURCE path, not the destination
      const source = lastPathRef.current || router.asPath;
      log("routeChangeStart", { source, destHint: router.asPath });
      save(source);
      isNavigatingRef.current = true;
    };
    router.events.on("routeChangeStart", onRouteChangeStart);

    // Throttled scroll listener to keep position fresh
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!isNavigatingRef.current) {
          const path = lastPathRef.current || router.asPath;
          save(path);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Restore after navigation completes as well
    const onRouteChangeComplete = (url) => {
      log("routeChangeComplete", url);
      // Update lastPath to the new, current URL
      lastPathRef.current = url;
      restore(url);
      isNavigatingRef.current = false;
    };
    router.events.on("routeChangeComplete", onRouteChangeComplete);

    // Save on tab close/refresh
    const onBeforeUnload = () => {
      if (!isNavigatingRef.current) save(lastPathRef.current || router.asPath);
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    // Save when tab visibility changes
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !isNavigatingRef.current) {
        save(lastPathRef.current || router.asPath);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Explicitly handle back/forward navigation
    const onPopState = () => {
      const path = location.pathname + location.search + location.hash;
      // Defer to allow Next to render the page
      log("popstate", path);
      setTimeout(() => restore(path), 0);
    };
    window.addEventListener("popstate", onPopState);

    // On mount (and when asPath changes), try restoring current route
    lastPathRef.current = router.asPath;
    log("mount", router.asPath);
    restore(router.asPath);

    return () => {
      router.events.off("routeChangeStart", onRouteChangeStart);
      window.removeEventListener("scroll", onScroll);
      router.events.off("routeChangeComplete", onRouteChangeComplete);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("popstate", onPopState);
      // Save on unmount too
      if (lastPathRef.current && !isNavigatingRef.current) save(lastPathRef.current);
      log("unmount", lastPathRef.current);
    };
  }, [router?.isReady, router?.asPath]);

  return null;
}

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
                    <ScrollRestoration />
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
