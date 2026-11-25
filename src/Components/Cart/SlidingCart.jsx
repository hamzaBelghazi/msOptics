"use client";
import Link from "next/link";
import Image from "next/image";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import PriceTag from "../utils/PriceTag";

const getImagePath = (item) => {
  const imageName = Array.isArray(item.image) ? item.image[0] : item.image;
  switch (item.type) {
    case "product":
      return `products/${imageName}`;
    case "accessory":
      return `accessories/${imageName}`;
    case "lens":
      return `lenses/lenses.webp`;
    default:
      return `products/${imageName}`;
  }
};

export default function SlidingCart({
  isOpen,
  onClose,
  cart,
  itemCount,
  total,
  updateQuantity,
  removeFromCart,
  t,
}) {
  return (
    <div
      className={`fixed inset-y-0 right-0 w-[92vw] max-w-md glass-strong border-l border-white/20 shadow-2xl z-50 flex flex-col rounded-l-[1.8rem] overflow-hidden transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {/* header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
        <h2 className="font-display font-semibold text-xl text-text-primary flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
            <ShoppingBag size={18} />
          </span>
          {t("cart.title")}
          <span className="text-sm font-sans font-bold text-text-muted">({itemCount})</span>
        </h2>
        <button
          onClick={onClose}
          aria-label="Close cart"
          className="grid place-items-center w-9 h-9 rounded-full bg-background text-text-secondary hover:text-primary hover:rotate-90 transition-all duration-300"
        >
          <X size={18} />
        </button>
      </div>

      {/* items */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {cart.length > 0 ? (
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.id + JSON.stringify(item.customizations)}
                className="rounded-2xl border border-border/70 bg-card-background/70 p-3.5 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3.5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-background-soft shrink-0 border border-border/60">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${getImagePath(item)}`}
                      alt={item.title}
                      width={80}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-text-primary line-clamp-2 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gold font-bold uppercase tracking-widest mt-0.5">
                      {item.type}
                    </p>
                    {Object.keys(item.customizations || {}).length > 0 && (
                      <p className="mt-1 text-[11px] text-text-muted truncate">
                        {Object.entries(item.customizations).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id, item.customizations)}
                    aria-label="Remove item"
                    className="self-start p-1.5 text-text-muted hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 glass rounded-full px-1 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1), item.customizations)}
                      className="grid place-items-center w-7 h-7 rounded-full hover:bg-primary/10 hover:text-primary text-text-secondary transition-colors"
                      aria-label="Decrease"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-sm font-bold text-text-primary">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.customizations)}
                      className="grid place-items-center w-7 h-7 rounded-full hover:bg-primary/10 hover:text-primary text-text-secondary transition-colors"
                      aria-label="Increase"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="font-extrabold text-text-primary">
                    <PriceTag amount={item.price * item.quantity} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-14">
            <span className="mx-auto grid place-items-center w-16 h-16 rounded-3xl bg-primary/10 text-primary mb-4">
              <ShoppingBag size={26} />
            </span>
            <p className="font-display text-xl text-text-primary">Your bag is empty</p>
            <p className="text-sm text-text-secondary mt-1">{t("cart.empty")}</p>
            <button onClick={onClose} className="btn-luxe mt-6 !py-2.5 text-sm">
              Continue shopping
            </button>
          </div>
        )}
      </div>

      {/* footer */}
      {cart.length > 0 && (
        <div className="px-5 py-5 border-t border-border/60 bg-card-background/60 backdrop-blur-xl">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-text-secondary font-medium">{t("cart.subtotal")}</span>
            <span className="font-display text-2xl font-semibold text-text-primary">
              <PriceTag amount={total} />
            </span>
          </div>
          <p className="text-[11px] text-text-muted mb-4">Shipping & taxes calculated at checkout.</p>
          <Link
            href="/checkout"
            onClick={onClose}
            className="btn-luxe w-full !py-3.5"
          >
            {t("cart.proceed_to_checkout")} <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
