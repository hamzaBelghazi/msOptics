import { useRouter } from "next/navigation";
import React from "react";

export default function ViewMoreCard({ subCategory }) {
  const navigate = useRouter();

  return (
    <div
      style={{ minWidth: 250 }}
      className="border rounded view-more-card p-0 m-0"
      onClick={() => navigate.push(`/t/prescription`)}
    >
      <span className="">View More</span>
    </div>
  );
}
