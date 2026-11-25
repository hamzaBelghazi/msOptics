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
 * GSAP scroll-reveal wrapper.
 * Props: y, x, scale, delay, duration, once, className, as
 */
export default function Reveal({
  children,
  y = 36,
  x = 0,
  scale = 1,
  delay = 0,
  duration = 0.9,
  once = true,
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    ensureRegistered();
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y, x, scale },
        {
          opacity: 1,
          y: 0,
          x: 0,
          scale: 1,
          delay,
          duration,
          ease: "power3.out",
          scrollTrigger: once
            ? { trigger: el, start: "top 88%", once: true }
            : { trigger: el, start: "top 88%" },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [y, x, scale, delay, duration, once]);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
