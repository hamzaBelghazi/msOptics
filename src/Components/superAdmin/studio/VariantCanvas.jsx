"use client";

// Preview canvas for one try-on variation.
//
// This is the client-side twin of utils/tryonVariant.js: it paints the stored
// frontal PNG and recolours it with the same rule the server uses (frame pixels
// keep the art's shading and take the variation's colour, glass is pulled
// toward the lens tint). The point is to move at slider speed — the real PNGs
// and the variation's GLB are written only when the variation is saved.

import { useEffect, useRef } from "react";

const GLASS_ALPHA = 200;
const FRAME_FLOOR = 0.34;

const toRgb = (hex, fallback) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

const mix = (a, b, t) => a + (b - a) * t;

export default function VariantCanvas({
  src,
  frameColor = "#2b241d",
  lensColor = "#5b7294",
  lensOpacity = 0.35,
  width = 280,
  height = 110,
  className = "",
}) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !src) return undefined;
    let cancelled = false;
    let url = "";

    const frame = toRgb(frameColor, [43, 36, 29]);
    const tint = toRgb(lensColor, [91, 114, 148]);
    const t = Math.min(1, Math.max(0, Number(lensOpacity) || 0));

    (async () => {
      let img = null;
      try {
        // fetch + blob keeps the canvas same-origin, so getImageData works
        const r = await fetch(src);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        url = URL.createObjectURL(await r.blob());
        img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = url;
        });
      } catch (_) {
        return;
      }
      if (cancelled || !img) return;

      const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const s = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * s));
      const h = Math.max(1, Math.round(img.naturalHeight * s));
      const x = Math.round((canvas.width - w) / 2);
      const y = Math.round((canvas.height - h) / 2);
      ctx.drawImage(img, x, y, w, h);

      let data;
      try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (_) {
        return; // tainted canvas — show the plain artwork instead
      }
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        if (!px[i + 3]) continue;
        if (px[i + 3] < GLASS_ALPHA) {
          px[i] = clamp255(mix(px[i], tint[0], t));
          px[i + 1] = clamp255(mix(px[i + 1], tint[1], t));
          px[i + 2] = clamp255(mix(px[i + 2], tint[2], t));
        } else {
          const lum = (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
          const k = FRAME_FLOOR + (1 - FRAME_FLOOR) * lum;
          px[i] = clamp255(frame[0] * k);
          px[i + 1] = clamp255(frame[1] * k);
          px[i + 2] = clamp255(frame[2] * k);
        }
      }
      ctx.putImageData(data, 0, 0);
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [src, frameColor, lensColor, lensOpacity, width, height]);

  return (
    <canvas
      ref={ref}
      style={{ width, height }}
      className={"rounded-lg border border-border bg-[conic-gradient(at_50%_50%,#f4f4f4_0_25%,#e9e9e9_0_50%,#f4f4f4_0_75%,#e9e9e9_0)] " + className}
    />
  );
}
