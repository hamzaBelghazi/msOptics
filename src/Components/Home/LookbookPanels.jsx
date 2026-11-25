import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import SlideIn from "@/Components/ui/SlideIn";

const PANELS = [
  {
    href: "/type/sunglasses",
    img: "/images/insta2.jpg",
    eyebrowKey: "lookbook.sun_eyebrow",
    eyebrowFb: "Golden hour",
    titleKey: "lookbook.sun_title",
    titleFb: "Sunglasses",
    subKey: "lookbook.sun_sub",
    subFb: "Polarized lenses, zero glare",
    dir: "left",
  },
  {
    href: "/type/prescription",
    img: "/images/insta3.jpg",
    eyebrowKey: "lookbook.opt_eyebrow",
    eyebrowFb: "Everyday icons",
    titleKey: "lookbook.opt_title",
    titleFb: "Optical",
    subKey: "lookbook.opt_sub",
    subFb: "Featherlight, all-day comfort",
    dir: "right",
  },
];

export default function LookbookPanels() {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto px-4 py-6 overflow-hidden">
      <div className="grid md:grid-cols-2 gap-5">
        {PANELS.map((p) => (
          <SlideIn key={p.href} direction={p.dir}>
            <Link
              href={p.href}
              className="group relative block h-[380px] md:h-[460px] rounded-[2rem] overflow-hidden border border-white/20 shadow-lg"
            >
              <Image
                src={p.img}
                alt={t(p.titleKey, p.titleFb)}
                fill
                style={{ objectFit: "cover" }}
                className="transition-transform duration-[1.2s] ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              {/* sliding shine on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 p-7 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gold-soft">
                    {t(p.eyebrowKey, p.eyebrowFb)}
                  </p>
                  <h3 className="font-display font-semibold text-4xl text-white mt-1.5">
                    {t(p.titleKey, p.titleFb)}
                  </h3>
                  <p className="text-white/70 text-sm mt-1">{t(p.subKey, p.subFb)}</p>
                </div>
                <span className="grid place-items-center w-14 h-14 rounded-full glass !border-white/30 text-white shrink-0 transition-all duration-300 group-hover:bg-primary group-hover:border-primary group-hover:rotate-45">
                  <ArrowUpRight size={22} />
                </span>
              </div>
            </Link>
          </SlideIn>
        ))}
      </div>
    </section>
  );
}
