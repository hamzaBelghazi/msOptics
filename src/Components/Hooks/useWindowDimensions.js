import { useState, useEffect } from "react";

function getWindowDimensions(w) {
  let { innerWidth: width, innerHeight: height } = w;
  return {
    width,
    height,
  };
}

export default function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState();

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions(window));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowDimensions;
}
