const Spinner = () => {
  return (
    <div
      className="flex justify-center items-center h-screen bg-gradient-to-b from-[var(--background)] to-[var(--card-background)] dark:from-[var(--background)] dark:to-[var(--card-background)]"
      role="status"
      aria-label="Loading"
    >
      {/* Stylish animated glasses loader */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="120"
        viewBox="0 0 200 120"
      >
        <defs>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)">
              <animate
                attributeName="stop-color"
                values="var(--primary);#3b82f6;#ef4444;var(--primary)"
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="var(--primary-hover)">
              <animate
                attributeName="stop-color"
                values="var(--primary-hover);#60a5fa;#f87171;var(--primary-hover)"
                dur="6s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
          <radialGradient id="lens" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </radialGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,0.25)" />
          </filter>
        </defs>

        {/* Float animation wrapper */}
        <g filter="url(#shadow)">
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -4; 0 0; 0 4; 0 0"
              dur="4s"
              repeatCount="indefinite"
            />

            {/* Temples */}
            <path d="M15 62 Q30 50 45 54" stroke="url(#glow)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M155 54 Q170 50 185 62" stroke="url(#glow)" strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* Left lens frame */}
            <rect x="30" y="35" rx="16" ry="16" width="60" height="50" fill="none" stroke="url(#glow)" strokeWidth="5">
              <animate attributeName="stroke-dasharray" values="0 220; 220 0" dur="2s" repeatCount="indefinite" />
            </rect>
            {/* Right lens frame */}
            <rect x="110" y="35" rx="16" ry="16" width="60" height="50" fill="none" stroke="url(#glow)" strokeWidth="5">
              <animate attributeName="stroke-dasharray" values="0 220; 220 0" dur="2s" repeatCount="indefinite" />
            </rect>

            {/* Bridge */}
            <path d="M90 58 C95 52 105 52 110 58" stroke="url(#glow)" strokeWidth="5" fill="none" strokeLinecap="round" />

            {/* Lenses */}
            <rect x="33" y="38" rx="14" ry="14" width="54" height="44" fill="url(#lens)" />
            <rect x="113" y="38" rx="14" ry="14" width="54" height="44" fill="url(#lens)" />

            {/* Shine sweep - left */}
            <rect x="33" y="38" width="54" height="44" rx="14" ry="14" fill="none" overflow="visible">
              <rect x="-20" y="38" width="10" height="44" rx="5" ry="5" fill="rgba(255,255,255,0.35)">
                <animate attributeName="x" from="-20" to="90" dur="1.8s" repeatCount="indefinite" />
              </rect>
            </rect>
            {/* Shine sweep - right */}
            <rect x="113" y="38" width="54" height="44" rx="14" ry="14" fill="none" overflow="visible">
              <rect x="60" y="38" width="10" height="44" rx="5" ry="5" fill="rgba(255,255,255,0.35)">
                <animate attributeName="x" from="60" to="170" dur="1.8s" begin="0.2s" repeatCount="indefinite" />
              </rect>
            </rect>

            {/* Blink (eyelids) */}
            <g>
              {/* Left eyelid */}
              <rect x="33" y="38" width="54" height="0" rx="14" ry="14" fill="var(--card-background)">
                <animate attributeName="height" values="0;44;0" dur="4.5s" begin="1s" repeatCount="indefinite" />
              </rect>
              {/* Right eyelid */}
              <rect x="113" y="38" width="54" height="0" rx="14" ry="14" fill="var(--card-background)">
                <animate attributeName="height" values="0;44;0" dur="4.5s" begin="1.3s" repeatCount="indefinite" />
              </rect>
            </g>
          </g>
        </g>
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
