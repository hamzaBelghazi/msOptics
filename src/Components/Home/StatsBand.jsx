import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Store, Star, Glasses, Award } from "lucide-react";

const STATS = [
  { icon: Store, value: 12, suffix: "k+", label: "Happy customers" },
  { icon: Glasses, value: 240, suffix: "+", label: "Frames in collection" },
  { icon: Star, value: 4.9, decimals: 1, suffix: "★", label: "Average rating" },
  { icon: Award, value: 2, suffix: "yr", label: "Warranty included" },
];

export default function StatsBand() {
  const ref = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".stat-cell",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        }
      );
      document.querySelectorAll(".stat-num").forEach((el) => {
        const target = parseFloat(el.dataset.value);
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            el.textContent = obj.v.toFixed(decimals) + (el.dataset.suffix || "");
          },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[#141210] dark:bg-black border-y border-gold/25">
      <div className="aurora w-[400px] h-[200px] left-1/4 -top-24 bg-primary/25 animate-aurora" />
      <div className="aurora w-[300px] h-[200px] right-1/5 -bottom-20 bg-gold/20 animate-aurora" />
      <div className="relative container mx-auto px-4 py-12 md:py-16 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map(({ icon: Icon, value, suffix, decimals, label }) => (
          <div key={label} className="stat-cell text-center">
            <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl border border-gold/30 bg-gold/10 text-gold-soft mb-3">
              <Icon size={21} />
            </span>
            <p
              className="stat-num font-display font-semibold text-4xl md:text-5xl text-white"
              data-value={value}
              data-suffix={suffix}
              data-decimals={decimals || 0}
            >
              0
            </p>
            <p className="mt-1 text-xs font-bold tracking-[0.24em] uppercase text-white/55">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
