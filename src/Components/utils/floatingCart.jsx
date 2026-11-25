"use client";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "@mui/icons-material";
import { CartContext } from "../Context/CartContext";

const SIZE = 56; // rendered diameter, matches w-14 h-14 below
const EDGE = 20; // breathing room kept between the button and the viewport edges
const BOTTOM_RESERVE = 96; // keeps the right-docked button clear of "back to top"
const DRAG_THRESHOLD = 6; // px a press may travel before it counts as a drag
const STORAGE_KEY = "mhs:floating-cart";

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

// the bottom-right corner already hosts the back-to-top button, so a
// right-docked cart stops just above it instead of covering it
const viewportBounds = (x = 0) => {
  const onRightHalf = x + SIZE / 2 >= window.innerWidth / 2;
  return {
    maxX: Math.max(EDGE, window.innerWidth - SIZE - EDGE),
    maxY: Math.max(EDGE, window.innerHeight - SIZE - (onRightHalf ? BOTTOM_RESERVE : EDGE)),
  };
};

const readStoredPosition = () => {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "null");
    if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) return stored;
  } catch (error) {
    /* private mode / disabled storage — fall back to the default corner */
  }
  return null;
};

export default function FloatingCartButton() {
  const { itemCount } = useContext(CartContext);
  const { t } = useTranslation();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [bump, setBump] = useState(false);

  const positionRef = useRef(position);
  const sideRef = useRef("right");
  const pressRef = useRef(null);
  const detachRef = useRef(null);
  const lastCount = useRef(itemCount);

  // single place that clamps, stores and renders the position
  const applyPosition = useCallback((x, y, options = {}) => {
    const { persist = false, side } = options;
    const { maxX, maxY } = viewportBounds(x);
    const next = { x: clamp(x, EDGE, maxX), y: clamp(y, EDGE, maxY) };
    positionRef.current = next;
    setPosition(next);
    if (side) sideRef.current = side;
    if (persist) {
      try {
        window.sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...next, side: sideRef.current })
        );
      } catch (error) {
        /* ignore storage failures */
      }
    }
  }, []);

  // place the button once we know the viewport (a restored position wins)
  useEffect(() => {
    const { maxX, maxY } = viewportBounds(window.innerWidth);
    const stored = readStoredPosition();
    const fallbackY = clamp(window.innerHeight - SIZE - 148, EDGE, maxY);
    if (stored) {
      applyPosition(stored.x, stored.y, { side: stored.side === "left" ? "left" : "right" });
    } else {
      applyPosition(maxX, fallbackY, { side: "right" });
    }
    setIsReady(true);
  }, [applyPosition]);

  // only show it once the hero is behind the user
  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 120);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // stay docked on the same side when the window or the device rotates
  useEffect(() => {
    const handleResize = () => {
      const { maxX } = viewportBounds(positionRef.current.x);
      const side = sideRef.current;
      const x = side === "left" ? EDGE : side === "right" ? maxX : positionRef.current.x;
      applyPosition(x, positionRef.current.y);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [applyPosition]);

  // little pop on the badge whenever something new lands in the bag
  useEffect(() => {
    if (itemCount > lastCount.current) {
      lastCount.current = itemCount;
      setBump(true);
      const timer = setTimeout(() => setBump(false), 650);
      return () => clearTimeout(timer);
    }
    lastCount.current = itemCount;
    return undefined;
  }, [itemCount]);

  const detach = useCallback(() => {
    if (detachRef.current) {
      detachRef.current();
      detachRef.current = null;
    }
  }, []);

  useEffect(() => () => detach(), [detach]);

  const openCart = () => {
    window.dispatchEvent(new Event("cart:open"));
  };

  const cancelPress = useCallback(() => {
    detach();
    pressRef.current = null;
    setIsDragging(false);
  }, [detach]);

  const finishPress = useCallback(() => {
    detach();
    const press = pressRef.current;
    pressRef.current = null;
    setIsDragging(false);
    if (!press) return;

    // a plain tap is a click: open the sliding cart
    if (!press.moved) {
      window.dispatchEvent(new Event("cart:open"));
      return;
    }

    // otherwise settle against the closest side so it never floats
    // awkwardly in the middle of the page
    const { maxX } = viewportBounds(positionRef.current.x);
    const centerX = positionRef.current.x + SIZE / 2;
    const side = centerX < window.innerWidth / 2 ? "left" : "right";
    applyPosition(side === "left" ? EDGE : maxX, positionRef.current.y, { persist: true, side });
  }, [applyPosition, detach]);

  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pressRef.current) return;

    const button = event.currentTarget;
    const press = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: positionRef.current.x,
      originY: positionRef.current.y,
      moved: false,
    };
    pressRef.current = press;

    try {
      button.setPointerCapture(event.pointerId);
    } catch (error) {
      /* pointer capture is a nicety, not a requirement */
    }

    // listening on the document keeps the drag alive even when the pointer
    // slips off the round button (or the browser drops the implicit capture)
    const handleMove = (moveEvent) => {
      if (!pressRef.current || moveEvent.pointerId !== press.id) return;
      const dx = moveEvent.clientX - press.startX;
      const dy = moveEvent.clientY - press.startY;

      if (!press.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        press.moved = true;
        setIsDragging(true);
      }

      if (moveEvent.cancelable) moveEvent.preventDefault();
      applyPosition(press.originX + dx, press.originY + dy);
    };

    const handleUp = () => finishPress();
    const handleCancel = () => cancelPress();
    const handleBlur = () => cancelPress();

    document.addEventListener("pointermove", handleMove, { passive: false });
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleCancel);
    window.addEventListener("blur", handleBlur);

    detachRef.current = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleCancel);
      window.removeEventListener("blur", handleBlur);
    };
  };

  if (!isReady) return null;

  const labelOnRight = position.x + SIZE / 2 < window.innerWidth / 2;
  const label = itemCount > 0 ? `${t("cart.title", "Cart")} · ${itemCount}` : t("cart.title", "Cart");

  return (
    <button
      type="button"
      aria-label={itemCount > 0 ? `${t("cart.title", "Cart")}, ${itemCount} ${itemCount === 1 ? "item" : "items"}` : t("cart.title", "Cart")}
      onPointerDown={handlePointerDown}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.dispatchEvent(new Event("cart:open"));
        }
      }}
      onDragStart={(event) => event.preventDefault()}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${SIZE}px`,
        height: `${SIZE}px`,
        touchAction: "none",
        WebkitTapHighlightColor: "transparent",
        transition: isDragging
          ? "opacity 0.3s ease"
          : "left 0.34s cubic-bezier(0.22, 1, 0.36, 1), top 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
      }}
      className={`group fixed z-30 grid select-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      {/* soft halo */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full opacity-70 blur-xl transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: "rgb(var(--primary) / 0.45)" }}
      />

      {/* the button itself */}
      <span
        className={`relative grid h-14 w-14 place-items-center rounded-full ring-1 ring-white/35 transition-transform duration-200 ${
          isDragging ? "scale-110" : "group-hover:scale-105 group-active:scale-95"
        }`}
        style={{
          background:
            "linear-gradient(125deg, rgb(var(--primary)) 4%, rgb(var(--accent)) 58%, rgb(var(--gold)) 132%)",
          color: "rgb(var(--primary-ink))",
          boxShadow:
            "0 16px 34px -14px rgb(var(--primary) / 0.95), inset 0 1px 0 rgb(255 255 255 / 0.4)",
        }}
      >
        <ShoppingCart sx={{ fontSize: 25 }} />
        {itemCount > 0 && (
          <span
            className={`absolute -right-1 -top-1 grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-[11px] font-bold shadow-md ring-2 ring-background transition-transform duration-300 ${
              bump ? "scale-125" : "scale-100"
            }`}
            style={{ background: "rgb(var(--foreground))", color: "rgb(var(--background))" }}
          >
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </span>

      {/* hover label */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100 sm:block ${
          labelOnRight ? "left-full ml-3" : "right-full mr-3"
        }`}
        style={{
          background: "rgb(var(--card-background))",
          color: "rgb(var(--text-primary))",
          border: "1px solid rgb(var(--card-border))",
        }}
      >
        {label}
      </span>
    </button>
  );
}
