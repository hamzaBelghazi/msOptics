import Link from "next/link";
import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../Context/AuthContext";
import { X, ChevronDown } from "lucide-react";
import { menuLabel, linkUrl, isExternal } from "../Header/menuUtils";

const FALLBACK_LINKS = [
  { href: "/", key: "navigation.home" },
  { href: "/type/prescription", key: "navigation.optical" },
  { href: "/type/sunglasses", key: "navigation.sunglasses" },
  { href: "/accessories", key: "navigation.accessories", fallback: "Accessories" },
  { href: "/inside/contact", key: "navigation.contact_us" },
  { href: "/wishlist", key: "account.wishlist", fallback: "Wishlist" },
  { href: "/account", key: "account.title", fallback: "Account" },
];

function Row({ href, active, onNav, children, external, newTab }) {
  const cls = `flex items-center justify-between px-4 py-3.5 rounded-2xl font-semibold transition-all ${
    active ? "bg-primary text-white shadow-md" : "text-text-primary hover:bg-primary/10 hover:text-primary"
  }`;
  if (external || newTab) {
    return (
      <a href={href} target={newTab ? "_blank" : undefined} rel="noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onNav} className={cls}>
      {children}
    </Link>
  );
}

function NavigationMenu({ isMenuOpen, setIsMenuOpen, menus }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { logout, user } = useContext(AuthContext);
  const [visible, setVisible] = useState(isMenuOpen);
  const [animateIn, setAnimateIn] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (isMenuOpen) {
      setVisible(true);
      setTimeout(() => setAnimateIn(true), 60);
    } else {
      setAnimateIn(false);
      setExpanded(null);
      const timeout = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(timeout);
    }
  }, [isMenuOpen]);

  if (!visible) return null;

  const lang = i18n.language || "en";
  const close = () => setIsMenuOpen(false);
  const dynamic = Array.isArray(menus) && menus.length > 0;
  const activeUrl = (url) => !!url && !isExternal(url) && router.asPath === url;

  const renderSubLinks = (links) => (
    <div className="ml-3 mt-1.5 mb-1 pl-3 border-l-2 border-primary/25 space-y-1">
      {(links || []).map((l) => {
        const url = linkUrl(l);
        return (
          <Row key={l._id || l.label} href={url} active={activeUrl(url)} onNav={close} external={isExternal(url)}>
            <span className="text-sm">{menuLabel(l, lang)}</span>
            <span className="text-gold text-sm">→</span>
          </Row>
        );
      })}
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-[55] bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${
          animateIn ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
      />
      <nav
        className={`fixed top-0 left-0 z-[56] h-full w-[86%] max-w-sm glass-strong border-r border-white/20 flex flex-col transition-transform duration-300 ease-out ${
          animateIn ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <span className="font-display font-semibold text-xl text-text-primary">
            MHS <span className="text-gradient">Optics</span>
          </span>
          <button
            onClick={close}
            className="grid place-items-center w-9 h-9 rounded-full bg-background text-text-secondary hover:text-primary hover:rotate-90 transition-all duration-300"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {!dynamic &&
            FALLBACK_LINKS.map((l, i) => (
              <li
                key={l.href}
                style={{ transitionDelay: `${i * 35}ms` }}
                className={`transition-all duration-300 ${animateIn ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
              >
                <Row href={l.href} active={router.asPath === l.href} onNav={close}>
                  {t(l.key, l.fallback)}
                  <span className="text-gold">→</span>
                </Row>
              </li>
            ))}

          {dynamic &&
            menus.map((m, i) => {
              const id = m._id || m.label;
              const url = m.url || m.resolved?.url || "#";
              const hasSubs =
                (m.children && m.children.length > 0) ||
                (m.columns || []).some((c) => (c.links || []).length > 0);
              const megaLinks = (m.columns || []).flatMap((c) => [
                ...(c.heading || c.headings?.en ? [{ _id: `h-${c._id}`, label: menuLabel(c, lang), url: "#", heading: true }] : []),
                ...(c.links || []),
              ]);
              const subs = m.type === "mega" ? megaLinks : m.children || [];
              const isOpen = expanded === id;
              return (
                <li
                  key={id}
                  style={{ transitionDelay: `${i * 30}ms` }}
                  className={`transition-all duration-300 ${animateIn ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                >
                  {hasSubs ? (
                    <>
                      <button
                        onClick={() => setExpanded(isOpen ? null : id)}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-semibold transition-all ${
                          isOpen ? "bg-primary text-white shadow-md" : "text-text-primary hover:bg-primary/10 hover:text-primary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {url && url !== "#" ? (
                            <Link href={url} onClick={(e) => e.stopPropagation()} className="hover:underline">
                              {menuLabel(m, lang)}
                            </Link>
                          ) : (
                            menuLabel(m, lang)
                          )}
                        </span>
                        <ChevronDown size={17} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div>
                          {renderSubLinks(subs.filter((s) => !s.heading))}
                          {m.type === "mega" && m.promo && (m.promo.title || m.promo.titles?.en) && (
                            <Link
                              href={linkUrl(m.promo)}
                              onClick={close}
                              className="block mt-2 mx-3 mb-1 rounded-2xl bg-gradient-to-r from-primary to-gold text-white text-sm font-bold px-4 py-3"
                            >
                              ✦ {menuLabel(m.promo, lang)}
                            </Link>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <Row href={url} active={activeUrl(url)} onNav={close} external={isExternal(url)} newTab={m.openInNewTab}>
                      {menuLabel(m, lang)}
                      <span className="text-gold">→</span>
                    </Row>
                  )}
                </li>
              );
            })}
        </ul>

        <div className="p-4 border-t border-border/60">
          {user ? (
            <button onClick={() => { logout(); close(); }} className="btn-glass w-full">
              {t("navigation.logout")}
            </button>
          ) : (
            <Link href="/login" onClick={close} className="btn-luxe w-full">
              {t("auth.login")}
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

export default NavigationMenu;
