/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          background: "rgb(var(--card-background) / <alpha-value>)",
          border: "rgb(var(--card-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          hover: "rgb(var(--primary-hover) / <alpha-value>)",
        },
        text: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted: "rgb(var(--text-muted) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        input: {
          background: "rgb(var(--input-background) / <alpha-value>)",
          border: "rgb(var(--input-border) / <alpha-value>)",
          ring: "rgb(var(--input-ring) / <alpha-value>)",
        },
        button: {
          background: "rgb(var(--button-background) / <alpha-value>)",
          text: "rgb(var(--button-text) / <alpha-value>)",
          hover: "rgb(var(--button-hover) / <alpha-value>)",
        },
      },
      animation: {
        fall: "fall 10s linear infinite", // Default duration for falling
        sway: "sway 5s ease-in-out infinite alternate", // Default duration for swaying
      },
      keyframes: {
        fall: {
          "0%": { transform: "translateY(-10%) rotate(0deg)" },
          "100%": { transform: "translateY(110vh) rotate(360deg)" },
        },
        sway: {
          "0%": { transform: "translateX(-5px)" },
          "100%": { transform: "translateX(5px)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
