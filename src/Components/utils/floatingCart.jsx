import React, { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { ShoppingCart } from "@mui/icons-material";
import { CartContext } from "../Context/CartContext";

const FloatingCartButton = () => {
  const { itemCount } = useContext(CartContext);
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 400, left: 0 });

  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };

    setPosition((prev) => ({
      ...prev,
      top: window.innerHeight - 130,
      left: window.innerWidth - 80,
    }));

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    dragging.current = true;
    dragMoved.current = false;
    offset.current = {
      x: e.clientX - position.left,
      y: e.clientY - position.top,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    setPosition({
      left: e.clientX - offset.current.x,
      top: e.clientY - offset.current.y,
    });
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    if (!dragMoved.current) router.push("/cart");
    dragging.current = false;
  };

  // Touch drag handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    dragging.current = true;
    dragMoved.current = false;
    offset.current = {
      x: touch.clientX - position.left,
      y: touch.clientY - position.top,
    };
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);
  };

  const handleTouchMove = (e) => {
    if (!dragging.current) return;
    dragMoved.current = true;
    const touch = e.touches[0];
    setPosition({
      left: touch.clientX - offset.current.x,
      top: touch.clientY - offset.current.y,
    });
  };

  const handleTouchEnd = () => {
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
    if (!dragMoved.current) router.push("/cart");
    dragging.current = false;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transition: "opacity 0.3s",
        zIndex: 9999,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className="flex flex-col items-center gap-1 w-12 h-12 bg-primary/90 text-white rounded-full shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none outline-double  outline-foreground"
        title="View Cart"
      >
        <div className="relative">
          <ShoppingCart style={{ fontSize: 20 }} />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold px-1 py-0.5 rounded-full shadow-sm">
              {itemCount}
            </span>
          )}
        </div>
        <span className="text-xs font-thin">Cart</span>
      </div>
    </div>
  );
};

export default FloatingCartButton;
