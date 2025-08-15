import React, { useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Parallax } from "swiper/modules";
import SoloSlide from "@/Components/Home/Slide";

function FeaturedProducts({ products }) {
  const swiperRef = useRef(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-center text-text-secondary mb-8 px-4">
        Explore our curated collection of premium optics—stylish eyewear and
        advanced lenses designed to enhance your vision and elevate your look.
      </p>
      <div className="relative">
        <Swiper
          ref={swiperRef}
          modules={[Autoplay, Parallax]}
          spaceBetween={5}
          slidesPerView={1}
          autoplay={{ delay: 7000, disableOnInteraction: false }}
          loop={true}
          pagination={{
            clickable: true,
            el: ".swiper-pagination",
            bulletClass: "swiper-pagination-bullet",
            bulletActiveClass: "swiper-pagination-bullet-active",
          }}
          breakpoints={{
            640: {
              slidesPerView: 3,
            },
            1024: {
              slidesPerView: 4,
            },
          }}
        >
          {products?.map((product) => (
            <SwiperSlide key={product.id}>
              <div className="shadow-lg hover:shadow-xl transition-shadow">
                <SoloSlide item={product} />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        <button
          onClick={() => swiperRef.current.swiper.slidePrev()}
          className=" bg-gray-800 text-white p-3 rounded-full hover:bg-gray-700 transition-all absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
        >
          &larr;
        </button>
        <button
          onClick={() => swiperRef.current.swiper.slideNext()}
          className="bg-gray-800 text-white p-3 rounded-full hover:bg-gray-700 transition-all absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
        >
          &rarr;
        </button>
        <div className="swiper-pagination mt-10  p-2 rounded w-full h-10 flex justify-center items-center"></div>
      </div>

      {/* Custom Pagination Container */}
    </div>
  );
}

export default FeaturedProducts;
