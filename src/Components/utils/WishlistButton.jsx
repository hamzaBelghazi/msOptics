import React, { useContext, useEffect } from "react";
import { useWishlist } from "../Hooks/useWishlist";
import { HeartEmptyIcon, HeartFillIcon } from "./icons";
import Tooltip from "./Tooltip";
import { useToast } from "@/Components/Context/ToastContext";
import { AuthContext } from "@/Components/Context/AuthContext";

export default function WishlistButton({ productId, className = "" }) {
  const {
    isInWishlist,
    isAdding,
    isRemoving,
    addToWishlist,
    removeFromWishlist,
    getWishlist,
  } = useWishlist();
  const { addToast } = useToast();
  const { getUserData, token } = useContext(AuthContext);

  // Fetch wishlist data when component mounts or when userData/token changes
  useEffect(() => {
    const userData = getUserData();
    if (userData && token) {
      getWishlist(userData, token);
    }
  }, []);

  const handleWishlistClick = async (e) => {
    e.stopPropagation();
    const userData = getUserData();

    if (isInWishlist(productId)) {
      const result = await removeFromWishlist(productId, userData, token);
      if (result.success) {
        addToast(result.message, "success");
        getWishlist(userData, token);
      } else {
        addToast(result.message, "error");
      }
    } else {
      const result = await addToWishlist(productId, userData, token);
      if (result.success) {
        addToast(result.message, "success");
        getWishlist(userData, token);
      } else if (result.message.includes("already")) {
        addToast(result.message, "info");
      } else {
        addToast(result.message, "error");
      }
    }
  };

  return (
    <Tooltip
      text={
        isInWishlist(productId) ? "Remove from Wishlist" : "Add to Wishlist"
      }
      position="top"
    >
      <button
        onClick={handleWishlistClick}
        disabled={isAdding || isRemoving}
        className={`bg-transparent border-none transition-all duration-300 hover:scale-110 ${
          isAdding || isRemoving ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
        aria-label={
          isInWishlist(productId) ? "Remove from Wishlist" : "Add to Wishlist"
        }
      >
        {isInWishlist(productId) ? (
          <HeartFillIcon className="text-2xl text-primary  animate-heartBeat" />
        ) : (
          <HeartEmptyIcon className="text-2xl text-text-secondary  transition-colors duration-300" />
        )}
      </button>
    </Tooltip>
  );
}
