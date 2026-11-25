"use client";
import { useState, useContext, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Search as SearchIcon,
  AccountCircle as UserIcon,
  ShoppingCart as CartIcon,
  Menu as BarsIcon,
  Close as TimesIcon,
  FavoriteBorder as HeartIcon,
} from "@mui/icons-material";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import CurrencyChangeAndTranslation from "../Header/CurrencyChangeAndTranslation";
import Search from "../search/Search";
import Announcement from "../Header/Announcement";
import NavigationMenu from "../Header/NavigationMenu";
import ThemeToggle from "../Header/ThemeToggle";
import { AuthContext } from "../Context/AuthContext";
import { CartContext } from "../Context/CartContext";
import SlidingCart from "../Cart/SlidingCart";
import Logo from "../ui/Logo";
import { adminApi } from "@/Api/adminApi";
import { menuLabel, menuImage, linkThumb, linkUrl, isExternal } from "../Header/menuUtils";

const FALLBACK_NAV = [
  { href: "/", key: "navigation.home" },
  { href: "/type/prescription", key: "navigation.optical" },
  { href: "/type/sunglasses", key: "navigation.sunglasses" },
  { href: "/accessories", key: "navigation.accessories", fallback: "Accessories" },
  { href: "/inside/contact", key: "navigation.contact_us" },
];

