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
import SlidingCart from "../Cart/SlidingCart";

// (moved cart UI to separate component)

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

      {/* Cart Backdrop (outside click to close) */}
      {isCartOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Sliding Modal for Cart */}
      <SlidingCart
        isOpen={isCartOpen}
        onClose={toggleCart}
        cart={cart}
        itemCount={itemCount}
        total={total}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        t={t}
      />
    </header>
  );
}
