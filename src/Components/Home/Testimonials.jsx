import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/swiper-bundle.css";
import { useTranslation } from "react-i18next";
import { Star, Quote } from "lucide-react";
import SectionHeading from "@/Components/ui/SectionHeading";

const testimonials = [
  {
    id: 1,
    name: "Karim El Amrani",
    initials: "KE",
    review: "I found the perfect pair within minutes — and they fit like a dream. Fast delivery and great customer support!",
    rating: 5,
  },
  {
    id: 2,
    name: "Yasmine Lahlou",
    initials: "YL",
    review: "The styles are trendy, prices are fair, and checkout was effortless. Totally recommend MHS Optics!",
    rating: 5,
  },
  {
    id: 3,
    name: "Rachid Jouhari",
    initials: "RJ",
    review: "I was worried about buying online, but the prescription is spot-on and the virtual try-on nailed the fit.",
    rating: 4,
  },
  {
    id: 4,
    name: "Leïla Benkirane",
    initials: "LB",
    review: "Lovely frames, and customer service walked me through the measurement process — so helpful!",
    rating: 5,
  },
];

export default function Testimonials() {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  return (
    <div className="container mx-auto px-4" dir={dir}>
      <SectionHeading
        eyebrow={t("home.testimonials.eyebrow", "Wall of love")}
        title={t("home.testimonials.title")}
      />
      <div className="max-w-2xl mx-auto">
        <Swiper
          key={dir}
          modules={[Autoplay, Pagination]}
          grabCursor
          autoplay={{ delay: 5500 }}
          loop
          pagination={{ clickable: true }}
          className="pb-12"
        >
          {testimonials.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="glass-card p-8 md:p-10 text-center mx-1">
                <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-gold text-white mb-5">
                  <Quote size={22} />
                </span>
                <p className="font-display text-lg md:text-xl italic text-text-primary leading-relaxed">
                  “{item.review}”
                </p>
                <div className="flex justify-center gap-1 mt-5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={15} className={i < item.rating ? "text-gold fill-current" : "text-text-muted/30"} />
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <span className="grid place-items-center w-11 h-11 rounded-full bg-primary/10 text-primary font-extrabold text-sm border border-primary/20">
                    {item.initials}
                  </span>
                  <span className="font-bold text-text-primary">{item.name}</span>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
