import { useTranslation } from "react-i18next";
import { useCurrency } from "@/Components/Context/currencyContext";

export default function MarqueeStrip() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const items = [
    t("marquee.shipping", { amount: format(99), defaultValue: "Free shipping over {{amount}}" }),
    t("marquee.warranty", "2-year warranty"),
    t("marquee.tryon", "Virtual try-on"),
    t("marquee.experts", "Prescription experts"),
    t("marquee.returns", "30-day returns"),
    t("marquee.frames", "Designer frames"),
  ];
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden bg-[#171310] dark:bg-black border-y border-gold/25 py-3.5 select-none">
      <div className="marquee-track gap-0">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {row.map((text, i) => (
              <span
                key={`${half}-${i}`}
                className="flex items-center gap-6 px-6 text-[12px] font-bold tracking-[0.28em] uppercase text-[#F3E7CF]/90 whitespace-nowrap"
              >
                {text}
                <span className="text-gold">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
