import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import Image from "next/image";
import Link from "next/link";
import { CartContext } from "@/Components/Context/CartContext";
import Layout from "@/Components/Layout/Layout";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import PriceTag from "@/Components/utils/PriceTag";

export default function Cart() {
  const { t } = useTranslation();
  const { cart, total, updateQuantity, removeFromCart, clearCart } =
    useContext(CartContext);

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

  if (!cart?.length) {
    return (
      <Layout title={t("cart")}>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
            {t("cart.title")}
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mb-8">
            {t("cart.empty")}
          </p>
          <Link
            href="/products"
            className="inline-block bg-primary text-button-text px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-primary-hover transition duration-200 shadow-lg"
          >
            {t("cart.continue_shopping")}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("cart")}>
      <div className="container mx-auto px-2 sm:px-4 py-6 sm:py-10">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* Cart Items */}
          <div className="lg:w-2/3">
            <div className="bg-card-background rounded-xl shadow-lg border border-border p-4 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                  {t("cart.title")}
                </h1>
                <button
                  onClick={clearCart}
                  className="text-xs sm:text-sm font-medium text-primary hover:underline"
                >
                  {t("cart.remove_all")}
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {cart.map((item) => (
                  <div
                    key={`${item.id}-${JSON.stringify(item.customizations || {})}`}
                    className="flex flex-col sm:flex-row items-center sm:items-stretch gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-border bg-background hover:shadow-md transition-all duration-200"
                  >
                    {/* Product Image */}
                    <div className="relative w-full sm:w-24 lg:w-28 h-24 lg:h-28 flex-shrink-0 rounded-lg overflow-hidden border border-border">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${getImagePath(item)}`}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex flex-col flex-grow justify-between w-full">
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-text-primary break-words">
                          {item.title}
                        </h3>
                        <p className="text-primary font-bold text-sm sm:text-base">
                          <PriceTag amount={item.price} />
                        </p>

                        {item.customizations && (
                          <div className="mt-2 text-[11px] sm:text-xs text-text-secondary space-y-1">
                            {Object.entries(item.customizations).map(
                              ([key, val]) => (
                                <p key={key}>
                                  <span className="capitalize font-medium">
                                    {key}:
                                  </span>{" "}
                                  {typeof val === "object"
                                    ? Object.values(val).join(" / ")
                                    : val}
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 sm:flex-col sm:justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-background rounded-full border border-border overflow-hidden shadow-sm">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity - 1,
                              item.customizations
                            )
                          }
                          className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-primary/10 text-primary transition-colors"
                        >
                          <RemoveIcon fontSize="small" />
                        </button>
                        <span className="px-3 text-xs sm:text-sm font-medium text-text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity + 1,
                              item.customizations
                            )
                          }
                          className="px-2 sm:px-3 py-1 sm:py-2 hover:bg-primary/10 text-primary transition-colors"
                        >
                          <AddIcon fontSize="small" />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() =>
                          removeFromCart(item.id, item.customizations)
                        }
                        className="p-1 sm:p-2 text-text-secondary hover:text-red-500 transition-colors"
                        title={t("cart.remove_item")}
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="bg-card-background rounded-xl shadow-lg border border-border p-4 sm:p-6 sticky top-8">
              <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-6">
                {t("cart.order_summary")}
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-6">
                <div className="flex justify-between text-text-secondary text-xs sm:text-sm">
                  <span>{t("cart.subtotal")}</span>
                  <span>
                    <PriceTag amount={total} />
                  </span>
                </div>
                <div className="flex justify-between text-text-secondary text-xs sm:text-sm">
                  <span>{t("cart.shipping")}</span>
                  <span>{t("cart.calculated_at_checkout")}</span>
                </div>
                <div className="border-t border-border pt-4 flex justify-between text-base sm:text-lg font-semibold text-text-primary">
                  <span>{t("cart.total")}</span>
                  <span>
                    <PriceTag amount={total} />
                  </span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full bg-primary text-button-text text-center py-2 sm:py-3 rounded-lg font-semibold hover:bg-primary-hover transition duration-200 shadow-lg text-sm sm:text-base"
              >
                {t("cart.proceed_to_checkout")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
