import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { MoveLeft, MoveRight, Flame } from "lucide-react";
import ProductsCard from "@/Components/utils/ProductsCard";
import SectionHeading from "@/Components/ui/SectionHeading";
import SlideIn from "@/Components/ui/SlideIn";

export default function BestsellersRail({ products }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const trackRef = useRef(null);

  const top = [...(products || [])]
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 8);
  if (!top.length) return null;

  const slide = (mult) => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.8, 640);
    el.scrollBy({ left: (dir === "rtl" ? -mult : mult) * step, behavior: "smooth" });
  };

  return (
    <section className="py-14 md:py-20 relative overflow-hidden">
      <div className="aurora w-[440px] h-[440px] -right-40 top-0 bg-gold/10 animate-aurora" />
      <div className="container mx-auto px-4 relative">
        <div className="flex items-end justify-between gap-4">
          <SectionHeading
            align="left"
            eyebrow={t("home.best.eyebrow", "Flying off the shelves")}
            title={
              <>
                {t("home.best.title_a", "Bestsellers,")} <span className="text-gradient">{t("home.best.title_b", "restocked")}</span>
              </>
            }
          />
          <div className="hidden sm:flex gap-2 mb-10 md:mb-14 shrink-0">
            <button
              onClick={() => slide(-1)}
              aria-label="Slide left"
              className="grid place-items-center w-12 h-12 rounded-full glass text-text-primary hover:text-primary hover:scale-110 transition-all"
            >
              {dir === "rtl" ? <MoveRight size={19} /> : <MoveLeft size={19} />}
            </button>
            <button
              onClick={() => slide(1)}
              aria-label="Slide right"
              className="grid place-items-center w-12 h-12 rounded-full bg-primary text-white shadow-md hover:scale-110 transition-all"
            >
              {dir === "rtl" ? <MoveLeft size={19} /> : <MoveRight size={19} />}
            </button>
          </div>
        </div>
      </div>
      {/* full-bleed rail */}
      <SlideIn direction="right" distance={120}>
        <div
          ref={trackRef}
          dir={dir}
          className="flex gap-1 overflow-x-auto snap-x snap-mandatory px-4 md:px-[max(1rem,calc((100vw-80rem)/2+1rem))] pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex items-center gap-2 px-3 shrink-0 snap-start">
            <span className="grid place-items-center w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow">
              <Flame size={20} />
            </span>
          </div>
          {top.map((p) => (
            <div key={p._id} className="w-[240px] md:w-[270px] shrink-0 snap-start">
              <ProductsCard item={p} isSlide />
            </div>
          ))}
          {/* mobile arrows */}
          <div className="flex sm:hidden items-center gap-2 px-2 shrink-0">
            <button
              onClick={() => slide(-1)}
              aria-label="Slide left"
              className="grid place-items-center w-11 h-11 rounded-full glass text-text-primary"
            >
              {dir === "rtl" ? <MoveRight size={18} /> : <MoveLeft size={18} />}
            </button>
            <button
              onClick={() => slide(1)}
              aria-label="Slide right"
              className="grid place-items-center w-11 h-11 rounded-full bg-primary text-white"
            >
              {dir === "rtl" ? <MoveLeft size={18} /> : <MoveRight size={18} />}
            </button>
          </div>
        </div>
      </SlideIn>
    </section>
  );
}
