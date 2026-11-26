import axios from "axios";
import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { CartContext } from "@/Components/Context/CartContext";
import FaceTryOn from "@/Components/tryon/FaceTryOn";
import ModelSpin from "@/Components/tryon/ModelSpin";
import Layout from "@/Components/Layout/Layout";
import { useTranslation } from "react-i18next";
import {
 GlassesSizeSVG,
 BridgeSizeSVG,
 TempleLengthSVG,
 LensSizeSVG,
} from "@/Components/product/FrameSVGs";
import ProductReviews from "@/Components/product/ProductReviews";
import RelatedProducts from "@/Components/product/RelatedProducts";
import WishlistButton from "@/Components/utils/WishlistButton";
import Tooltip from "@/Components/utils/Tooltip";
import Videocam from "@mui/icons-material/Videocam";
import Star from "@mui/icons-material/Star";
import LocalShipping from "@mui/icons-material/LocalShipping";
import Shield from "@mui/icons-material/Shield";
import Refresh from "@mui/icons-material/Refresh";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Spinner from "@/Components/Spinner/Spinner";
import { useRouter } from "next/router";
import PriceTag from "@/Components/utils/PriceTag";
import { tField } from "@/Components/utils/tField";

export default function ProductDetails({ product: initialProduct, error }) {
 const router = useRouter();

 const { addToCart, isInCart, getCartItem } = useContext(CartContext);
 const [product, setProduct] = useState(initialProduct || null);
 const [selectedImage, setSelectedImage] = useState(
 initialProduct?.images?.[0] || ""
 );
 const [addedToCart, setAddedToCart] = useState(false);

 const [quantity, setQuantity] = useState(1);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [sliderIndex, setSliderIndex] = useState(0);
 const [isTryOnOpen, setIsTryOnOpen] = useState(false);
 const [galleryView, setGalleryView] = useState("photos"); // photos | model
 const has3d = Boolean(initialProduct?.tryOnParts?.model);
 // variations with their own 3D model spin in the same viewer
 const variants = ((product || initialProduct)?.tryOnParts?.variants || []).filter(
 (v) => v && v.model
 );
 const [variantId, setVariantId] = useState("");
 const activeVariant = variants.find((v) => v.id === variantId) || null;
 const [imageLoading, setImageLoading] = useState(true);
 const [activeTab, setActiveTab] = useState("description");
 const [reviewsInfo, setReviewsInfo] = useState(null);
 const [selectedColor, setSelectedColor] = useState("");
 
 const [mockData, setMockData] = useState({
 rating: 0,
 reviewCount: 0,
 soldCount: 0,
 originalPrice: 0,
 discount: 0,
 shipping: "Free shipping",
 returnPolicy: "30-day return",
 warranty: "2-year warranty",
 views: 0,
 });

 useEffect(() => {
 const getReviews = async () => {
 try {
 const response = await axios.get(
 `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reviews/product/${product._id}`
 );
 const { averageRating, totalReviews } = response.data.data.stats;
 setMockData({
 rating: averageRating,
 reviewCount: totalReviews,
 soldCount: product.soldCount || 0,
 originalPrice: product.originalPrice || product.price,
 discount: product.discount || 0,
 shipping: product.shipping || "Free shipping",
 returnPolicy: product.returnPolicy || "30-day return",
 warranty: product.warranty || "2-year warranty",
 views: product.views || 0,
 });
 setReviewsInfo(response.data.data);
 } catch (error) {
 console.error("Error fetching reviews:", error);
 }
 };
 getReviews();
 }, []);

const { t, i18n } = useTranslation();
const dir = i18n.dir();
const pTitle = tField(product, "title", i18n.language);
const pDesc = tField(product, "description", i18n.language);

 const openModal = (index) => {
 setSliderIndex(index);
 setIsModalOpen(true);
 };

 const closeModal = () => {
 setIsModalOpen(false);
 };

 // Helper function to adjust color brightness
 const adjustColorBrightness = (color, amount) => {
 const isHex = color.startsWith("#");

 // Convert color to RGB
 let r, g, b;
 if (isHex) {
 const hex = color.replace("#", "");
 r = parseInt(hex.substr(0, 2), 16);
 g = parseInt(hex.substr(2, 2), 16);
 b = parseInt(hex.substr(4, 2), 16);
 } else {
 // Handle color names by returning a slightly different shade
 return color;
 }

 // Adjust brightness
 r = Math.min(255, Math.max(0, r + amount));
 g = Math.min(255, Math.max(0, g + amount));
 b = Math.min(255, Math.max(0, b + amount));

 // Convert back to hex
 return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
 };

 // Handle color selection
 const handleColorSelect = (color) => {
 setSelectedColor(color);
 };

 useEffect(() => {
 // Set initial selected color
 if (product && Array.isArray(product.colors) && product.colors.length > 0) {
 setSelectedColor(product.colors[0].split(",")[0]);
 }
 }, [product]);

 const toggleTitle = () => {
 const titleElement = document.getElementById("fullTitle");
 const truncatedElement = document.getElementById("truncatedTitle");
 if (titleElement && truncatedElement) {
 titleElement.classList.toggle("hidden");
 truncatedElement.classList.toggle("hidden");
 }
 };

 useEffect(() => {
 if (error || !product) {
 router.push("/404");
 }
 }, [error, product, router]);

 if (error || !product) {
 return <Spinner />;
 }

 return (
 <Layout title={product?.title || t("product")}>
 
 <div className="min-h-screen bg-background relative overflow-hidden" dir={dir}>
 <div className="container mx-auto px-4 py-8">
 {/* Breadcrumb */}
 <nav className="mb-8">
 <ol className="flex items-center space-x-2 text-sm text-text-secondary">
 <li>
 <Link href="/" className="hover:text-primary transition-colors">
 {t("navigation.home")}
 </Link>
 </li>
 <li>/</li>
 <li>
 <Link
 href={`/type/${product?.categories?.name}`}
 className="hover:text-primary transition-colors"
 >
 {product?.categories?.name}
 </Link>
 </li>
 <li>/</li>
 <li className="text-primary font-medium truncate">
 {pTitle}
 </li>
 </ol>
 </nav>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
 {/* Left Column: Image Gallery */}
 <div className="space-y-6">
 {/* Main Image */}
 <div className="relative group">
 {/* Wishlist Button */}
 <div className="absolute top-4 right-4 z-20">
 <WishlistButton productId={product._id} />
 </div>

  {/* Try On Button */}
  {product.shape && product.tryOnParts?.model && (
  <div className="absolute top-4 left-4 z-20">
  <button
  onClick={() => setIsTryOnOpen(true)}
  aria-label="Virtual Try-On"
  className="btn-luxe !p-3.5 !rounded-full"
  >
  <Tooltip text="Virtual Try-On" position="bottom">
  <Videocam className="text-xl" />
  </Tooltip>
  </button>
  </div>
  )}

  {/* 360° toggle: the studio GLB spins in place of the photo strip */}
  {has3d && (
  <div className="absolute bottom-4 right-4 z-30 flex rounded-full bg-black/45 p-1 backdrop-blur-sm">
  <button
  type="button"
  onClick={() => setGalleryView("photos")}
  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
  galleryView === "photos" ? "bg-white text-black" : "text-white/80 hover:text-white"
  }`}
  >
  {t("product.photos", "Photos")}
  </button>
  <button
  type="button"
  onClick={() => setGalleryView("model")}
  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
  galleryView === "model" ? "bg-white text-black" : "text-white/80 hover:text-white"
  }`}
  >
  {t("product.view360", "360°")}
  </button>
  </div>
  )}

  {/* Main Image Container */}
  <div className="bg-card-background rounded-2xl shadow-xl overflow-hidden border border-border">
  {galleryView === "model" && has3d ? (
  <ModelSpin
  model={activeVariant?.model || product?.tryOnParts?.model || initialProduct?.tryOnParts?.model}
  variants={variants}
  variantId={variantId}
  onVariantChange={setVariantId}
  />
  ) : (
  <Swiper
 key={dir}
 modules={[Navigation, Pagination, Autoplay]}
 navigation
 pagination={{ clickable: true }}
 className="w-full h-96 lg:h-[500px]"
 spaceBetween={20}
 loop={product.images && product.images.length > 1}
 autoplay={{
 delay: 5000,
 disableOnInteraction: false,
 }}
 >
 {product.images && product.images.length > 0 ? (
 product.images.map((img, idx) => (
 <SwiperSlide key={idx}>
 <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-background-soft to-background">
 <Image
 src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${img}`}
 alt={`${pTitle || "Product preview"} - Image ${idx + 1}`}
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
 <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-background-soft to-background">
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
  )}
  </div>
  </div>

 {/* Thumbnail Gallery */}
 {product.images && product.images.length > 1 && (
 <div className="grid grid-cols-5 gap-3">
 {product.images.map((image, index) => (
 <div
 key={index}
 className={`relative aspect-square flex justify-center items-center cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 ${
 selectedImage === image
 ? "border-primary shadow-lg"
 : "border-border hover:border-primary/50"
 }`}
 onClick={() => {
 setSelectedImage(image);
 setGalleryView("photos");
 openModal(index);
 }}
 >
 <Image
 src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${image}`}
 alt={`${pTitle} thumbnail ${index + 1}`}
 width={100}
 height={100}
 className="w-full h-20 object-contain"
 />
 </div>
 ))}
 </div>
 )}
 </div>

 {/* Right Column: Product Details */}
 <div className="space-y-6">
 {/* Product Header */}
 <div className="bg-card-background rounded-2xl p-6 shadow-xl border border-border">
 {/* Title and Rating */}
 <div className="mb-4">
 <div className="relative">
 <h1
 className={`text-xl lg:text-4xl font-bold text-text-primary mb-3 ${
 pTitle.split(" ").length > 5
 ? "hidden lg:block"
 : ""
 }`}
 >
 {pTitle}
 </h1>
 <h1
 id="truncatedTitle"
 className={`text-xl lg:text-4xl font-bold text-text-primary mb-3 lg:hidden ${
 pTitle.split(" ").length <= 5 ? "hidden" : ""
 }`}
 >
 {pTitle.split(" ").slice(0, 5).join(" ")}...
 <button
 onClick={toggleTitle}
 className="text-sm text-primary ml-2 hover:underline"
 >
 ⮛
 </button>
 </h1>
 <h1
 id="fullTitle"
 className="hidden text-xl lg:text-4xl font-bold text-text-primary mb-3 lg:hidden"
 >
 {pTitle}
 <button
 onClick={toggleTitle}
 className="text-sm text-primary ml-2 hover:underline"
 >
 ⮙
 </button>
 </h1>
 <div id="truncatedTitle"></div>
 </div>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-1">
 {[...Array(5)].map((_, i) => (
 <Star
 key={i}
 className={`w-5 h-5 ${
 i < Math.floor(mockData.rating)
 ? "text-gold fill-current"
 : "text-text-muted/40"
 }`}
 />
 ))}
 <span className="ml-2 text-sm text-text-secondary">
 {mockData.rating} (
 {mockData.reviewCount.toLocaleString()} {t("product.reviews")})
 </span>
 </div>
 </div>

 
 </div>

 {/* Price Section */}
 <div className="mb-6">
 <div className="flex items-center gap-4 mb-2">
 <span className="text-3xl lg:text-4xl font-bold text-red-500">
 <PriceTag amount={product?.price} />
 </span>
 <span className="text-xl text-text-muted line-through">
 <PriceTag amount={mockData.originalPrice} />
 </span>
 <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
 -{mockData.discount}%
 </span>
 </div>
 <div className="flex items-center gap-4 text-sm text-text-secondary">
 <span>🔥 {mockData.soldCount.toLocaleString()} {t("product.sold")}</span>
 <span>👁️ {mockData.views.toLocaleString()} {t("product.views")}</span>
 </div>
 </div>

 {/* Quantity and Actions */}
 <div className="space-y-4">
 {/* Quantity Selector */}
 <div className="flex items-center gap-4">
 <span className="text-text-primary font-medium">
 {t("product.page.quantity")}:
 </span>
 <div className="flex items-center glass rounded-full overflow-hidden">
 <button
 className="px-4 py-2 text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
 onClick={() => setQuantity((q) => (q > 1 ? q - 1 : 1))}
 >
 -
 </button>
 <span className="px-6 py-2 bg-card-background text-text-primary font-medium">
 {quantity}
 </span>
 <button
 className="px-4 py-2 text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
 onClick={() => setQuantity((q) => q + 1)}
 >
 +
 </button>
 </div>
 </div>

 

 {/* Color Swatch */}
 {product.colors.length > 0 && (
 <div className="space-y-3">
 <span className="text-text-primary font-medium block">
 {t("product.colors_label")}:
 </span>
 <div className="flex flex-wrap gap-3">
 {Array.isArray(product?.colors) &&
 product.colors[0].split(",").map((color, index) => (
 <button
 key={index}
 className={`group relative w-6 h-6 rounded-full p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
 style={{
 background: `linear-gradient(45deg, ${color}, ${adjustColorBrightness(color, 20)})`,
 }}
 onClick={() => handleColorSelect(color)}
 >
 <span className="sr-only">{color}</span>
 <span
 className={`absolute inset-0 rounded-full border-2 transition-opacity ${
 selectedColor === color
 ? "border-primary opacity-100"
 : "border-white/50 opacity-0 group-hover:opacity-100"
 }`}
 ></span>
 {selectedColor === color && (
 <span className="absolute inset-0 flex items-center justify-center">
 <svg
 className="w-4 h-4 text-white drop-shadow-md"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 strokeWidth={2}
 d="M5 13l4 4L19 7"
 />
 </svg>
 </span>
 )}
 </button>
 ))}
 </div>
 </div> )}
 
 
 {/* Action Buttons */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <button
 className={`relative btn-luxe w-full !py-4 !text-base ${
 isInCart(product?._id) ? "brightness-95" : ""
 }`}
 onClick={() => {
 const customizations = {
 color: selectedColor,
 };
 

 addToCart(
 {
 ...product,
 type: "product",
 },
 quantity,
 customizations
 );

 // Show success feedback
 setAddedToCart(true);
 setTimeout(() => setAddedToCart(false), 2000);
 }}
 disabled={addedToCart}
 >
 {addedToCart ? (
 <span className="flex items-center justify-center">
 ✓ {t("product.page.added_to_cart")}
 </span>
 ) : isInCart(product?._id) ? (
 <span className="flex items-center justify-center">
 🛒 {t("product.page.in_cart")} ({getCartItem(product?._id)?.quantity || 0}
 )
 </span>
 ) : (
 <span className="flex items-center justify-center">
 🛒 {t("product.page.add_to_cart")}
 </span>
 )}

 {/* Success Animation */}
 {addedToCart && (
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-full h-full absolute">
 <div className="animate-ping absolute inset-0 bg-white opacity-75 rounded-xl"></div>
 </div>
 </div>
 )}
 </button>
 {/* Prescription (if lenses available) */}
 
 {!product?.lenses || product?.lenses?.length === 0 ? (
 ""
 ) : (
 <Link
 href={`/product/customize/${product?.slug || product?._id}`}
 className="btn-glass w-full !py-4 !text-base text-center"
 >
 🎨 {t("product.page.customize_lens")}
 </Link>
 )}
 </div>
 </div>
 </div>

 {/* Features & Benefits */}
 <div className="bg-card-background rounded-2xl p-6 shadow-xl border border-border">
 <h3 className="text-xl font-bold text-text-primary mb-4">
 {t("product.page.features_benefits")}
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="flex items-center gap-3">
 <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
 <LocalShipping className="text-green-600 dark:text-green-400" />
 </div>
 <div>
 <p className="font-medium text-text-primary">
 {mockData.shipping}
 </p>
 <p className="text-sm text-text-secondary">
 {t("product.page.free_worldwide_shipping")}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
 <Shield className="text-blue-600 dark:text-blue-400" />
 </div>
 <div>
 <p className="font-medium text-text-primary">
 {mockData.warranty}
 </p>
 <p className="text-sm text-text-secondary">
 {t("product.page.quality_guarantee")}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
 <Refresh className="text-purple-600 dark:text-purple-400" />
 </div>
 <div>
 <p className="font-medium text-text-primary">
 {mockData.returnPolicy}
 </p>
 <p className="text-sm text-text-secondary">
 {t("product.page.easy_returns")}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
 <TrendingUp className="text-orange-600 dark:text-orange-400" />
 </div>
 <div>
 <p className="font-medium text-text-primary">
 {t("product.page.trending")}
 </p>
 <p className="text-sm text-text-secondary">
 {t("product.page.popular_choice")}
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Product Details Tabs */}
 <div className="mt-8 sm:mt-12">
 <div className="bg-card-background rounded-xl sm:rounded-2xl shadow-xl border border-border overflow-hidden">
 {/* Tab Navigation */}
 <div className="flex flex-col sm:flex-row border-b border-border">
 {[
 { id: "description", label: t("product.page.description"), icon: "📝" },
 { id: "specifications", label: t("product.page.specifications"), icon: "📋" },
 { id: "reviews", label: t("product.reviews"), icon: "⭐" },
 ].map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={`flex-1 py-3 sm:py-4 px-3 sm:px-6 text-center font-medium transition-colors text-xs sm:text-sm md:text-base ${
 activeTab === tab.id
 ? "text-primary border-b-2 sm:border-b-2 border-primary bg-primary/5"
 : "text-text-secondary hover:text-primary"
 }`}
 >
 <span className="mr-1 sm:mr-2 text-sm sm:text-base">
 {tab.icon}
 </span>
 <span className="inline">{tab.label}</span>
 
 </button>
 ))}
 </div>

 {/* Tab Content */}
 <div className="p-1 md:p-6">
 {activeTab === "description" && (
 <div className="prose prose-sm sm:prose-base md:prose-lg max-w-none dark:prose-invert">
 <div
 dangerouslySetInnerHTML={{
 __html: pDesc || "",
 }}
 />
 </div>
 )}

 {activeTab === "specifications" && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
 {/* General Details */}
 <div>
 <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary mb-3 sm:mb-4">
 {t("product.page.specifications")}
 </h3>
 <div className="space-y-2 sm:space-y-3">
 <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border">
 <span className="font-medium text-text-primary text-xs sm:text-sm md:text-base">
 {t("product.gender")}
 </span>
 <span className="text-text-primary text-xs sm:text-sm md:text-base">
 {product.productGender}
 </span>
 </div>
 <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border">
 <span className="font-medium text-text-primary text-xs sm:text-sm md:text-base">
 {t("product.shape")}
 </span>
 <span className="text-text-primary text-xs sm:text-sm md:text-base">
 {product.shape}
 </span>
 </div>
 <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border">
 <span className="font-medium text-text-primary text-xs sm:text-sm md:text-base">
 {t("product.page.frame_color")}
 </span>
 <span className="text-text-primary text-xs sm:text-sm md:text-base">
 {product.colors}
 </span>
 </div>
 <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-border">
 <span className="font-medium text-text-primary text-xs sm:text-sm md:text-base">
 {t("product.page.temple_color")}
 </span>
 <span className="text-text-primary text-xs sm:text-sm md:text-base">
 {product.templeColor}
 </span>
 </div>
 <div className="flex flex-col sm:flex-row sm:justify-between py-2">
 <span className="font-medium text-text-primary text-xs sm:text-sm md:text-base">
 {t("product.page.frame_material")}
 </span>
 <span className="text-text-primary text-xs sm:text-sm md:text-base">
 {product.frameMatirial}
 </span>
 </div>
 </div>
 </div>

 {/* Dimensions */}
 <div>
 <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-text-primary mb-3 sm:mb-4">
 {t("product.page.dimensions")}
 </h3>
 <div className="space-y-3 sm:space-y-4">
 <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-background rounded-lg">
 <GlassesSizeSVG className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
 <div>
 <p className="text-xs sm:text-sm text-text-secondary">
 {t("product.glasses_width")}
 </p>
 <p className="font-bold text-text-primary text-xs sm:text-sm md:text-base">
 {product.glassWidth}mm
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-background rounded-lg">
 <BridgeSizeSVG className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
 <div>
 <p className="text-xs sm:text-sm text-text-secondary">
 {t("product.page.bridge_size")}
 </p>
 <p className="font-bold text-text-primary text-xs sm:text-sm md:text-base">
 {product.noasSize}mm
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-background rounded-lg">
 <TempleLengthSVG className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
 <div>
 <p className="text-xs sm:text-sm text-text-secondary">
 {t("product.page.temple_length")}
 </p>
 <p className="font-bold text-text-primary text-xs sm:text-sm md:text-base">
 {product.sideSize}mm
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-background rounded-lg">
 <LensSizeSVG className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
 <div>
 <p className="text-xs sm:text-sm text-text-secondary">
 {t("product.page.lens_height")}
 </p>
 <p className="font-bold text-text-primary text-xs sm:text-sm md:text-base">
 {product.lenseHeight}mm
 </p>
 </div>
 </div>
 <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 bg-background rounded-lg">
 <LensSizeSVG className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
 <div>
 <p className="text-xs sm:text-sm text-text-secondary">
 {t("product.page.lens_width")}
 </p>
 <p className="font-bold text-text-primary text-xs sm:text-sm md:text-base">
 {product.lenseSize}mm
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}

 {activeTab === "reviews" && (
 <ProductReviews
 reviewsData={reviewsInfo}
 productId={product._id}
 />
 )}
 </div>
 </div>
 </div>

 {/* Related Products */}
 <div className="mt-12">
 <RelatedProducts
 currentProductId={product._id}
 currentProductCategory={product?.categories?._id}
 currProductShape={product?.shape}
 reviewsData={reviewsInfo}
 />
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
 {/* Header with Product Info */}
 <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-gradient-to-r from-background-soft to-background">
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
 <Tooltip
 text={pTitle}
 position="bottom"
 className="overflow-hidden text-wrap"
 >
 <h3 className="truncate max-w-[200px] md:max-w-fit md:text-wrap mt-3 text-lg sm:text-xl font-bold text-text-primary">
 {pTitle}
 </h3>
 </Tooltip>
 <p className="text-sm text-text-secondary">
 Product Gallery
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
 <div className="relative w-full h-[50vh] sm:h-[450px] flex items-center justify-center bg-gradient-to-br from-background-soft to-background">
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
 // Update active thumbnail
 const activeIndex = swiper.realIndex;
 setSliderIndex(activeIndex);
 }}
 >
 {product.images &&
 product.images.map((image, idx) => (
 <SwiperSlide key={idx}>
 <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8">
 <Image
 src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${image}`}
 alt={`${pTitle || "Product image"} - Full view ${idx + 1}`}
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
 {product.images && product.images.length > 1 && (
 <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 border-t border-border">
 <div className="flex items-center justify-between mb-3">
 <h4 className="text-sm sm:text-base font-semibold text-text-primary">
 Select Image
 </h4>
 <span className="text-xs text-gray-500 dark:text-gray-400">
 {sliderIndex + 1} of {product.images.length}
 </span>
 </div>

 <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
 {product.images.map((image, index) => (
 <button
 key={index}
 onClick={() => {
 // Update swiper to this slide
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
 src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${image}`}
 alt={`${pTitle} thumbnail ${index + 1}`}
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

  {/* Try On Modal */}
  {isTryOnOpen && product.shape && product.tryOnParts?.model && (
    <FaceTryOn product={product} onClose={() => setIsTryOnOpen(false)} />
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
 `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/${id}`
 );
 const product = response.data.data.data;

 // Canonical URL: an /product/<objectid> link lands here once and is sent to
 // the slug for good, so shared links, analytics and search results settle on
 // one address.
 if (product?.slug && id !== product.slug) {
 const query = { ...context.query };
 delete query.id;
 return {
 redirect: {
 destination: `/product/${product.slug}${toQueryString(query)}`,
 permanent: true,
 },
 };
 }

 return {
 props: {
 product,
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

function toQueryString(query) {
 const qs = new URLSearchParams();
 for (const [k, v] of Object.entries(query || {})) {
 if (v == null) continue;
 qs.set(k, Array.isArray(v) ? v.join(",") : String(v));
 }
 const s = qs.toString();
 return s ? `?${s}` : "";
}
