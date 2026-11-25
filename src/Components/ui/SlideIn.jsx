import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
function ensureRegistered() {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
}

/**
 * Directional slide-in on scroll.
 * direction: "left" | "right" | "up" | "none" (fade/zoom only)
 */
export default function SlideIn({
  children,
  direction = "up",
  distance = 90,
  delay = 0,
  duration = 1,
  scale = 1,
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    ensureRegistered();
    const el = ref.current;
    if (!el) return;
    const from =
      direction === "left"
        ? { opacity: 0, x: -distance }
        : direction === "right"
        ? { opacity: 0, x: distance }
        : direction === "up"
        ? { opacity: 0, y: distance }
        : { opacity: 0, scale };
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        from,
        {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          delay,
          duration,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [direction, distance, delay, duration, scale]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
