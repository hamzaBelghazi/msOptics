"use client";
import Link from "next/link";
import Image from "next/image";
import { Close as TimesIcon } from "@mui/icons-material";
import PriceTag from "../utils/PriceTag";

// Helper function to get the correct image path based on item type
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
      className={`fixed inset-y-0 right-0 xs:w-xs sm:w-sm md:w-96 bg-card-background shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text-primary">
            {t("cart.title")} ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-primary transition-colors duration-300"
          >
            <TimesIcon className="text-2xl" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {cart.length > 0 ? (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id + JSON.stringify(item.customizations)}
                  className="flex flex-col gap-3 p-4 bg-background rounded-lg shadow-md transition-transform duration-300 hover:scale-[1.02]"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="relative w-20 h-20 rounded-md overflow-hidden bg-card-background">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${getImagePath(item)}`}
                        alt={item.title}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-text-secondary mt-1">
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </p>
                      {Object.keys(item.customizations).length > 0 && (
                        <div className="mt-1 text-xs text-text-secondary">
                          {Object.entries(item.customizations).map(([key, value]) => (
                            <span key={key} className="mr-2">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price and Actions */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            Math.max(0, item.quantity - 1),
                            item.customizations
                          )
                        }
                        className="text-text-secondary hover:text-primary w-8 h-8 flex items-center justify-center rounded-full bg-background border border-border transition-colors"
                      >
                        -
                      </button>
                      <span className="text-text-primary">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity + 1,
                            item.customizations
                          )
                        }
                        className="text-text-secondary hover:text-primary w-8 h-8 flex items-center justify-center rounded-full bg-background border border-border transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-text-primary">
                        <PriceTag amount={item.price * item.quantity} />
                      </span>
                      <button
                        onClick={() => removeFromCart(item.id, item.customizations)}
                        className="text-text-secondary hover:text-red-500 transition-colors"
                      >
                        <TimesIcon className="text-xl" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">{t("cart.empty")}</p>
            </div>
          )}
        </div>

        {/* Footer with Total and Checkout */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-border">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-medium">
                  {t("cart.subtotal")}
                </span>
                <span className="text-lg font-bold text-text-primary">
                  <PriceTag amount={total} />
                </span>
              </div>
              <Link
                href="/checkout"
                className="block w-full bg-primary text-button-text py-3 rounded-md text-center font-medium hover:bg-primary-hover hover:text-button-text transition-colors duration-300"
              >
                {t("cart.proceed_to_checkout")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
