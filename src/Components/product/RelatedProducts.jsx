import React, { useEffect, useState } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import ProductsCard from "../utils/ProductsCard";
import { TrendingUp } from "@mui/icons-material";
import { useRouter } from "next/router";

const RelatedProducts = ({
  currentProductId,
  currentProductCategory,
  currProductShape,
  reviewsData,
}) => {
  const { t } = useTranslation();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchRelatedProducts = async () => {
      try {
        let typeParam =
          currentProductCategory === "sunglasses"
            ? "sunglasses"
            : "prescription";
        const relatedProductsRes = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/${typeParam}?shape=${currProductShape}&limit=8`
        );

        const relatedProductsData = relatedProductsRes.data.products;
        // Exclude the current product from the related list
        const filtered = (Array.isArray(relatedProductsData) ? relatedProductsData : [])
          .filter((p) => (p?._id || p?.id) !== currentProductId)
          .slice(0, 8);

        setRelatedProducts(filtered);
      } catch (error) {
        console.error("Error fetching related products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (currentProductId) {
      console.log("Fetching related products for ID:", currentProductId);
      fetchRelatedProducts();
    }
  }, [currentProductId]);

  if (loading) {
    return (
      <div className="mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
              <TrendingUp className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              You Might Also Like
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 dark:bg-gray-700 h-48 rounded-xl mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-lg">
            <TrendingUp className="text-white" />
          </div>
          <h2 className="text-md md:text-2xl font-bold text-gray-900 dark:text-white">
            You Might Also Like
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((product) => (
            <div key={product._id} className="group">
              <ProductsCard item={product} reviewsData={reviewsData} />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push(`/category/${currentProductCategory}`)}
            className="bg-gradient-to-r text-xs md:text-base from-blue-500 to-purple-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            View All Related Products
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelatedProducts;
