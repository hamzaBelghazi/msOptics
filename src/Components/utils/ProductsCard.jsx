import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { Videocam } from "@mui/icons-material";
import { Star, Eye, Flame, ArrowUpRight } from "lucide-react";
import axios from "axios";
import WishlistButton from "./WishlistButton";
import Tooltip from "./Tooltip";
import PriceTag from "./PriceTag";
import { useTranslation } from "react-i18next";
import { tField } from "./tField";
import { productHref } from "@/Api/links";

export function ProductsCardSkeleton() {
  return (
    <div className="p-2 h-[430px]">
      <div className="glass-card h-full p-4 flex flex-col">
        <div className="h-52 rounded-2xl bg-gradient-to-br from-primary/10 to-gold/10 animate-pulse" />
        <div className="flex-1 py-4 space-y-3">
          <div className="h-4 w-3/4 rounded bg-text-muted/20 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-text-muted/20 animate-pulse" />
          <div className="h-6 w-1/3 rounded-full bg-text-muted/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Stars({ rating, count }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < Math.floor(rating) ? "text-gold fill-current" : "text-text-muted/40"
          }`}
        />
      ))}
      <span className="text-[11px] text-text-muted ml-1 font-medium">
        ({Number(count || 0).toLocaleString()})
      </span>
    </div>
  );
}

export default function ProductsCard({ item, isSlide = false, reviewsData: reviews = {} }) {
  const navigate = useRouter();
  const { i18n } = useTranslation();
  const [reviewsData, setReviewsData] = useState(reviews || {});
  const [isHovered, setIsHovered] = useState(false);
  const tiltRef = useRef(null);

  useEffect(() => {
    const getReviews = async () => {
      if (!item?._id) return;
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reviews/product/${item._id}`
        );
        const stats = response.data?.data?.stats || { averageRating: 0, totalReviews: 0 };
        // spread the payload first: it can carry stats:null and wipe the default
        setReviewsData((prev) => ({ ...prev, ...response.data.data, stats }));
      } catch {
        setReviewsData((prev) => ({ ...prev, stats: { averageRating: 0, totalReviews: 0 } }));
      }
    };
    if (!reviewsData?.stats && item?._id) getReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?._id]);

  // subtle 3D tilt
  const onMove = (e) => {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    setIsHovered(false);
    if (tiltRef.current) tiltRef.current.style.transform = "";
  };

  const title = tField(item, "title", i18n.language);

  if (!item) return <ProductsCardSkeleton />;

  const discountPercentage = item.discount;
  const rating = reviewsData?.stats?.averageRating || 0;
  const reviewCount = reviewsData?.stats?.totalReviews || 0;
  const img =
    item.images?.length
      ? `${process.env.NEXT_PUBLIC_SERVER_URL}/img/products/${item.images[isHovered && item.images.length > 1 ? 1 : 0]}`
      : "";

  return (
    <div className="p-2 h-[430px] group">
      <div
        ref={tiltRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={() => setIsHovered(true)}
        onClick={() => navigate.push(productHref(item))}
        className="glass-card h-full p-4 flex flex-col cursor-pointer transition-shadow duration-300 hover:shadow-lg will-change-transform"
        style={{ transition: "transform .18s ease-out, box-shadow .3s ease" }}
      >
        {/* image */}
        <div className="relative h-52 rounded-2xl overflow-hidden bg-gradient-to-br from-background-soft via-card-elevated to-background-soft">
          {img && (
            <Image
              src={img}
              fill
              className="object-contain p-3 transition-transform duration-500 group-hover:scale-110"
              alt={title}
            />
          )}
          {/* badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {discountPercentage > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white bg-gradient-to-r from-rose-600 to-orange-500 shadow">
                -{discountPercentage}%
              </span>
            )}
            {item.shape && (
              <Tooltip text="Try On" position="top">
                <span className="glass grid place-items-center w-8 h-8 rounded-full">
                  <Videocam className="w-4 h-4" />
                </span>
              </Tooltip>
            )}
          </div>
          <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
            <span className="glass grid place-items-center w-9 h-9 rounded-full hover:scale-110 transition-transform">
              <WishlistButton productId={item._id} />
            </span>
          </div>
          {/* hover quick view */}
          <div
            className={`absolute inset-x-3 bottom-3 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
          >
            <span className="glass-strong rounded-full py-2 px-4 text-xs font-bold text-text-primary flex items-center justify-center gap-1.5">
              Quick view <ArrowUpRight size={14} />
            </span>
          </div>
        </div>

        {/* info */}
        <div className="flex-1 flex flex-col justify-between pt-3.5">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold">
              {item.glassesType || item.productGender || "Eyewear"}
            </p>
            <h3 className="font-semibold text-text-primary text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
            <Stars rating={rating} count={reviewCount} />
          </div>
          <div className="pt-2 border-t border-border/60 mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-text-primary">
                  <PriceTag amount={item.price} />
                </span>
                {item.originalPrice > 0 && (
                  <span className="text-xs text-text-muted line-through">
                    <PriceTag amount={item.originalPrice} />
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                  item.inStock
                    ? "bg-primary/10 text-primary"
                    : "bg-rose-500/10 text-rose-500"
                }`}
              >
                {item.inStock ? "In stock" : "Sold out"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-text-muted mt-1.5 font-medium">
              <span className="flex items-center gap-1">
                <Flame size={12} className="text-orange-500" />
                {Number(item.soldCount || 0).toLocaleString()} sold
              </span>
              <span className="flex items-center gap-1">
                <Eye size={12} />
                {Number(item.views || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