function PillLink({ href, active, children, external, newTab }) {
  const cls = `block px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
    active ? "bg-primary text-white shadow" : "text-text-secondary hover:text-primary hover:bg-primary/10"
  }`;
  if (external || newTab) {
    return (
      <a href={href} target={newTab ? "_blank" : undefined} rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export default function Header({ announcement }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menus, setMenus] = useState([]);
  const [openMenu, setOpenMenu] = useState(null); // id of hovered dropdown/mega
  const closeTimer = useRef(null);
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { logout, user } = useContext(AuthContext);
  const { cart, removeFromCart, updateQuantity, total, itemCount } = useContext(CartContext);
  const menuRef = useRef(null);
  const lastItemCount = useRef(itemCount);

  useEffect(() => {
    let ignore = false;
    adminApi.menus
      .active(i18n.language)
      .then((list) => {
        if (!ignore) setMenus(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [i18n.language]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target) && isMenuOpen) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (itemCount > lastItemCount.current) setIsCartOpen(true);
    lastItemCount.current = itemCount;
  }, [itemCount]);

  // the floating cart button on the home page asks the header to open the drawer
  useEffect(() => {
    const openCart = () => setIsCartOpen(true);
    window.addEventListener("cart:open", openCart);
    return () => window.removeEventListener("cart:open", openCart);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted) return null;

  const lang = i18n.language || "en";
  const useDynamic = menus.length > 0;

  const open = (id) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(id);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };

  const isActiveUrl = (url) => !!url && !isExternal(url) && router.asPath === url;

  const renderChildRow = (child) => {
    const url = linkUrl(child);
    const thumb = linkThumb(child);
    const ext = isExternal(url);
    const inner = (
      <>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="w-11 h-11 rounded-xl object-cover border border-border/60 shrink-0" />
        ) : (
          <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center font-display font-bold shrink-0">
            {(menuLabel(child, lang) || "•").charAt(0)}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-text-primary truncate">
            {menuLabel(child, lang)}
          </span>
          {child.resolved?.title && child.label !== child.resolved.title && (
            <span className="block text-[11px] text-text-muted truncate">{child.resolved.title}</span>
          )}
        </span>
        <ArrowUpRight size={14} className="text-text-muted shrink-0" />
      </>
    );
    const cls =
      "flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-primary/10 transition-colors";
    return ext ? (
      <a key={child._id || child.label} href={url} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    ) : (
      <Link key={child._id || child.label} href={url} className={cls}>
        {inner}
      </Link>
    );
  };

  const renderMegaPanel = (item) => {
    const promo = item.promo;
    return (
      <div
        onMouseEnter={() => open(item._id || item.label)}
        onMouseLeave={scheduleClose}
        className="absolute left-4 right-4 top-full mt-2 z-50"
      >
        <div className="glass-strong rounded-[1.6rem] shadow-2xl p-6 md:p-8 grid gap-8 md:grid-cols-[1fr_1fr_320px]">
          {(item.columns || []).map((col) => (
            <div key={col._id || col.heading}>
              <p className="text-[11px] font-bold tracking-[0.24em] uppercase text-gold mb-3">
                {menuLabel(col, lang)}
              </p>
              <div className="space-y-1">
                {(col.links || []).map((l) => (
                  <div key={l._id || l.label}>{renderChildRow(l)}</div>
                ))}
              </div>
            </div>
          ))}
          {promo && (promo.title || promo.titles?.en || promo.image) && (
            <Link
              href={linkUrl(promo)}
              className="group relative block rounded-3xl overflow-hidden border border-white/20 min-h-[240px]"
            >
              {promo.image || promo.resolved?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={menuImage(promo.image || promo.resolved?.image)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-primary to-gold" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-5">
                <span className="block text-[10px] font-bold tracking-[0.28em] uppercase text-gold-soft">
                  Featured
                </span>
                <span className="block font-display font-semibold text-2xl text-white mt-1">
                  {menuLabel(promo, lang) || promo.title}
                </span>
                {promo.subtitle && (
                  <span className="block text-white/70 text-sm mt-1">{promo.subtitle}</span>
                )}
              </span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  const renderDropdownPanel = (item) => (
    <div
      onMouseEnter={() => open(item._id || item.label)}
      onMouseLeave={scheduleClose}
      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-80"
    >
      <div className="glass-strong rounded-3xl shadow-2xl p-2.5 space-y-0.5">
        {(item.children || []).map((c) => (
          <div key={c._id || c.label}>{renderChildRow(c)}</div>
        ))}
      </div>
    </div>
  );

  const iconBtn =
    "relative grid place-items-center w-10 h-10 rounded-full glass text-text-secondary hover:text-primary hover:-translate-y-0.5 transition-all duration-300";

  return (
    <header id="site-header" className="relative z-50">
      <Announcement ann={announcement} />

      <div className="hidden md:block border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="container mx-auto px-6 flex justify-end">
          <CurrencyChangeAndTranslation compact />
        </div>
      </div>

      <div className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? "px-2 sm:px-4 pt-2" : ""}`}>
        <div
          className={`transition-all duration-500 ${
            scrolled ? "glass-strong rounded-2xl shadow-lg container mx-auto" : "bg-background/60 backdrop-blur-xl border-b border-border/50"
          }`}
        >
          <div className="container mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 relative lg:flex-nowrap">
            <button onClick={() => setIsMenuOpen(true)} className={`${iconBtn} xl:hidden`} aria-label="Open menu">
              <BarsIcon />
            </button>

            <Link href="/" className="shrink-0 transition-transform hover:scale-[1.03]">
              <Logo size={38} compact />
            </Link>

            {/* dynamic / fallback nav */}
            <nav className="hidden xl:flex flex-1 items-center justify-center">
              <ul className="flex items-center gap-1 p-1.5 rounded-full glass">
                {!useDynamic &&
                  FALLBACK_NAV.map((n) => (
                    <li key={n.href}>
                      <PillLink href={n.href} active={router.asPath === n.href}>
                        {t(n.key, n.fallback)}
                      </PillLink>
                    </li>
                  ))}
                {useDynamic &&
                  menus.map((m) => {
                    const id = m._id || m.label;
                    const url = m.url || m.resolved?.url || "#";
                    const ext = isExternal(url);
                    const active = isActiveUrl(url);
                    if (m.type === "link" || (!m.children?.length && !m.columns?.length && m.type !== "mega")) {
                      return (
                        <li key={id}>
                          <PillLink href={url} active={active} external={ext} newTab={m.openInNewTab}>
                            {menuLabel(m, lang)}
                          </PillLink>
                        </li>
                      );
                    }
                    return (
                      <li
                        key={id}
                        className="relative"
                        onMouseEnter={() => open(id)}
                        onMouseLeave={scheduleClose}
                      >
                        {url && url !== "#" ? (
                          <Link
                            href={url}
                            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                              openMenu === id || active
                                ? "bg-primary text-white shadow"
                                : "text-text-secondary hover:text-primary hover:bg-primary/10"
                            }`}
                          >
                            {menuLabel(m, lang)}
                            <ChevronDown size={14} />
                          </Link>
                        ) : (
                          <button
                            onClick={() => setOpenMenu(openMenu === id ? null : id)}
                            className={`flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                              openMenu === id
                                ? "bg-primary text-white shadow"
                                : "text-text-secondary hover:text-primary hover:bg-primary/10"
                            }`}
                          >
                            {menuLabel(m, lang)}
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${openMenu === id ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                        {openMenu === id && m.type !== "mega" && renderDropdownPanel(m)}
                      </li>
                    );
                  })}
              </ul>
            </nav>

            <div className="flex items-center gap-2 ml-auto">
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <button onClick={() => setIsModalOpen(true)} className={iconBtn} aria-label="Search">
                <SearchIcon />
              </button>
              {user ? (
                <>
                  <Link href="/wishlist" className={`${iconBtn} max-md:hidden`} aria-label="Wishlist">
                    <HeartIcon />
                  </Link>
                  <Link href="/account" className={`${iconBtn} max-md:hidden`} aria-label="Account">
                    <UserIcon />
                  </Link>
                  <button
                    onClick={logout}
                    className="hidden lg:block text-sm font-semibold text-text-secondary hover:text-primary px-3 py-2 transition-colors"
                  >
                    {t("navigation.logout")}
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn-luxe !py-2.5 !px-5 text-sm hidden md:inline-flex">
                  {t("auth.login")}
                </Link>
              )}
              <button onClick={() => setIsCartOpen(true)} className={iconBtn} aria-label="Cart">
                <CartIcon />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 grid place-items-center bg-gradient-to-br from-primary to-gold text-white text-[11px] font-bold rounded-full shadow-md">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>

            {/* mobile second row — currency, language, theme and the account
                items would otherwise push the bar past the screen edge */}
            <div className="flex w-full items-center justify-between gap-2 border-t border-border/50 pt-2 md:hidden">
              <div className="flex items-center gap-1.5">
                <CurrencyChangeAndTranslation compact />
                <ThemeToggle />
              </div>
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <Link href="/wishlist" className={iconBtn} aria-label="Wishlist">
                      <HeartIcon />
                    </Link>
                    <Link href="/account" className={iconBtn} aria-label="Account">
                      <UserIcon />
                    </Link>
                  </>
                ) : (
                  <Link href="/login" className="btn-luxe !px-4 !py-2 text-xs">
                    {t("auth.login")}
                  </Link>
                )}
              </div>
            </div>

            {/* mega panel anchor lives inside this relative bar */}
            {useDynamic &&
              openMenu &&
              (() => {
                const m = menus.find((x) => (x._id || x.label) === openMenu);
                if (m && m.type === "mega") return renderMegaPanel(m);
                return null;
              })()}
          </div>
        </div>
      </div>

      <div ref={menuRef}>
        <NavigationMenu
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          menus={useDynamic ? menus : null}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh] bg-black/45 backdrop-blur-sm">
          <div className="glass-strong rounded-3xl p-6 md:p-8 w-full max-w-3xl relative animate-floaty-sm">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 grid place-items-center w-9 h-9 rounded-full bg-background text-text-secondary hover:text-primary transition-colors"
              aria-label="Close search"
            >
              <TimesIcon />
            </button>
            <Search />
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setIsCartOpen(false)} />
      )}

      <SlidingCart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(!isCartOpen)}
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
