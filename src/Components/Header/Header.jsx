"use client";
import { useState, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search as SearchIcon,
  AccountCircle as UserIcon,
  ShoppingCart as CartIcon,
  Menu as BarsIcon,
  Close as TimesIcon,
  FavoriteBorder as HeartIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import CurrencyChangeAndTranslation from "../Header/CurrencyChangeAndTranslation";
import Search from "../search/Search";
import Announcement from "../Header/Announcement";
import NavigationMenu from "../Header/NavigationMenu";
import ThemeToggle from "../Header/ThemeToggle";
import { AuthContext } from "../Context/AuthContext";
import { CartContext } from "../Context/CartContext";
import PriceTag from "../utils/PriceTag";

// Helper function to get the correct image path based on item type
const getImagePath = (item) => {
  // Handle array or string image values
  const imageName = Array.isArray(item.image) ? item.image[0] : item.image;

  switch (item.type) {
    case "product":
      return `products/${imageName}`;
    case "accessory":
      return `accessories/${imageName}`;
    case "lens":
      return `lenses/lenses.webp`;
    default:
      return `products/${imageName}`;
  }
};

export default function Header({ announcement }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for search modal
  const [isCartOpen, setIsCartOpen] = useState(false); // State for cart modal
  const [isMounted, setIsMounted] = useState(false); // State for mounted status
  const { t } = useTranslation();
  const { logout, user } = useContext(AuthContext);
  const { cart, removeFromCart, updateQuantity, total, itemCount } =
    useContext(CartContext);
  const menuRef = useRef(null);
  const cartRef = useRef(null);
  const lastItemCount = useRef(itemCount);

  // Handle click outside for menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        isMenuOpen
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Auto-open cart when items are added
  useEffect(() => {
    if (itemCount > lastItemCount.current) {
      setIsCartOpen(true);
    }
    lastItemCount.current = itemCount;
  }, [itemCount]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const toggleCart = () => {
    setIsCartOpen(!isCartOpen);
  };

  const removeFromCartHandler = (itemId) => {
    setCartItems(cartItems.filter((item) => item.id !== itemId));
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <header
      id="site-header"
      className="bg-background text-foreground shadow-md relative z-50"
    >
      {/* Announcement Bar */}
      <Announcement ann={announcement} />
      {/* Currency and Translation Selector */}
      <CurrencyChangeAndTranslation />

      {/* Main Header Content */}
      <div className="container mx-auto px-6 py-4 flex flex-wrap justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Optics Store Logo"
            width={120}
            height={40}
            className="cursor-pointer transition-transform duration-300 hover:scale-105"
          />
        </Link>

        {/* Navigation Links */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
        <nav className="hidden md:flex items-center space-x-6">
          <ul className="flex flex-col md:flex-row md:space-x-8 text-center md:text-left h-full md:h-auto">
            <li>
              <Link href="/">
                <span className="block py-3 px-4 text-text-secondary hover:text-primary hover:bg-card-background/80 transition-all duration-300 cursor-pointer rounded-md">
                  {t("navigation.home")}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/type/prescription">
                <span className="block py-3 px-4 text-text-secondary hover:text-primary hover:bg-card-background/80 transition-all duration-300 cursor-pointer rounded-md">
                  {t("navigation.optical")}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/type/sunglasses">
                <span className="block py-3 px-4 text-text-secondary hover:text-primary hover:bg-card-background/80 transition-all duration-300 cursor-pointer rounded-md">
                  {t("navigation.sunglasses")}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/accessories">
                <span className="block py-3 px-4 text-text-secondary hover:text-primary hover:bg-card-background/80 transition-all duration-300 cursor-pointer rounded-md">
                  {t("navigation.accessories", "Accessories")}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/inside/contact">
                <span className="block py-3 px-4 text-text-secondary hover:text-primary hover:bg-card-background/80 transition-all duration-300 cursor-pointer rounded-md">
                  {t("navigation.contact_us")}
                </span>
              </Link>
            </li>
          </ul>
        </nav>

        <div ref={menuRef}>
          <NavigationMenu
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
          />
        </div>
        {/* Icons (Search, User, Wishlist, Cart) */}
        <div className="w-full sm:w-full mr-0 flex items-center justify-end space-x-4 order-3 mt-4 md:mt-0">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Search Icon */}
          <button
            onClick={toggleModal}
            className="text-text-secondary hover:text-primary cursor-pointer transition-colors duration-300 transform hover:scale-110"
          >
            <SearchIcon className="text-2xl" />
          </button>

          {user ? (
            <>
              <Link href="/wishlist">
                <HeartIcon className="text-text-secondary hover:text-primary cursor-pointer transition-colors duration-300 transform hover:scale-110" />
              </Link>
              <Link href="/account">
                <UserIcon className="text-text-secondary hover:text-primary cursor-pointer transition-colors duration-300 transform hover:scale-110" />
              </Link>
              <button
                onClick={logout}
                className="hidden md:block text-text-secondary hover:text-primary font-medium transition-colors duration-300 rounded-md px-3 py-1 bg-card-background hover:bg-card-background/80"
              >
                {t("navigation.logout")}
              </button>
            </>
          ) : (
            <Link
              href={"/login"}
              className="text-text-secondary hover:text-primary font-medium transition-colors duration-300 rounded-md px-3 py-1 bg-card-background hover:bg-card-background/80"
            >
              {t("auth.login")}
            </Link>
          )}

          {/* Cart Icon with Badge */}
          <button
            onClick={toggleCart}
            className="relative text-text-secondary hover:text-primary cursor-pointer transition-colors duration-300 transform hover:scale-110"
          >
            <CartIcon className="text-2xl" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-button-text text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Burger Menu for Mobile */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="text-text-secondary  hover:text-primary focus:outline-none transition-colors duration-300 transform hover:scale-110"
          >
            {isMenuOpen ? (
              <TimesIcon className="text-2xl" />
            ) : (
              <BarsIcon className="text-2xl" />
            )}
          </button>
        </div>
      </div>

      {/* Modal for Search */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/75 flex items-center justify-center z-50">
          <div className="bg-card-background p-8 rounded-lg shadow-lg w-full max-w-3xl relative">
            {/* Close Button */}
            <button
              onClick={toggleModal}
              className="absolute top-4 right-4 text-text-secondary hover:text-primary transition-colors duration-300"
            >
              <TimesIcon className="text-xl" />
            </button>

            {/* Render the Search Component */}
            <Search />
          </div>
        </div>
      )}

      {/* Sliding Modal for Cart */}
      <div
        className={`fixed inset-y-0 right-0 xs:w-xs sm:w-sm md:w-96 bg-card-background shadow-2xl z-50 transform transition-transform duration-500 ease-in-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border">
            <h2 className="text-xl font-bold text-text-primary">
              {t("cart.title")} ({itemCount})
            </h2>
            <button
              onClick={toggleCart}
              className="text-text-secondary hover:text-primary transition-colors duration-300"
            >
              <TimesIcon className="text-2xl" />
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {cart.length > 0 ? (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id + JSON.stringify(item.customizations)}
                    className="flex flex-col gap-3 p-4 bg-background rounded-lg shadow-md transition-transform duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 rounded-md overflow-hidden bg-card-background">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${getImagePath(item)}`}
                          alt={item.title}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <h3 className="font-medium text-text-primary line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-text-secondary mt-1">
                          {item.type.charAt(0).toUpperCase() +
                            item.type.slice(1)}
                        </p>
                        {Object.keys(item.customizations).length > 0 && (
                          <div className="mt-1 text-xs text-text-secondary">
                            {Object.entries(item.customizations).map(
                              ([key, value]) => (
                                <span key={key} className="mr-2">
                                  {key}: {value}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price and Actions */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.max(0, item.quantity - 1),
                              item.customizations
                            )
                          }
                          className="text-text-secondary hover:text-primary w-8 h-8 flex items-center justify-center rounded-full bg-background border border-border transition-colors"
                        >
                          -
                        </button>
                        <span className="text-text-primary">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity + 1,
                              item.customizations
                            )
                          }
                          className="text-text-secondary hover:text-primary w-8 h-8 flex items-center justify-center rounded-full bg-background border border-border transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-text-primary">
                          <PriceTag amount={item.price * item.quantity} />
                        </span>
                        <button
                          onClick={() =>
                            removeFromCart(item.id, item.customizations)
                          }
                          className="text-text-secondary hover:text-red-500 transition-colors"
                        >
                          <TimesIcon className="text-xl" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-secondary">{t("cart.empty")}</p>
              </div>
            )}
          </div>

          {/* Footer with Total and Checkout */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-border">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary font-medium">
                    {t("cart.subtotal")}
                  </span>
                  <span className="text-lg font-bold text-text-primary">
                    <PriceTag amount={total} />
                  </span>
                </div>
                <Link
                  href="/checkout"
                  className="block w-full bg-primary text-button-text py-3 rounded-md text-center font-medium hover:bg-primary-hover transition-colors duration-300"
                >
                  {t("cart.proceed_to_checkout")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
