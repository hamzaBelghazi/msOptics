import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, EffectCreative } from "swiper/modules";
import "swiper/swiper-bundle.css";
import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="w-full aspect-[21/9] bg-gray-100 animate-pulse"></div>
    );
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full min-h-[50vh] md:aspect-[21/9] overflow-hidden">
      <Swiper
        modules={[Autoplay, Navigation, EffectCreative]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={true}
        effect="creative"
        creativeEffect={{
          prev: {
            translate: [0, 0, -400],
            opacity: 0,
          },
          next: {
            translate: ["100%", 0, 0],
            opacity: 1,
          },
        }}
        speed={1000}
        className="w-full h-full"
      >
        {banners?.map((banner) => (
          <SwiperSlide key={banner.id} className="w-full h-full">
            <Link
              href={banner?.link || "#"}
              className="block w-full h-[50vh] md:h-full"
            >
              <div className="relative w-full h-full">
                {/* Banner Image */}
                <Image
                  src={
                    process.env.NEXT_PUBLIC_SERVER_URL +
                    "/img/banners/" +
                    banner?.slide
                  }
                  alt={banner?.link || "Banner image"}
                  fill
                  style={{ objectFit: "cover" }}
                  className="absolute inset-0"
                  priority
                />

                {/* Overlay */}
                <div className="absolute inset-0 transition-all"></div>

                {/* Banner Content */}
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center text-white">
                  {banner.title && (
                    <h1 className="text-4xl font-bold mb-4">{banner?.title}</h1>
                  )}
                  {banner.subtitle && (
                    <p className="text-xl mb-8">{banner.subtitle}</p>
                  )}
                  {banner?.cta && banner?.ctaLink && (
                    <a
                      href={banner?.ctaLink}
                      className="bg-white text-gray-800 px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all"
                    >
                      {banner?.cta}
                    </a>
                  )}
                </div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Wave Shape SVG */}
      <div className="absolute animate-wave -bottom-10 left-0 w-[150%] z-10">
        <svg
          viewBox="0 0 1440 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-[100px]"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 100L60 90C120 80 240 60 360 50C480 40 600 40 720 60C840 80 960 120 1080 120C1200 120 1320 80 1380 60L1440 40V200H1380C1320 200 1200 200 1080 200C960 200 840 200 720 200C600 200 480 200 360 200C240 200 120 200 60 200H0V100Z"
            className="fill-background"
          />
        </svg>
      </div>
    </div>
  );
}
