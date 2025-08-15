import Link from "next/link";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AuthContext } from "../Context/AuthContext";

import { Close } from "@mui/icons-material";

function NavigationMenu({ isMenuOpen, setIsMenuOpen }) {
  const { t } = useTranslation();
  const { logout, user } = useContext(AuthContext);
  const [visible, setVisible] = useState(isMenuOpen);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      setVisible(true);
      // Delay to trigger transition in
      setTimeout(() => setAnimateIn(true), 100);
    } else {
      setAnimateIn(false); // Start transition out
      // Delay unmount until animation finishes
      const timeout = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [isMenuOpen]);
  return (
    visible && (
      <nav
        className={`fixed top-0 right-0 z-50 w-full h-[70vh] bg-card-background border border-border shadow-2xl rounded-bl-full origin-top-right transform transition-all duration-500 ease-in-out ${
          animateIn ? "scale-100 opacity-100" : "scale-0 opacity-0"
        }`}
      >
        <span
          onClick={() => setIsMenuOpen(false)}
          className="absolute top-2 right-2 cursor-pointer hover:rotate-180 transition-all duration-200 ease-in-out"
        >
          <Close className="text-2xl" />
        </span>
        <ul className="flex flex-col text-center  h-full">
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
          {user && (
            <li className="md:hidden mb-20 border-t border-border mt-auto mx-auto">
              <button
                onClick={logout}
                className="w-full text-left py-3 px-4 text-text-secondary hover:text-primary hover:bg-card-background/80 transition-all duration-300 cursor-pointer rounded-md"
              >
                {t("navigation.logout")}
              </button>
            </li>
          )}
        </ul>
      </nav>
    )
  );
}

export default NavigationMenu;
