import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import WishlistButton from "./WishlistButton";
import { Eye } from "lucide-react";
import PriceTag from "./PriceTag";

export function AccessoryCardSkeleton() {
  return (
    <div className="p-2 relative">
      <div className="bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600">
        {/* Skeleton Image */}
        <div className="relative mb-4">
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-lg m-2 animate-pulse" />
        </div>

        {/* Skeleton Text */}
        <div className="space-y-2 px-4 pb-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default function AccessoryCard({ item, isSlide = false }) {
  const navigate = useRouter();

  // If item is null, render skeleton
  if (!item) {
    return <AccessoryCardSkeleton />;
  }

  // Calculate discount percentage (mock data for demo)
  const originalPrice = item?.originalPrice || 0;
  const discountPercentage = item?.discount || 0;

  const soldCount = item?.soldCount || 0;

  const views = item?.views || 0;

  if (isSlide) {
    return (
      <div className="p-2 relative group">
        <div className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
          {/* Accessory Image */}
          <div className="relative mb-4">
            <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-lg overflow-hidden">
              <Image
                src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${item.images[0]}`}
                fill
                className="object-contain transition-transform duration-300"
                alt={item.name}
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
            <div className="absolute flex justify-center items-center top-2 right-2 bg-white/90 dark:bg-gray-800/90 w-8 h-8 rounded-full shadow-lg hover:text-red-500 transition-all duration-300">
              <WishlistButton productId={item._id} />
            </div>
          </div>

          {/* Accessory Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {item.name}
            </h3>

            {/* Short Description */}
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {item.shortDescription}
            </p>

            {/* Price */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-red-500">
                <PriceTag amount={item.price} />
              </span>
              <span className="text-sm text-gray-500 line-through">
                <PriceTag amount={originalPrice} />
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>🔥 {soldCount.toLocaleString()} sold</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {views.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 relative group">
      <div
        className="bg-white dark:bg-gray-700 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
        onClick={() => navigate.push(`/accessories/${item._id}`)}
      >
        {/* Accessory Image */}
        <div className="relative mb-4">
          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-600 dark:to-gray-700 rounded-lg overflow-hidden">
            <Image
              src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${item.images[0]}`}
              fill
              className="object-contain transition-transform duration-300"
              alt={item.name}
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
          <div className="absolute top-2 flex justify-center items-center right-2 bg-white/90 dark:bg-gray-800/90 w-8 h-8 rounded-full shadow-lg hover:text-red-500 transition-all duration-300">
            <WishlistButton productId={item._id} />
          </div>

          {/* Status Badge */}
          <div className="absolute bottom-2 left-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                item.status === "active"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
              }`}
            >
              {item.status === "active" ? "Available" : "Unavailable"}
            </span>
          </div>
        </div>

        {/* Accessory Info */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {item.name}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {item.shortDescription}
          </p>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-red-500">
              <PriceTag amount={item.price} />
            </span>
            <span className="text-sm text-gray-500 line-through">
              <PriceTag amount={originalPrice} />
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>🔥 {soldCount.toLocaleString()} sold</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {views.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
