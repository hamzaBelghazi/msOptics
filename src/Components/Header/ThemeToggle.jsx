"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  LightMode as SunIcon,
  DarkMode as MoonIcon,
} from "@mui/icons-material";

const ThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // After mounting, we can safely show the UI
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-md text-text-secondary hover:text-primary transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <SunIcon className="text-2xl" />
      ) : (
        <MoonIcon className="text-2xl" />
      )}
    </button>
  );
};

export default ThemeToggle;
