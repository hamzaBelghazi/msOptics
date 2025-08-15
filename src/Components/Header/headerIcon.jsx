import React, { useContext } from "react";
import i18next from "i18next";
import { AuthContext } from "../Context/AuthContext";
import {
  EarthIcon,
  LogoutIcon,
  SearchIcon,
  ShoppingCartIcon,
  UserIcon,
} from "../utils/icons";
import { WishContext } from "../Context/WishlistContext";
import Link from "next/link";

export default function HeaderIcon({ background }) {
  const auth = useContext(AuthContext);
  const { clearWishlist } = useContext(WishContext);

  const languages = [
    {
      code: "en",
      name: "English",
      country_code: "gb",
    },
    {
      code: "fr",
      name: "Français",
      country_code: "fr",
    },
    {
      code: "de",
      name: "Deutsch",
      country_code: "de",
    },
  ];

  return (
    <>
      <Link href="/cart">
        <ShoppingCartIcon
          color={background ? "black" : "white"}
          style={{ marginRight: 15 }}
        />
      </Link>

      <Link href="/search">
        <SearchIcon
          color={background ? "black" : "white"}
          style={{ marginRight: 15 }}
        />
      </Link>

      <div className="btn-group pb-1" style={{ marginRight: 10 }}>
        <button
          type="button"
          className={
            background
              ? "text-dark btn btn-sm m-0 p-0 dropdown-toggle side-bar-btn"
              : "text-white btn btn-sm m-0 p-0 dropdown-toggle side-bar-btn"
          }
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <EarthIcon color={background ? "black" : "white"} />
        </button>
        <ul className="dropdown-menu dropdown-menu-end">
          {languages.map(({ code, name }) => (
            <li key={code}>
              <button
                className="dropdown-item"
                type="button"
                onClick={() => i18next.changeLanguage(code)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <span className="d-none d-md-inline">
        <Link href={auth.isLoggedIn ? "/account" : "/login"}>
          <UserIcon
            color={background ? "black" : "white"}
            style={{ marginRight: 15 }}
          />
        </Link>
      </span>

      {auth.isLoggedIn ? (
        <button
          className="btn btn-sm p-0 side-bar-btn"
          onClick={() => {
            auth.logout();
            clearWishlist();
          }}
        >
          <LogoutIcon
            color={background ? "black" : "white"}
            style={{ marginRight: 5 }}
          />
        </button>
      ) : null}
    </>
  );
}
