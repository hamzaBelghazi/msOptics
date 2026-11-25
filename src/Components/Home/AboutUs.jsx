import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import Reveal from "@/Components/ui/Reveal";

export default function AboutUs() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4">
      <div className="glass-card overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative min-h-[280px] md:min-h-[380px]">
            <Image src="/about.png" alt="About Us" fill style={{ objectFit: "cover" }} />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
            <div className="absolute bottom-4 left-4 glass rounded-2xl px-4 py-2.5 text-xs font-bold text-text-primary animate-floaty-sm">
              ✦ {t("about_us.badge", "Crafted eyewear since day one")}
            </div>
          </div>
          <Reveal className="p-8 md:p-12 flex flex-col justify-center">
            <span className="eyebrow">{t("about_us.eyebrow", "Our story")}</span>
            <h2 className="mt-3">{t("about_us.title")}</h2>
            <p className="mt-4 leading-relaxed">{t("about_us.description")}</p>
            <Link href="/inside/about" className="btn-luxe mt-7 self-start !py-3">
              {t("about_us.learn_more")} <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
