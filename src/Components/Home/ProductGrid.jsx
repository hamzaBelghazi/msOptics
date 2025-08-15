import React, { useState } from "react";
import ProductsCard from "../utils/ProductsCard";
import ViewMoreCard from "./ViewMoreCard";

export default function ProductGrid({ products }) {
  const [visibleProducts, setVisibleProducts] = useState(12);

  // Generate light rays
  const lightRays = Array.from({ length: 30 }).map((_, index) => (
    <div
      key={index}
      className="light-ray absolute rounded-full bg-yellow-300 opacity-5 animate-shimmer"
      style={{
        left: `${Math.random() * 100}vw`,
        top: `${Math.random() * 100}vh`,
        width: `${Math.random() * 10 + 5}px`,
        height: `${Math.random() * 10 + 5}px`,
        animationDuration: `${Math.random() * 3 + 2}s`,
      }}
    />
  ));

  if (!products) {
    return (
      <div className="container mx-auto md:px-4 py-8 bg-gradient-to-br from-gray-800/30 to-gray-900/20 backdrop-blur-md rounded-md relative overflow-hidden border border-gray-300/20 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
          {[...Array(12)].map((_, index) => (
            <ProductsCard key={index} item={null} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto md:px-4 py-8 bg-gradient-to-br from-gray-800/30 to-gray-900/20 backdrop-blur-md rounded-md relative overflow-hidden border border-gray-300/20 shadow-[0_0_15px_rgba(0,0,0,0.1)]">
      {/* Light ray effect */}
      {lightRays}

      <p className="text-center text-text-secondary mb-8 px-4">
        Discover the hottest picks in optics! From modern frames to cutting-edge
        lenses, these trending products are loved by everyone.
      </p>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6 relative z-10">
        {products.slice(0, visibleProducts).map((product) => (
          <ProductsCard key={product._id} item={product} />
        ))}
      </div>

      {/* Load More Button */}
      {products.length > visibleProducts && (
        <div className="flex justify-center mt-8">
          <ViewMoreCard />
        </div>
      )}
    </div>
  );
}
