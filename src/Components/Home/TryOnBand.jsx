import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { ArrowRight, Camera, ScanFace, Glasses } from "lucide-react";
import SlideIn from "@/Components/ui/SlideIn";

const STEPS = [
  { icon: Camera, key: "tryon.s1", fallback: "Snap a selfie" },
  { icon: ScanFace, key: "tryon.s2", fallback: "We map your fit" },
  { icon: Glasses, key: "tryon.s3", fallback: "Try frames live in 3D" },
];

export default function TryOnBand() {
  const { t } = useTranslation();
  return (
    <section className="container mx-auto px-4 py-14 md:py-20 overflow-hidden">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#141210] dark:bg-black text-white">
        <div className="aurora w-[420px] h-[420px] -left-28 -bottom-28 bg-primary/30 animate-aurora" />
        <div className="aurora w-[320px] h-[320px] -right-20 -top-24 bg-gold/25 animate-aurora" />
        <div className="relative grid md:grid-cols-2 gap-10 items-center p-8 md:p-14">
          {/* steps slide from left */}
          <SlideIn direction="left">
            <span className="eyebrow !text-gold-soft">{t("tryon.eyebrow", "Virtual fitting room")}</span>
            <h2 className="text-white mt-3">
              {t("tryon.title_a", "Try them on,")} <span className="text-gradient">{t("tryon.title_b", "right from your couch")}</span>
            </h2>
            <p className="text-white/65 mt-4 max-w-md">
              {t("tryon.body", "Point your camera, and see every frame on your face in true 3D — size, fit and style included.")}
            </p>
            <ol className="mt-7 space-y-4">
              {STEPS.map(({ icon: Icon, key, fallback }, i) => (
                <li key={key} className="flex items-center gap-4">
                  <span className="grid place-items-center w-11 h-11 rounded-2xl border border-gold/30 bg-gold/10 text-gold-soft shrink-0">
                    <Icon size={19} />
                  </span>
                  <span className="text-white/90 font-medium">
                    <span className="text-gold-soft font-display mr-2">{String(i + 1).padStart(2, "0")}</span>
                    {t(key, fallback)}
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/type/sunglasses" className="btn-luxe mt-8">
              {t("tryon.cta", "Find frames to try")} <ArrowRight size={16} />
            </Link>
          </SlideIn>

          {/* visual slides from right */}
          <SlideIn direction="right" delay={0.15} className="relative">
            <div className="relative rounded-[1.8rem] overflow-hidden border border-white/15 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-700">
              <Image
                src="/images/insta1.jpg"
                alt="Virtual try-on"
                width={700}
                height={800}
                className="w-full h-[380px] md:h-[480px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              {/* scan frame */}
              <div className="absolute inset-8 md:inset-12 border-2 border-dashed border-gold-soft/80 rounded-[1.5rem] animate-pulse" />
              <div className="absolute top-5 right-5 glass !bg-black/40 !border-white/25 rounded-full px-4 py-2 text-[11px] font-bold tracking-[0.2em] uppercase text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live 3D
              </div>
              <div className="absolute bottom-5 left-5 right-5 glass rounded-2xl p-3.5 flex items-center gap-3">
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-primary text-white shrink-0">
                  <Glasses size={19} />
                </span>
                <span>
                  <span className="block text-xs font-extrabold text-text-primary">Aviator Classic</span>
                  <span className="block text-[11px] text-text-secondary">98% fit match · 52mm</span>
                </span>
              </div>
            </div>
          </SlideIn>
        </div>
      </div>
    </section>
  );
}
