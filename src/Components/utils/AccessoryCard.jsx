import React from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import WishlistButton from "./WishlistButton";
import { Eye, Flame, ArrowUpRight } from "lucide-react";
import PriceTag from "./PriceTag";
import { useTranslation } from "react-i18next";
import { tField } from "./tField";

export function AccessoryCardSkeleton() {
  return (
    <div className="p-2 h-[380px]">
      <div className="glass-card h-full p-4">
        <div className="h-48 rounded-2xl bg-gradient-to-br from-primary/10 to-gold/10 animate-pulse" />
        <div className="py-4 space-y-3">
          <div className="h-4 w-3/4 rounded bg-text-muted/20 animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-text-muted/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function Body({ item }) {
  // name/short belong to this card, not the wrapper: reading them in the parent
  // and not passing them down left `short` undefined and `name` resolving to
  // window.name, which is what broke the search results grid.
  const { i18n } = useTranslation();
  const name = tField(item, "name", i18n.language);
  const short = tField(item, "shortDescription", i18n.language);
  const originalPrice = item?.originalPrice || 0;
  const discountPercentage = item?.discount || 0;
  return (
    <>
      <div className="relative h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-background-soft via-card-elevated to-background-soft">
        <Image
          src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${item.images[0]}`}
          fill
          className="object-contain p-3 transition-transform duration-500 group-hover:scale-110"
          alt={name}
        />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discountPercentage > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white bg-gradient-to-r from-rose-600 to-orange-500 shadow">
              -{discountPercentage}%
            </span>
          )}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
              item.status === "active" ? "bg-primary/15 text-primary" : "bg-text-muted/15 text-text-muted"
            }`}
          >
            {item.status === "active" ? "Available" : "Unavailable"}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5" onClick={(e) => e.stopPropagation()}>
          <span className="glass grid place-items-center w-9 h-9 rounded-full hover:scale-110 transition-transform">
            <WishlistButton productId={item._id} />
          </span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-between pt-3.5">
        <div className="space-y-1.5">
          <h3 className="font-semibold text-text-primary text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-xs text-text-secondary line-clamp-2">{short}</p>
        </div>
        <div className="pt-2 border-t border-border/60 mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-text-primary">
              <PriceTag amount={item.price} />
            </span>
            {originalPrice > 0 && (
              <span className="text-xs text-text-muted line-through">
                <PriceTag amount={originalPrice} />
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] text-text-muted mt-1.5 font-medium">
            <span className="flex items-center gap-1">
              <Flame size={12} className="text-orange-500" />
              {Number(item?.soldCount || 0).toLocaleString()} sold
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {Number(item?.views || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AccessoryCard({ item, isSlide = false }) {
  const navigate = useRouter();
  if (!item) return <AccessoryCardSkeleton />;

  if (isSlide) {
    return (
      <div className="p-2 relative group h-[380px]">
        <div className="glass-card h-full p-4 flex flex-col">
          <Body item={item} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 relative group h-[380px]">
      <div
        className="glass-card h-full p-4 flex flex-col cursor-pointer hover:shadow-lg transition-shadow duration-300"
        onClick={() => navigate.push(`/accessories/${item._id}`)}
      >
        <Body item={item} />
        <span className="absolute inset-x-6 bottom-5 glass-strong rounded-full py-2 text-xs font-bold text-text-primary flex items-center justify-center gap-1.5 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          Quick view <ArrowUpRight size={14} />
        </span>
      </div>
    </div>
  );
}
