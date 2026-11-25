import { useId } from "react";

/**
 * MHS Optics — theme-adaptive logo.
 * The mark is an inline SVG whose gradient + strokes follow the site theme
 * via CSS variables (--logo-a/b/c), so it adapts instantly with the theme toggle.
 *
 * Props:
 *  - size: mark size in px (default 40)
 *  - wordmark: show "MHS Optics" text lockup (default true)
 *  - compact: hide the "MAISON · EYEWEAR" subline
 *  - className
 */
export function LogoMark({ size = 40, className = "" }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const grad = `mhs-logo-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="MHS Optics logo"
      className={className}
    >
      <defs>
        <linearGradient id={grad} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-a)" />
          <stop offset="0.55" stopColor="var(--logo-b)" />
          <stop offset="1" stopColor="var(--logo-c)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${grad})`} />
      <rect x="2" y="2" width="44" height="44" rx="14" fill="white" opacity="0.06" />
      {/* glasses: two lenses + bridge + temples */}
      <g stroke="var(--logo-ink)" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <rect x="9" y="18" width="12" height="10" rx="4.5" />
        <rect x="27" y="18" width="12" height="10" rx="4.5" />
        <path d="M21 21.5c1.5-2.2 4.5-2.2 6 0" />
        <path d="M9 21 4.5 19M39 21l4.5-2" />
      </g>
      {/* gold glint on right lens */}
      <path
        d="M30 20.5l3.5 5M33.5 20.5l1.8 2.6"
        stroke="var(--logo-glint)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ size = 40, wordmark = true, compact = false, tone = "auto", className = "" }) {
  const light = tone === "light";
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0 drop-shadow-md" />
      {wordmark && (
        <span className="leading-none">
          <span
            className={`block font-display font-semibold tracking-tight ${light ? "text-white" : "text-text-primary"}`}
            style={{ fontSize: size * 0.52 }}
          >
            MHS Optics
          </span>
          {!compact && (
            <span className="block font-bold uppercase text-gold" style={{ fontSize: 10, letterSpacing: "0.32em" }}>
              Maison · Eyewear
            </span>
          )}
        </span>
      )}
    </span>
  );
}
