import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, Ruler, ScanFace } from "lucide-react";
import SlideIn from "@/Components/ui/SlideIn";

const POINTS = [
  { icon: ScanFace, key: "craft.p1", fallback: "Face-scan fit finder for your perfect size" },
  { icon: Ruler, key: "craft.p2", fallback: "Hand-finished acetate & titanium frames" },
  { icon: BadgeCheck, key: "craft.p3", fallback: "Glasses checked by certified opticians" },
];

export default function CraftSection() {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto px-4 py-14 md:py-20 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-8 md:gap-14 items-center">
        {/* image slides from left */}
        <SlideIn direction="left" className="relative">
          <div className="relative rounded-[2rem] overflow-hidden border border-white/20 shadow-xl">
            <Image
              src="/images/glasses-hand.jpg"
              alt="Crafted eyewear"
              width={800}
              height={900}
              className="w-full h-[420px] md:h-[540px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 glass rounded-2xl p-4 flex items-center gap-4 animate-floaty-sm">
              <span className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-gold text-white font-display font-bold text-lg shrink-0">
                4.9
              </span>
              <span>
                <span className="block text-sm font-extrabold text-text-primary">
                  {t("craft.badge_title", "Loved by 12,000+ wearers")}
                </span>
                <span className="block text-xs text-text-secondary">
                  {t("craft.badge_sub", "Free fitting help, 7 days a week")}
                </span>
              </span>
            </div>
          </div>
          {/* floating stamp */}
          <div className="absolute -top-5 -right-3 md:-right-5 glass-strong rounded-2xl px-5 py-3 rotate-6 animate-floaty">
            <p className="font-display font-semibold text-lg text-text-primary leading-none">100%</p>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold mt-1">
              {t("craft.stamp", "Hand finished")}
            </p>
          </div>
        </SlideIn>

        {/* copy slides from right */}
        <SlideIn direction="right" delay={0.12}>
          <span className="eyebrow">{t("craft.eyebrow", "The craft")}</span>
          <h2 className="mt-3">
            {t("craft.title_a", "Made to be")} <span className="text-gradient">{t("craft.title_b", "worn daily")}</span>
          </h2>
          <p className="mt-4 text-base md:text-lg leading-relaxed">
            {t("craft.body", "Every MHS frame is cut, polished and assembled by hand, then fitted to your face and prescription by real opticians — not an algorithm alone.")}
          </p>
          <ul className="mt-7 space-y-4">
            {POINTS.map(({ icon: Icon, key, fallback }) => (
              <li key={key} className="flex items-start gap-3.5">
                <span className="grid place-items-center w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <Icon size={19} />
                </span>
                <span className="pt-2 font-medium text-text-primary">{t(key, fallback)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/inside/about" className="btn-luxe">
              {t("craft.cta", "Our story")} <ArrowRight size={16} />
            </Link>
            <Link href="/type/prescription" className="btn-glass">
              {t("craft.cta2", "Shop optical")}
            </Link>
          </div>
        </SlideIn>
      </div>
    </section>
  );
}
