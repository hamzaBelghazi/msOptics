import axios from "axios";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { CartContext } from "@/Components/Context/CartContext";
import Layout from "@/Components/Layout/Layout";
import { useTranslation } from "react-i18next";
import WishlistButton from "@/Components/utils/WishlistButton";
import LocalShipping from "@mui/icons-material/LocalShipping";
import Shield from "@mui/icons-material/Shield";
import Refresh from "@mui/icons-material/Refresh";
import TrendingUp from "@mui/icons-material/TrendingUp";
import { Eye } from "lucide-react";
import PriceTag from "@/Components/utils/PriceTag";

export default function AccessoryDetails({
  accessory: initialAccessory,
  error,
}) {
  const router = useRouter();
  const { id } = router.query;

  const cart = useContext(CartContext);
  const [accessory, setAccessory] = useState(initialAccessory);
  const [selectedImage, setSelectedImage] = useState(
    initialAccessory?.images?.[0] || ""
  );
  const [quantity, setQuantity] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);

  const mockData = {
    soldCount: accessory?.soldCount || 0,
    originalPrice: accessory?.originalPrice || 0,
    discount: accessory?.discount || 0,
    shipping: accessory?.shipping || "Free shipping",
    returnPolicy: accessory?.returnPolicy || "30-day return",
    warranty: accessory?.warranty || "2-year warranty",
    views: accessory?.views || 0,
  };

  const { t } = useTranslation();

  const openModal = (index) => {
    setSliderIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (error) {
    return (
      <Layout title="Accessory Not Found">
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
              Accessory Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {error.api ||
                error.network ||
                "The accessory you're looking for doesn't exist."}
            </p>
            <Link
              href="/accessories"
              className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-600 hover:to-pink-600 transition-all duration-300"
            >
              Browse Accessories
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!accessory) {
    return (
      <Layout title="Loading...">
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading accessory...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={accessory?.name || t("accessory")}>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8">
            <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/" className="hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href="/accessories"
                  className="hover:text-primary transition-colors"
                >
                  Accessories
                </Link>
              </li>
              <li>/</li>
              <li className="text-primary font-medium">{accessory.name}</li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left Column: Image Gallery */}
            <div className="space-y-6">
              {/* Main Image */}
              <div className="relative group">
                {/* Wishlist Button */}
                <div className="absolute top-4 right-4 z-20">
                  <WishlistButton productId={accessory._id} />
                </div>

                {/* Main Image Container */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <Swiper
                    modules={[Navigation, Pagination, Autoplay]}
                    navigation
                    pagination={{ clickable: true }}
                    className="w-full h-96 lg:h-[500px]"
                    spaceBetween={20}
                    loop={accessory.images && accessory.images.length > 1}
                    autoplay={{
                      delay: 5000,
                      disableOnInteraction: false,
                    }}
                  >
                    {accessory.images && accessory.images.length > 0 ? (
                      accessory.images.map((img, idx) => (
                        <SwiperSlide key={idx}>
                          <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                            <Image
                              src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${img}`}
                              alt={`${accessory.name || "Accessory preview"} - Image ${idx + 1}`}
                              width={500}
                              height={500}
                              className={`object-contain aspect-square h-full w-full transition-transform duration-300 hover:scale-110 cursor-zoom-in ${
                                imageLoading ? "image-loading" : ""
                              }`}
                              priority={idx === 0}
                              onLoad={() => setImageLoading(false)}
                              onError={() => setImageLoading(false)}
                              onClick={() => openModal(idx)}
                            />
                          </div>
                        </SwiperSlide>
                      ))
                    ) : (
                      <SwiperSlide>
                        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                          <Image
                            src="/placeholder.png"
                            alt="No preview"
                            width={400}
                            height={400}
                            className="object-contain max-h-80 opacity-50"
                          />
                        </div>
                      </SwiperSlide>
                    )}
                  </Swiper>
                </div>
              </div>

              {/* Thumbnail Gallery */}
              {accessory.images && accessory.images.length > 1 && (
                <div className="grid grid-cols-5 gap-3">
                  {accessory.images.map((image, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer aspect-square flex justify-center items-center rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                        selectedImage === image
                          ? "border-primary shadow-lg"
                          : "border-gray-200 dark:border-gray-700 hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedImage(image);
                        openModal(index);
                      }}
                    >
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${image}`}
                        alt={`${accessory.name} thumbnail ${index + 1}`}
                        width={100}
                        height={100}
                        className="w-full h-20 object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Accessory Details */}
            <div className="space-y-6">
              {/* Accessory Header */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                {/* Title  */}
                <div className="mb-4">
                  <h1 className="text-xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {accessory.name}
                  </h1>
                </div>

                {/* Short Description */}
                <div className="mb-6">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    {accessory.shortDescription}
                  </p>
                </div>

                {/* Price Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-3xl lg:text-4xl font-bold text-red-500">
                      <PriceTag amount={accessory.price} />
                    </span>
                    <span className="text-xl text-gray-500 line-through">
                      <PriceTag amount={mockData.originalPrice} />
                    </span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{mockData.discount}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>🔥 {mockData.soldCount.toLocaleString()} sold</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {mockData.views.toLocaleString()} views
                    </span>
                  </div>
                </div>

                {/* Quantity and Actions */}
                <div className="space-y-4">
                  {/* Quantity Selector */}
                  <div className="flex items-center gap-4">
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      Quantity:
                    </span>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                      <button
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                        onClick={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
                      >
                        -
                      </button>
                      <span className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium">
                        {quantity}
                      </span>
                      <button
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                        onClick={() => setQuantity((q) => q + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm md:text-base py-4 px-6 rounded-xl font-bold hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      onClick={() =>
                        cart.addToCart(
                          { ...accessory, title: accessory.name },
                          quantity
                        )
                      }
                    >
                      🛒 Add to Cart
                    </button>
                  </div>
                </div>
              </div>

              {/* Features & Benefits */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Features & Benefits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                      <LocalShipping className="text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mockData.shipping}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Free worldwide shipping
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                      <Shield className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mockData.warranty}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Quality guarantee
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                      <Refresh className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {mockData.returnPolicy}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Easy returns
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                      <TrendingUp className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Popular
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customer favorite
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-8 sm:mt-12">
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Description
                </h3>
                <div className="prose prose-lg max-w-none dark:prose-invert">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: accessory.description || "",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-lg"
            onClick={closeModal}
            onKeyDown={(e) => e.key === "Escape" && closeModal()}
            tabIndex={0}
          >
            <div
              className="relative w-full max-w-6xl mx-4 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Accessory Info */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      {accessory.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Accessory Gallery
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="p-2 sm:p-3 rounded-full bg-white/90 hover:bg-red-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl backdrop-blur-sm border border-gray-200 dark:border-gray-600"
                  aria-label="Close"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Main Image Container */}
              <div className="relative w-full h-[50vh] sm:h-[450px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <Swiper
                  modules={[Navigation, Pagination, Autoplay]}
                  navigation={{
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                  }}
                  pagination={{
                    clickable: true,
                    el: ".swiper-pagination",
                    type: "fraction",
                  }}
                  initialSlide={sliderIndex}
                  className="modal-swiper h-full w-full"
                  spaceBetween={0}
                  loop={true}
                  autoplay={{
                    delay: 4000,
                    disableOnInteraction: false,
                  }}
                  onSlideChange={(swiper) => {
                    const activeIndex = swiper.realIndex;
                    setSliderIndex(activeIndex);
                  }}
                >
                  {accessory.images &&
                    accessory.images.map((image, idx) => (
                      <SwiperSlide key={idx}>
                        <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
                          <Image
                            src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${image}`}
                            alt={`${accessory.name || "Accessory image"} - Full view ${idx + 1}`}
                            fill
                            className="object-contain transition-transform duration-300 hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                          />
                        </div>
                      </SwiperSlide>
                    ))}

                  {/* Custom Navigation Buttons */}
                  <div className="swiper-button-prev !text-white !bg-black/20 hover:!bg-black/40 backdrop-blur-sm !w-12 !h-12 !rounded-full transition-all duration-300"></div>
                  <div className="swiper-button-next !text-white !bg-black/20 hover:!bg-black/40 backdrop-blur-sm !w-12 !h-12 !rounded-full transition-all duration-300"></div>

                  {/* Custom Pagination */}
                  <div className="swiper-pagination !bottom-4 !text-white !bg-black/20 !px-3 !py-1 !rounded-full !text-sm !font-medium backdrop-blur-sm"></div>
                </Swiper>
              </div>

              {/* Image Selection Tab */}
              {accessory.images && accessory.images.length > 1 && (
                <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                      Select Image
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {sliderIndex + 1} of {accessory.images.length}
                    </span>
                  </div>

                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                    {accessory.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const swiper =
                            document.querySelector(".modal-swiper")?.swiper;
                          if (swiper) {
                            swiper.slideToLoop(index);
                          }
                          setSliderIndex(index);
                        }}
                        className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
                          sliderIndex === index
                            ? "border-primary shadow-lg ring-2 ring-primary/20"
                            : "border-gray-200 dark:border-gray-600 hover:border-primary/50"
                        }`}
                      >
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${image}`}
                          alt={`${accessory.name} thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {sliderIndex === index && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Server-Side Data Fetching
export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/accessories/${id}`
    );
    return {
      props: {
        accessory: response.data.data,
      },
    };
  } catch (error) {
    const err = {};
    if (error.response?.data?.message) {
      err.api = error.response.data.message;
    } else {
      err.network = error.message;
    }
    return {
      props: {
        error: err,
      },
    };
  }
}
