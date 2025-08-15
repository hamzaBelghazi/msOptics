import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Check if a product is in wishlist
  const isInWishlist = (productId) => {
    return wishlist.some((item) => {
      if (typeof item.product === "string") {
        return item.product === productId;
      }
      if (item.product && item.product._id) {
        return item.product._id === productId;
      }
      if (item.product && item.product.id) {
        return item.product.id === productId;
      }
      return false;
    });
  };

  // Get wishlist count
  const getWishlistCount = () => {
    return wishlist.length;
  };

  const addToWishlist = async (productId, userData, token) => {
    try {
      if (!userData || !token) {
        return {
          success: false,
          message: "Please login to add items to wishlist",
        };
      }

      // Check if already in wishlist
      if (isInWishlist(productId)) {
        return {
          success: false,
          message: "Product is already in your wishlist",
        };
      }

      setIsAdding(true);
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/favourite`,
        { product: productId, user: userData.id },
        config
      );

      if (response.data.status === "success") {
        setWishlist((prev) => [...prev, { product: productId }]);
        return { success: true, message: "Product added to wishlist" };
      }
      return { success: false, message: "Failed to add to wishlist" };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Error adding to wishlist";
      return { success: false, message: errorMessage };
    } finally {
      setIsAdding(false);
    }
  };

  const removeFromWishlist = async (productId, userData, token) => {
    try {
      if (!userData || !token) {
        return {
          success: false,
          message: "Please login to remove items from wishlist",
        };
      }

      setIsRemoving(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/favourite/deleteFa/${productId}/${userData.id}`,
        config
      );
      console.log(config);
      if (response.status === 204) {
        setWishlist((prev) =>
          prev.filter((item) => item.product !== productId)
        );
        return { success: true, message: "Product removed from wishlist" };
      }
      return { success: false, message: "Failed to remove from wishlist" };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Error removing from wishlist";
      return { success: false, message: errorMessage };
    } finally {
      setIsRemoving(false);
    }
  };

  const clearWishlist = async (userData, token) => {
    try {
      if (!userData || !token) {
        return { success: false, message: "Please login to clear wishlist" };
      }

      setIsLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      // Delete all items in wishlist
      await Promise.all(
        wishlist.map((item) =>
          axios.delete(
            `${process.env.NEXT_PUBLIC_SERVER_URL}/api/favourite/deleteFa/${item.product}/${userData.id}`,
            config
          )
        )
      );

      setWishlist([]);
      return { success: true, message: "Wishlist cleared successfully" };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Error clearing wishlist";
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const getWishlist = async (userData, token) => {
    try {
      if (!userData || !token) {
        return;
      }

      setIsLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      // First get the wishlist items
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/favourite/${userData?.id}`,
        config
      );

      if (response.data.status === "success") {
        const wishlistItems = response.data.data.favourit;
        // Fetch complete product information for each item
        const wishlistWithProducts = await Promise.all(
          wishlistItems.map(async (item) => {
            try {
              const productResponse = await axios.get(
                `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/${item.product}`,
                config
              );

              return {
                ...item,
                product: productResponse.data.data.data,
              };
            } catch (error) {
              console.error(`Error fetching product ${item.product}:`, error);
              return item;
            }
          })
        );

        setWishlist(wishlistWithProducts);
      }
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      setWishlist([]); // Clear wishlist on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isLoading,
        isAdding,
        isRemoving,
        isInWishlist,
        getWishlistCount,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        getWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistContext;
