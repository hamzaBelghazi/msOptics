import { useEffect, useContext, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "@/Components/Layout/Layout";
import { useWishlist } from "@/Components/Hooks/useWishlist";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useTranslation } from "react-i18next";
import Spinner from "@/Components/Spinner/Spinner";
import Image from "next/image";
import Link from "next/link";
import ButtonSpinner from "@/Components/Spinner/ButtonSpinner";
import ProductsCard from "@/Components/utils/ProductsCard";

export default function Wishlist() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoggedIn, authLoading, user, token } = useContext(AuthContext);
  const { wishlist, removeFromWishlist, getWishlist } = useWishlist();
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    console.log(authLoading);
    if (!isLoggedIn) {
      router.push("/login");
    } else {
      getWishlist(user, token).finally(() => setIsLoading(false));
    }
  }, [isLoggedIn, authLoading, router, user, token]);

  const handleRemoveClick = (item) => {
    setItemToRemove(item);
    setShowConfirm(true);
  };

  const confirmRemove = async () => {
    if (itemToRemove) {
      await removeFromWishlist(itemToRemove.product._id);
      setShowConfirm(false);
      setItemToRemove(null);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <ButtonSpinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("wishlist.title")}>
      <section className="min-h-screen p-4 md:p-8">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {t("wishlist.title")}
            </h1>
            <p className="text-text-secondary">{t("wishlist.subtitle")}</p>
          </div>

          {/* Confirmation Modal */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-card-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                <h3 className="text-xl font-semibold text-text-primary mb-4">
                  {t("wishlist.remove_confirm")}
                </h3>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {t("wishlist.no")}
                  </button>
                  <button
                    onClick={confirmRemove}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                  >
                    {t("wishlist.yes")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wishlist Content */}
          {wishlist.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-text-primary mb-2">
                {t("wishlist.empty_title")}
              </h3>
              <p className="text-text-secondary mb-6">
                {t("wishlist.empty_subtitle")}
              </p>
              <Link
                href="/type/prescription"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-button-text bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {t("wishlist.browse_products")}
              </Link>
            </motion.div>
          ) : (
            <div className="grid xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {wishlist?.map((item) => {
                const product = item.product;
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-card-background rounded-2xl shadow-lg border border-border overflow-hidden transition-transform duration-300 hover:scale-[1.025] hover:shadow-2xl relative"
                  >
                    <ProductsCard item={product} key={product._id} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
