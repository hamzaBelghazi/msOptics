import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import Layout from "@/Components/Layout/Layout";
import AccessoryCard, {
  AccessoryCardSkeleton,
} from "@/Components/utils/AccessoryCard";
import FloatingCartButton from "@/Components/utils/floatingCart";

export default function Accessories() {
  const { t } = useTranslation();
  const [accessories, setAccessories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  const toArray = useMemo(
    () => (payload) => {
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.data)) return payload.data;
      if (payload && Array.isArray(payload.docs)) return payload.docs;
      if (payload && Array.isArray(payload.items)) return payload.items;
      if (payload && Array.isArray(payload.results)) return payload.results;
      if (payload && typeof payload === "object") {
        for (const key of Object.keys(payload)) {
          const v = payload[key];
          if (Array.isArray(v)) return v;
          if (v && typeof v === "object") {
            const inner = toArray(v);
            if (Array.isArray(inner)) return inner;
          }
        }
      }
      return [];
    },
    []
  );

  // Fetch a page of accessories
  const fetchAccessoriesPage = async (pageNum) => {
    const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/accessories?limit=${limit}&page=${pageNum}`;
    try {
      if (pageNum === 1) setIsLoading(true);
      else setIsLoadingMore(true);
      const response = await axios.get(url);
      const pageItems = toArray(response?.data) || [];
      // Append and compute hasMore
      setAccessories((prev) => (pageNum === 1 ? pageItems : [...prev, ...pageItems]));
      setHasMore(pageItems.length >= limit);
    } catch (error) {
      console.error(error.response?.data?.message || "Error fetching accessories");
      if (pageNum === 1) setError(error.response?.data?.message || "Error fetching accessories");
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAccessoriesPage(1);
  }, []);

  // Observe bottom sentinel to load next page
  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoadingMore) {
          const next = page + 1;
          setPage(next);
          fetchAccessoriesPage(next);
        }
      },
      { root: null, rootMargin: "0px", threshold: 1.0 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [page, hasMore, isLoading, isLoadingMore]);

  // Generate skeleton array
  const skeletonArray = Array(8).fill(null);

  return (
    <Layout title={t("accessories", "Accessories")}>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Banner Section */}
        <section className="container mx-auto pt-8 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="relative">
              <Image
                src="/images/glasses-hand.jpg"
                alt="Accessories Banner"
                width={500}
                height={300}
                className="w-full h-auto rounded-lg object-cover"
                onError={(e) => {
                  e.target.src = "/assets/logo.png";
                }}
              />
            </div>
            <div className="flex items-center justify-center relative">
              <h1 className="text-4xl lg:text-6xl text-gray-800 dark:text-gray-200 font-bold z-10 text-center">
                Accessories
              </h1>
              {/* Animated Circles */}
              <motion.div
                className="absolute w-32 h-32 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{ top: "10%", left: "20%" }}
              />

              <motion.div
                className="absolute w-24 h-24 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{ bottom: "20%", right: "10%" }}
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="text-center mb-8">
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Complete your eyewear experience with our premium collection of
              accessories. From stylish cases to cleaning kits, we have
              everything you need to care for and enhance your glasses.
            </p>
          </div>
        </section>

        {/* Accessories Section */}
        <section className="container mx-auto px-4 pb-8">
          {error ? (
            <div className="text-center py-12">
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-xl text-red-800 dark:text-red-400 mb-2">
                  Error Loading Accessories
                </h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isLoading ? (
                // Show skeleton loading state
                skeletonArray.map((_, index) => (
                  <AccessoryCardSkeleton key={index} />
                ))
              ) : accessories.length > 0 ? (
                // Show actual accessories
                accessories
                  .filter((accessory) => accessory.status === "active")
                  .map((accessory) => (
                    <AccessoryCard key={accessory._id} item={accessory} />
                  ))
              ) : (
                // Show empty state
                <div className="col-span-full text-center py-12">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-700 max-w-md mx-auto">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                    </div>
                    <h3 className="text-2xl text-gray-800 dark:text-gray-200 mb-4 font-bold">
                      No Accessories Found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      We're currently updating our accessories collection.
                      Please check back soon!
                    </p>
                  </div>
                </div>
              )}
              {/* Sentinel row for infinite scroll */}
              {!isLoading && accessories.length > 0 && (
                <div className="col-span-full flex justify-center py-6">
                  {hasMore ? (
                    <div ref={sentinelRef} className="h-8 w-8 rounded-full border-2 border-t-transparent border-primary animate-spin" />
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No more items</span>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
