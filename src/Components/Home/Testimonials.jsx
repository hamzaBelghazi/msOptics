import React from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCards } from "swiper/modules";
import "swiper/swiper-bundle.css";

const testimonials = [
  {
    id: 1,
    name: "Karim El Amrani",
    avatar: "/images/karim-el-amrani.png", // (Use image similar to top-left: smiling man with glasses)
    review:
      "I found the perfect pair within minutes—and they fit like a dream. Fast delivery and great customer support!",
    rating: 5,
  },
  {
    id: 2,
    name: "Yasmine Lahlou",
    avatar: "/images/yasmine-lahlou.png", // (Top-right image—a happy customer modeling frames)
    review:
      "The styles are trendy, prices are fair, and checkout was effortless. Totally recommend Ayweer!",
    rating: 5,
  },
  {
    id: 3,
    name: "Rachid Jouhari",
    avatar: "/images/rachid-jouhari.png", // (Bottom-left: pleased man putting on glasses)
    review:
      "I was worried about buying online, but Ayweer exceeded expectations. The prescription is spot-on.",
    rating: 4,
  },
  {
    id: 4,
    name: "Leïla Benkirane",
    avatar: "/images/leila-benkirane.png", // (Bottom-right: smiling woman in optical setting)
    review:
      "Lovely frames, and customer service walked me through the measurement process—so helpful!",
    rating: 5,
  },
];


// Theme colors for testimonials
const themeColors = [
  "bg-cyan-400",
  "bg-emerald-400",
  "bg-lime-400",
  "bg-amber-400",
  "bg-blue-400",
  "bg-purple-400",
  "bg-teal-400",
  "bg-indigo-400",
];

export default function Testimonials() {
  return (
    <div className="max-w-lg mx-auto px-4">
      <Swiper
        modules={[Autoplay, EffectCards]}
        effect="cards"
        grabCursor={true}
        autoplay={{ delay: 5000 }}
        loop={true}
      >
        {testimonials.map((testimonial, index) => {
          const colorClass = themeColors[index % themeColors.length];
          return (
            <SwiperSlide key={testimonial.id}>
              <div
                className={`p-6 rounded-lg shadow-md text-center ${colorClass}`}
              >
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={80}
                  height={80}
                  className="rounded-full mx-auto"
                />
                <p className="text-white mt-4">{testimonial.review}</p>
                <h4 className="text-xl font-semibold mt-4 text-white">
                  {testimonial.name}
                </h4>
                <div className="flex justify-center mt-2">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">
                      ★
                    </span>
                  ))}
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
