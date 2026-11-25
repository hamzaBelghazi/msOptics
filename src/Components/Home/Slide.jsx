import React, { useContext } from "react";
import { AuthContext } from "../Context/AuthContext";

import { useRouter } from "next/router";
import { productHref } from "@/Api/links";
import ProductsCard from "../utils/ProductsCard";

export default function SoloSlide({ item }) {
  const navigate = useRouter();

  return (
    <div
      className="mx-2 py-2 relative"
      onClick={() => navigate.push(productHref(item))}
    >
      <ProductsCard item={item} isSlide={true} />
    </div>
  );
}
