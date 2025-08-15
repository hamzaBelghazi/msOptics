import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Videocam } from "@mui/icons-material";
import { Star, Eye } from "lucide-react";
import axios from "axios";
import WishlistButton from "./WishlistButton";
import Tooltip from "./Tooltip";
import PriceTag from "./PriceTag";

export function ProductsCardSkeleton() {
  return (
    <div className="p-2 relative h-[420px]">
      <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 h-full flex flex-col p-4">
        {/* Skeleton Image */}
        <div className="relative mb-4 h-48">
          <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-lg animate-pulse" />
        </div>

        {/* Skeleton Text */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-1/2" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-1/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-2/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsCard({
  item,
  isSlide = false,
  reviewsData: reviews = {},
}) {
  const navigate = useRouter();
  const [reviewsData, setReviewsData] = useState(reviews);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const getReviews = async () => {
      if (!item?._id) {
        return;
      }

      try {
        
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reviews/product/${item._id}`
        );

        const stats = response.data?.data?.stats || {
          averageRating: 0,
          totalReviews: 0,
        };
        setReviewsData((prevData) => ({
          ...prevData,
          stats: stats,
          ...response.data.data,
        }));
      } catch (error) {
        setReviewsData((prevData) => ({
          ...prevData,
          stats: { averageRating: 0, totalReviews: 0 },
        }));
      }
    };

    if (!reviewsData?.stats && item?._id) {
    
      getReviews();
    }
  }, [item?._id]);

  if (!item) {
    return <ProductsCardSkeleton />;
  }

  const discountPercentage = item.discount;
  const rating = reviewsData.stats?.averageRating || 0;
  const reviewCount = reviewsData.stats?.totalReviews || 0;

  if (isSlide) {
    return (
      <div className="p-2 relative group cursor-pointer h-[420px]">
        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col">
          {/* Product Image */}
          <div className="relative mb-4 h-48">
            <div
              className="aspect-square bg-gradient-to-br w-full from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-lg overflow-hidden h-full"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <Image
                src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${item.images[isHovered && item.images.length > 1 ? 1 : 0]}`}
                fill
                className="object-contain transition-all duration-300"
                alt={item.title}
              />
            </div>

            {/* Discount Badge */}
            {discountPercentage > 0 && (
              <div className="absolute top-2 left-2">
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  -{discountPercentage}%
                </span>
              </div>
            )}

            {/* Wishlist Button */}
            <div className="absolute top-2 right-2 flex justify-center items-center bg-white/90 dark:bg-gray-800/90 w-8 h-8 rounded-full shadow-lg hover:text-red-500 transition-all duration-300">
              <WishlistButton productId={item._id} />
            </div>
          </div>

          {/* Product Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {item.title}
              </h3>

              {/* Rating */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.floor(rating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
                <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                  ({reviewCount.toLocaleString()})
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-red-500">
                  <PriceTag amount={item.price} />
                </span>
                {item.originalPrice > 0 && (
                  <span className="text-sm text-gray-500 line-through">
                    <PriceTag amount={item.originalPrice} />
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>🔥 {item.soldCount.toLocaleString()} sold</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {item.views.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 relative group h-[420px]">
      <div
        className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col"
        onClick={() => navigate.push(`/product/${item._id}`)}
      >
        {/* Product Image */}
        <div className="relative mb-4 h-48">
          <div
            className="aspect-square w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-lg overflow-hidden h-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Image
              src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${item.images[isHovered && item.images.length > 1 ? 1 : 0]}`}
              fill
              className="object-contain transition-all duration-300"
              alt={item.title}
            />
          </div>

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <div className="absolute bottom-2 left-2">
              <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                -{discountPercentage}%
              </span>
            </div>
          )}

          {/* Wishlist Button */}
          <div className="absolute top-2 right-2 flex justify-center items-center bg-white/90 dark:bg-gray-800/90 w-8 h-8 rounded-full shadow-lg hover:text-red-500 transition-all duration-300">
            <WishlistButton productId={item._id} />
          </div>

          {/* Try-on Video Icon */}
          {item.virualsTrys && item.virualsTrys.length > 0 && (
            <div className="absolute top-2 left-2">
              <Tooltip text="Try On" position="top">
                <div className="bg-white/90 dark:bg-gray-800/90 w-8 h-8 rounded-full shadow-lg flex items-center justify-center hover:text-red-500 transition-all duration-300">
                  <Videocam className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </div>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < Math.floor(rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                ({reviewCount.toLocaleString()})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-red-500">
                <PriceTag amount={item.price} />
              </span>
              {item.originalPrice > 0 && (
                <span className="text-sm text-gray-500 line-through">
                  <PriceTag amount={item.originalPrice} />
                </span>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center justify-center">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  item.inStock
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                }`}
              >
                {item.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>🔥 {item.soldCount.toLocaleString()} sold</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {item.views.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
