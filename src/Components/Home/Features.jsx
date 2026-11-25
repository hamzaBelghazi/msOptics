"use client";

import { HeadsetMic, Security, Build, ViewInAr } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import SectionHeading from "@/Components/ui/SectionHeading";
import Reveal from "@/Components/ui/Reveal";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    { icon: <HeadsetMic className="w-7 h-7" />, title: t("features.items.quality.title"), description: t("features.items.quality.description") },
    { icon: <Security className="w-7 h-7" />, title: t("features.items.service.title"), description: t("features.items.service.description") },
    { icon: <Build className="w-7 h-7" />, title: t("features.items.warranty.title"), description: t("features.items.warranty.description") },
    { icon: <ViewInAr className="w-7 h-7" />, title: t("features.items.shipping.title"), description: t("features.items.shipping.description") },
  ];

  return (
    <section className="relative py-14 md:py-20 overflow-hidden">
      <div className="aurora w-[420px] h-[420px] -left-40 top-0 bg-primary/15 animate-aurora" />
      <div className="aurora w-[380px] h-[380px] -right-32 bottom-0 bg-gold/15 animate-aurora" />
      <div className="container mx-auto px-4 relative">
        <SectionHeading
          eyebrow={t("features.eyebrow", "Why MHS Optics")}
          title={t("features.title")}
          subtitle={t("home.features.title")}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <Reveal key={index} delay={index * 0.1}>
              <div className="glass-card p-6 h-full group hover:-translate-y-1.5 transition-transform duration-300">
                <div className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-md mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">{feature.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
                <span className="block mt-4 h-0.5 w-10 rounded-full bg-gradient-to-r from-primary to-gold group-hover:w-full transition-all duration-500" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
