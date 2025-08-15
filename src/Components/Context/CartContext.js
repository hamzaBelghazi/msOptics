import React, { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Initialize cart from localStorage if available
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });

  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  // Update localStorage whenever cart changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cart));
      // Calculate totals
      calculateTotals();
    }
  }, [cart]);

  const calculateTotals = () => {
    const { totalPrice, totalItems } = cart.reduce(
      (acc, item) => ({
        totalPrice: acc.totalPrice + item.price * item.quantity,
        totalItems: acc.totalItems + item.quantity,
      }),
      { totalPrice: 0, totalItems: 0 }
    );
    setTotal(totalPrice);
    setItemCount(totalItems);
  };

  const addToCart = (item, quantity = 1, customizations = {}) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex(
        (cartItem) =>
          cartItem.id === item._id &&
          cartItem.type === item.type &&
          JSON.stringify(cartItem.customizations) ===
            JSON.stringify(customizations)
      );

      if (existingItemIndex > -1) {
        // Update existing item
        return prevCart.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }

      // Add new item
      const newItem = {
        id: item._id,
        type: getItemType(item), // 'product', 'accessory', or 'lens'
        title: item.title || item.name || item.subtitle,
        price: item.price,
        image: Array.isArray(item.images)
          ? item.images[0]
          : item.photo || item.icon,
        quantity,
        customizations,
        originalItem: item, // Store the original item for reference
      };

      return [...prevCart, newItem];
    });
  };

  const removeFromCart = (itemId, customizations = {}) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !(
            item.id === itemId &&
            JSON.stringify(item.customizations) ===
              JSON.stringify(customizations)
          )
      )
    );
  };

  const updateQuantity = (itemId, quantity, customizations = {}) => {
    if (quantity < 1) {
      removeFromCart(itemId, customizations);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === itemId &&
        JSON.stringify(item.customizations) === JSON.stringify(customizations)
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Helper function to determine item type
  const getItemType = (item) => {
    if (item.glassWidth !== undefined) return "product";
    if (item.shortDescription !== undefined) return "accessory";
    if (item.refraction !== undefined) return "lens";
    return "unknown";
  };

  // Get item count by type
  const getItemCountByType = (type) => {
    return cart.reduce(
      (count, item) => (item.type === type ? count + item.quantity : count),
      0
    );
  };

  // Get subtotal by type
  const getSubtotalByType = (type) => {
    return cart.reduce(
      (total, item) =>
        item.type === type ? total + item.price * item.quantity : total,
      0
    );
  };

  // Check if an item is in cart
  const isInCart = (itemId, customizations = {}) => {
    return cart.some(
      (item) =>
        item.id === itemId &&
        JSON.stringify(item.customizations) === JSON.stringify(customizations)
    );
  };

  // Get item from cart
  const getCartItem = (itemId, customizations = {}) => {
    return cart.find(
      (item) =>
        item.id === itemId &&
        JSON.stringify(item.customizations) === JSON.stringify(customizations)
    );
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        total,
        itemCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemCountByType,
        getSubtotalByType,
        isInCart,
        getCartItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
