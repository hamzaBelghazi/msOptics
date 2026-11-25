import React, { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination, EffectFade } from "swiper/modules";
import "swiper/swiper-bundle.css";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { ArrowRight, Glasses, Sparkles, Truck } from "lucide-react";

export default function HeroSection() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const rootRef = useRef(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/banners/get-banners`
        );
        const data = await response.json();
        setBanners(data?.data?.data || []);
      } catch (error) {
        console.error("Error fetching banners:", error);
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // entrance choreography
  useEffect(() => {
    if (loading || !banners.length || !rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-kicker",
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
      );
      gsap.fromTo(
        ".hero-line",
        { opacity: 0, y: 70 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power4.out", delay: 0.1 }
      );
      gsap.fromTo(
        ".hero-cta",
        { opacity: 0, y: 24, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.7, stagger: 0.1, ease: "back.out(1.6)", delay: 0.55 }
      );
      gsap.fromTo(
        ".hero-chip",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power3.out", delay: 0.8 }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [loading, banners.length]);

  if (loading) {
    return (
      <div className="relative w-full h-[86vh] min-h-[560px] overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-background-soft via-background to-background-soft">
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/10 via-transparent to-gold/10" />
      </div>
    );
  }

  if (!banners || banners.length === 0) return null;

  return (
    <div ref={rootRef} className="relative w-full h-[88vh] min-h-[580px] max-h-[920px] overflow-hidden rounded-b-[2rem] md:rounded-b-[3rem]" dir={dir}>
      <Swiper
        key={dir}
        modules={[Autoplay, Navigation, Pagination, EffectFade]}
        slidesPerView={1}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        loop={banners.length > 1}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={1100}
        pagination={{ clickable: true }}
        onSlideChange={(s) => setActive(s.realIndex)}
        className="w-full h-full !rounded-none"
      >
        {banners?.map((banner, i) => (
          <SwiperSlide key={banner.id || i} className="w-full h-full">
            <div className="relative w-full h-full">
              <Image
                src={process.env.NEXT_PUBLIC_SERVER_URL + "/img/banners/" + banner?.slide}
                alt={banner?.link || "Banner image"}
                fill
                style={{ objectFit: "cover" }}
                className="absolute inset-0 scale-105"
                priority={i === 0}
              />
              {/* cinematic grade */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent" />

              {/* content */}
              <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-5 md:px-10">
                  <div className="max-w-2xl">
                    <span className="hero-kicker eyebrow !text-gold-soft">
                      <Sparkles size={13} /> {t("home.hero.eyebrow", "The Eyewear Maison")}
                    </span>
                    {banner.title ? (
                      <h1 className="hero-line text-white mt-4 drop-shadow-xl">{banner.title}</h1>
                    ) : (
                      <>
                        <p className="hero-line font-display text-white/90 text-xl md:text-2xl mt-4 italic">
                          {t("home.hero.line1", "See the world,")}
                        </p>
                        <h1 className="hero-line text-white">
                          {t("home.hero.line2", "beautifully in focus.")}
                        </h1>
                      </>
                    )}
                    {banner.subtitle && (
                      <p className="hero-line text-white/80 text-base md:text-lg mt-4 max-w-xl">
                        {banner.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-8">
                      <Link href={banner?.link || "/type/sunglasses"} className="hero-cta btn-luxe">
                        {banner?.cta || t("home.hero.shop", "Shop the collection")}
                        <ArrowRight size={17} />
                      </Link>
                      <Link href="/type/prescription" className="hero-cta btn-glass !text-white !border-white/30 !bg-white/10">
                        <Glasses size={17} />
                        {t("home.hero.tryon", "Shop optical")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* floating glass chips */}
      <div className="absolute bottom-24 right-4 md:right-10 z-10 hidden sm:flex flex-col gap-3">
        <div className="hero-chip glass rounded-2xl px-4 py-3 flex items-center gap-3 animate-floaty">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary/15 text-primary">
            <Truck size={18} />
          </span>
          <span>
            <span className="block text-xs font-bold text-white">Free shipping</span>
            <span className="block text-[11px] text-white/70">30-day returns</span>
          </span>
        </div>
        <div className="hero-chip glass rounded-2xl px-4 py-3 flex items-center gap-3 animate-floaty-sm">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gold/20 text-gold-soft font-display font-bold">
            2y
          </span>
          <span>
            <span className="block text-xs font-bold text-white">2-year warranty</span>
            <span className="block text-[11px] text-white/70">On every frame</span>
          </span>
        </div>
      </div>

      {/* slide counter */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-5 md:left-10 z-10 glass rounded-full px-4 py-1.5 text-xs font-bold text-white tracking-[0.2em]">
          {String(active + 1).padStart(2, "0")} / {String(banners.length).padStart(2, "0")}
        </div>
      )}

      {/* wave divider */}
      <div className="absolute -bottom-2 left-0 w-full z-[5]">
        <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className="w-full h-[70px] md:h-[100px] block">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 60L60 52C120 44 240 30 360 26C480 22 600 28 720 42C840 56 960 78 1080 80C1200 82 1320 62 1380 52L1440 42V110H0V60Z"
            className="fill-background"
          />
        </svg>
      </div>
    </div>
  );
}
