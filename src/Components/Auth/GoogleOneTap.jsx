import React, { useEffect, useContext } from "react";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useTranslation } from "react-i18next";

const GoogleOneTap = () => {
  const { login, isLoggedIn } = useContext(AuthContext);
  const { t } = useTranslation();

  useEffect(() => {
    // Don't show One Tap if user is already logged in
    if (isLoggedIn) return;

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log(
        "Google One Tap script loaded",
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      );
      if (window.google && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        // Initialize Google One Tap
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false, // Changed to false to prevent auto-cancel
          use_fedcm_for_prompt: true, // Disable FedCM to avoid AbortError
        });

        // Add a small delay before showing prompt
        setTimeout(() => {
          // Display the One Tap prompt
          window.google.accounts.id.prompt((notification) => {
            console.log("Google One Tap notification:", notification);
            console.log(
              "Notification methods available:",
              Object.getOwnPropertyNames(notification)
            );

            // Check all possible notification states
            console.log("isNotDisplayed:", notification.isNotDisplayed?.());
            console.log("isSkippedMoment:", notification.isSkippedMoment?.());
            console.log(
              "isDismissedMoment:",
              notification.isDismissedMoment?.()
            );
            console.log("getMomentType:", notification.getMomentType?.());

            if (notification.isNotDisplayed && notification.isNotDisplayed()) {
              const reason = notification.getNotDisplayedReason();
              console.log("Google One Tap not displayed:", reason);

              // Handle specific reasons
              if (reason === "browser_not_supported") {
                console.log("Browser not supported for One Tap");
              } else if (reason === "invalid_client") {
                console.log("Invalid Google Client ID");
              } else if (reason === "missing_client_id") {
                console.log("Missing Google Client ID");
              } else if (reason === "opt_out_or_no_session") {
                console.log("User opted out or no session");
              } else if (reason === "secure_http_required") {
                console.log("HTTPS required for One Tap");
              }
            } else if (
              notification.isSkippedMoment &&
              notification.isSkippedMoment()
            ) {
              console.log(
                "Google One Tap skipped:",
                notification.getSkippedReason()
              );
            } else if (
              notification.isDismissedMoment &&
              notification.isDismissedMoment()
            ) {
              console.log(
                "Google One Tap dismissed:",
                notification.getDismissedReason()
              );
            } else {
              console.log("Google One Tap displayed successfully!");
            }
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
    };
  }, [isLoggedIn]);

  const handleCredentialResponse = async (response) => {
    try {
      console.log("Google One Tap credential received");

      // Send the credential to your backend
      const serverUrl =
        process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:4000";
      // Backend mounts auth routes at `/auth` (see server index.js)
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
        console.log("Google One Tap login successful");
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
    }
  };

  // This component doesn't render anything visible
  // The One Tap prompt is handled by Google's script
  return null;
};

export default GoogleOneTap;
