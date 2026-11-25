"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  resetAdminLoading,
  startAdminLoading,
  stopAdminLoading,
  subscribeAdminLoading,
} from "@/Api/adminLoading";

// Slim gradient progress bar pinned to the top of the admin area.
// It reacts to both route changes and in-flight API calls.
export default function AdminLoadingBar() {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => subscribeAdminLoading(setActive), []);

  // navigations inside the admin
  useEffect(() => {
    const handleStart = () => startAdminLoading();
    const handleDone = () => stopAdminLoading();

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleDone);
    router.events.on("routeChangeError", handleDone);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleDone);
      router.events.off("routeChangeError", handleDone);
      resetAdminLoading();
    };
  }, [router.events]);

  // ease towards 92% while busy, then finish to 100% and fade out
  useEffect(() => {
    if (active) {
      setVisible(true);
      setProgress((value) => (value >= 100 ? 6 : Math.max(value, 6)));
      const timer = setInterval(() => {
        setProgress((value) =>
          value >= 92 ? value : value + Math.max(0.6, (92 - value) * 0.11)
        );
      }, 200);
      return () => clearInterval(timer);
    }

    setProgress((value) => (value > 0 ? 100 : 0));
    const hide = setTimeout(() => setVisible(false), 320);
    const clear = setTimeout(() => setProgress(0), 540);
    return () => {
      clearTimeout(hide);
      clearTimeout(clear);
    };
  }, [active]);

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-hidden={!visible}
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px]"
    >
      <div
        className="relative h-full rounded-r-full transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible || progress > 0 ? 1 : 0,
          background:
            "linear-gradient(90deg, rgb(var(--primary)) 0%, rgb(var(--accent)) 55%, rgb(var(--gold)) 100%)",
          boxShadow: "0 0 10px rgb(var(--primary) / 0.55)",
        }}
      >
        <span
          className="absolute -right-1 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
          style={{
            background: "rgb(var(--gold))",
            boxShadow: "0 0 10px 3px rgb(var(--gold) / 0.55)",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}
