import React, { useState, useRef, useEffect } from "react";

export default function Tooltip({
  children,
  text,
  position = "top",
  className = "",
}) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);
  const triggerRef = useRef(null);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  useEffect(() => {
    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;

    if (trigger) {
      trigger.addEventListener("mouseenter", handleMouseEnter);
      trigger.addEventListener("mouseleave", handleMouseLeave);
    }

    if (tooltip) {
      tooltip.addEventListener("mouseenter", handleMouseEnter);
      tooltip.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (trigger) {
        trigger.removeEventListener("mouseenter", handleMouseEnter);
        trigger.removeEventListener("mouseleave", handleMouseLeave);
      }
      if (tooltip) {
        tooltip.removeEventListener("mouseenter", handleMouseEnter);
        tooltip.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div className={`relative inline-block`}>
      <div ref={triggerRef}>{children}</div>
      <div
        ref={tooltipRef}
        className={`absolute ${positionClasses[position]} ${
          isVisible ? "opacity-100 visible" : "opacity-0 invisible"
        } transition-all duration-200 ease-in-out z-50`}
      >
        <div
          className={`bg-card-background/90 backdrop-blur-sm text-text-primary text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap transform scale-95 group-hover:scale-100 transition-transform duration-200 ${className || ""}`}
        >
          {text}
        </div>
        {/* Tooltip arrow */}
        <div
          className={`absolute w-2 h-2 bg-card-background/90 backdrop-blur-sm transform rotate-45 ${
            position === "top"
              ? "bottom-[-4px] left-1/2 -translate-x-1/2"
              : position === "bottom"
                ? "top-[-4px] left-1/2 -translate-x-1/2"
                : position === "left"
                  ? "right-[-4px] top-1/2 -translate-y-1/2"
                  : "left-[-4px] top-1/2 -translate-y-1/2"
          }`}
        />
      </div>
    </div>
  );
}
