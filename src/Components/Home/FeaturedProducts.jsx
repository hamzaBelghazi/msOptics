import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import SoloSlide from "@/Components/Home/Slide";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SectionHeading from "@/Components/ui/SectionHeading";

function FeaturedProducts({ products }) {
  const swiperRef = useRef(null);
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();

  return (
    <div className="container mx-auto px-4" dir={dir}>
      <SectionHeading
        eyebrow={t("home.featured.eyebrow", "Handpicked")}
        title={t("home.featured_products")}
        subtitle={t("home.featured_products_subtitle")}
        href="/type/sunglasses"
        linkLabel={t("home.view_all", "View all")}
      />
      <div className="relative -mx-2">
        <Swiper
          key={dir}
          ref={swiperRef}
          modules={[Autoplay]}
          spaceBetween={4}
          slidesPerView={1.2}
          autoplay={{ delay: 6000, disableOnInteraction: false }}
          loop={true}
          breakpoints={{ 480: { slidesPerView: 2 }, 768: { slidesPerView: 3 }, 1200: { slidesPerView: 4 } }}
        >
          {products?.map((product) => (
            <SwiperSlide key={product._id || product.id}>
              <SoloSlide item={product} />
            </SwiperSlide>
          ))}
        </Swiper>
        <button
          onClick={() => swiperRef.current?.swiper.slidePrev()}
          aria-label="Previous"
          className="hidden md:grid place-items-center w-11 h-11 rounded-full glass-strong text-text-primary hover:text-primary absolute left-0 top-[38%] z-10 -translate-x-1/2 hover:scale-110 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => swiperRef.current?.swiper.slideNext()}
          aria-label="Next"
          className="hidden md:grid place-items-center w-11 h-11 rounded-full glass-strong text-text-primary hover:text-primary absolute right-0 top-[38%] z-10 translate-x-1/2 hover:scale-110 transition-transform"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

export default FeaturedProducts;
