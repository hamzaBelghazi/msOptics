import React, { useState } from "react";
import ProductsCard from "../utils/ProductsCard";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import SectionHeading from "@/Components/ui/SectionHeading";
import Reveal from "@/Components/ui/Reveal";

export default function ProductGrid({ products }) {
  const [visibleProducts, setVisibleProducts] = useState(12);
  const { t } = useTranslation();

  if (!products) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, index) => (
            <ProductsCard key={index} item={null} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <SectionHeading
        eyebrow={t("home.trending.eyebrow", "Most loved")}
        title={t("home.trending.title")}
        subtitle={t("home.trending.subtitle")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
        {products.slice(0, visibleProducts).map((product, i) => (
          <Reveal key={product._id} delay={(i % 4) * 0.07} y={40}>
            <ProductsCard item={product} />
          </Reveal>
        ))}
      </div>
      {products.length > visibleProducts && (
        <div className="flex justify-center mt-10">
          <button onClick={() => setVisibleProducts((v) => v + 8)} className="btn-glass">
            <Plus size={16} />
            {t("home.load_more", "Load more")}
          </button>
        </div>
      )}
    </div>
  );
}
