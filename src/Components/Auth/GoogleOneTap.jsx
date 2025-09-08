import React, { useEffect, useContext, useRef, useState } from "react";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useTranslation } from "react-i18next";
import Spinner from "@/Components/Spinner/Spinner";

const GoogleOneTap = () => {
  const { login, isLoggedIn, authLoading } = useContext(AuthContext);
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const promptTimeoutRef = useRef(null);

  useEffect(() => {
    // Wait until auth state is resolved to avoid flashing the prompt
    if (authLoading) return;

    // Don't show One Tap if user is already logged in
    // If GIS is already initialized, proactively cancel and disable auto-select
    if (isLoggedIn) {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.cancel();
          window.google.accounts.id.disableAutoSelect();
        } catch (e) {
          // no-op
        }
      }
      // Clear any scheduled prompt
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (
        typeof window !== "undefined" &&
        window.google &&
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ) {
        // Double-check login state at time of init
        if (isLoggedIn) {
          try {
            window.google.accounts.id.cancel();
            window.google.accounts.id.disableAutoSelect();
          } catch (_) {}
          return;
        }
        // Initialize Google One Tap
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true,
        });

        // Add a small delay before showing prompt
        promptTimeoutRef.current = setTimeout(() => {
          if (isLoggedIn) {
            // If user logged in during delay, skip prompting
            try {
              window.google.accounts.id.cancel();
              window.google.accounts.id.disableAutoSelect();
            } catch (_) {}
            return;
          }
          // Display the One Tap prompt
          window.google.accounts.id.prompt((notification) => {
            // Check all possible notification states
            console.log("isNotDisplayed:", notification.isNotDisplayed?.());
          });
        }, 1000); // 1 second delay
      } else {
        console.log("Google script not loaded or Client ID missing");
      }
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
    };
  }, [isLoggedIn, authLoading]);

  // Secondary guard: if auth status flips to logged-in after init, cancel any prompt immediately
  useEffect(() => {
    if (
      isLoggedIn &&
      typeof window !== "undefined" &&
      window.google?.accounts?.id
    ) {
      try {
        window.google.accounts.id.cancel();
        window.google.accounts.id.disableAutoSelect();
        console.log("Google One Tap canceled due to login state change");
      } catch (_) {}
      if (promptTimeoutRef.current) {
        clearTimeout(promptTimeoutRef.current);
        promptTimeoutRef.current = null;
      }
    }
  }, [isLoggedIn]);

  const handleCredentialResponse = async (response) => {
    try {
      console.log("Google One Tap credential received");

      // Send the credential to your backend
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:4000";
      // Backend mounts auth routes at `/auth` (see server index.js)
      setProcessing(true);
      const result = await fetch(`${serverUrl}/auth/google/onetap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      const data = await result.json();

      if (result.ok && data.token) {
        login(data.user, data.token);
      } else {
        console.error(
          "Google One Tap login failed:",
          data?.message || result.statusText,
          { status: result.status }
        );
      }
    } catch (error) {
      console.error("Google One Tap error:", error);
    } finally {
      // Small grace timeout to avoid flicker if the response is very fast
      setTimeout(() => setProcessing(false), 250);
    }
  };

  // Render a minimal overlay while processing One Tap sign-in (TailwindCSS)
  return (
    <>
      {processing && (
        <div className="fixed inset-0 z-[9999] w-screen h-screen bg-black/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 md:p-7 shadow-2xl min-w-[260px] text-center w-full">
            <div className="flex justify-center mb-3">
              <Spinner />
            </div>
            <div className="text-text-secondary dark:text-neutral-300 text-sm">
              {t("auth.processing_login") || "Signing you in..."}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default GoogleOneTap;
