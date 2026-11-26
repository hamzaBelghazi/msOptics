"use client";

// Procedural 2D glasses shapes + assembled PNG-parts renderer.
// Fallback chain (first available wins): parts kit → single frontal PNG →
// procedural shapes. Pose projection (project.js) gives the 3D feel.

import { makeProjector, DEFAULT_LAYOUT } from "./project";

const EYE_FRAC = 0.474; // eye line as a fraction of a single-frame PNG height

const COLOR_MAP = {
  black: "#211d1a", noir: "#211d1a", ebony: "#211d1a",
  brown: "#5a3a22", tortoise: "#6e4520", havana: "#5a3a1a", amber: "#8a5a1e",
  bronze: "#7d5a2b", gold: "#b08d2f", champagne: "#c2a15a", pearl: "#d9d2c4",
  silver: "#a9adb3", grey: "#6b7280", gray: "#6b7280", white: "#e8e6e1",
  red: "#b3372f", pink: "#d77a93", rose: "#c98a94", "rose gold": "#c08a6d",
  blue: "#2f5b8f", green: "#2f6b4f", orange: "#c96a1e", purple: "#6a3d8f",
};

export function frameColor(product) {
  const raw = Array.isArray(product?.colors) ? product.colors[0] : product?.colors;
  const first = String(raw || "").split(",")[0].trim().toLowerCase();
  return COLOR_MAP[first] || "#26221e";
}

function lensPath(ctx, shape, w, h) {
  // draws ONE lens centered at (0,0) with width w, height h
  const s = String(shape || "round").toLowerCase();
  ctx.beginPath();
  if (s.includes("round") && !s.includes("square")) {
    ctx.arc(0, 0, w / 2, 0, Math.PI * 2);
  } else if (s.includes("oval")) {
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (s.includes("aviator")) {
    // teardrop: wide top, tapered bottom
    ctx.moveTo(-w / 2, -h * 0.32);
    ctx.bezierCurveTo(-w / 2, h * 0.28, -w * 0.28, h / 2, 0, h / 2);
    ctx.bezierCurveTo(w * 0.22, h / 2, w / 2, h * 0.3, w / 2, -h * 0.3);
    ctx.bezierCurveTo(w / 2, -h * 0.52, -w / 2, -h * 0.52, -w / 2, -h * 0.32);
    ctx.closePath();
  } else if (s.includes("cat")) {
    // cat-eye: outer-top corner swept up
    const lift = h * 0.34;
    ctx.moveTo(-w / 2, -h * 0.1);
    ctx.lineTo(-w * 0.62, -h / 2 - lift * 0.4);
    ctx.lineTo(-w * 0.1, -h / 2);
    ctx.lineTo(w * 0.42, -h / 2);
    ctx.lineTo(w * 0.62, -h / 2 - lift);
    ctx.lineTo(w / 2, h * 0.05);
    ctx.quadraticCurveTo(w / 2, h / 2, 0, h / 2);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h * 0.05);
    ctx.closePath();
  } else if (s.includes("geometric") || s.includes("hex")) {
    const r = w / 2;
    const ry = h / 2;
    ctx.moveTo(-r * 0.55, -ry);
    ctx.lineTo(r * 0.55, -ry);
    ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.55, ry);
    ctx.lineTo(-r * 0.55, ry);
    ctx.lineTo(-r, 0);
    ctx.closePath();
  } else {
    // square / rectangle / default: rounded rect
    const square = s.includes("square");
    const hh = square ? w * 0.82 : h;
    const r = Math.min(w, hh) * 0.18;
    const x = -w / 2;
    const y = -hh / 2;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + hh, r);
    ctx.arcTo(x + w, y + hh, x, y + hh, r);
    ctx.arcTo(x, y + hh, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  return { h: s.includes("square") && !s.includes("round") ? w * 0.82 : h };
}

function shapeAspect(shape) {
  const s = String(shape || "").toLowerCase();
  if (s.includes("round") && !s.includes("square")) return 0.95;
  if (s.includes("oval")) return 0.72;
  if (s.includes("aviator")) return 1.0;
  if (s.includes("square")) return 0.82;
  return 0.68; // rectangle + default
}

/**
 * Draw full glasses for one geometry frame.
 * geom: { left, right, angle, eyeDist } in canvas pixels.
 * opts: { shape, color, tinted, yaw }
 *   yaw — signed display-space head turn (radians). Drives perspective:
 *   horizontal foreshorten + asymmetric temples, like real optics.
 */
export function drawGlasses(ctx, geom, opts = {}) {
  const { shape = "round", color = "#26221e", tinted = false, yaw = 0 } = opts;
  const yawC = Math.max(-1.1, Math.min(1.1, yaw || 0));
  // foreshorten as the head turns away (1.0 frontal → ~0.72 near profile)
  const squash = 0.5 + 0.5 * Math.cos(yawC);
  const dir = yawC > 0.08 ? 1 : yawC < -0.08 ? -1 : 0; // +1: nose screen-right, near side screen-left
  const lensW = geom.lensW || geom.eyeDist * 0.6;
  const lensH = lensW * shapeAspect(shape);
  const lw = Math.max(3, geom.eyeDist * 0.028);
  const midX = (geom.left.x + geom.right.x) / 2;

  ctx.save();
  // perspective squash about the face center
  ctx.translate(midX, 0);
  ctx.scale(Math.max(0.5, squash), 1);
  ctx.translate(-midX, 0);

  const paintLens = (c, mirror = false) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(geom.angle);
    // asymmetric shapes (cat-eye) sweep their outer corner up, so the
    // screen-left lens is the mirror image of the screen-right one
    if (mirror) ctx.scale(-1, 1);
    lensPath(ctx, shape, lensW, lensH);
    if (tinted) {
      const g = ctx.createLinearGradient(0, -lensH / 2, 0, lensH / 2);
      g.addColorStop(0, "rgba(18,20,28,0.62)");
      g.addColorStop(1, "rgba(18,20,28,0.42)");
      ctx.fillStyle = g;
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(170,195,205,0.14)";
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.stroke();
    // inner gold pinstripe
    ctx.strokeStyle = "rgba(201,162,39,0.85)";
    ctx.lineWidth = Math.max(1, lw * 0.28);
    ctx.stroke();
    ctx.restore();
  };

  paintLens(geom.left, true);
  paintLens(geom.right, false);

  // bridge + temples in unrotated space along the eye axis
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw * 0.9;
  ctx.lineCap = "round";
  const ux = Math.cos(geom.angle);
  const uy = Math.sin(geom.angle);
  const gap = lensW * 0.52;
  const mx = (geom.left.x + geom.right.x) / 2;
  const my = (geom.left.y + geom.right.y) / 2;
  ctx.beginPath();
  ctx.moveTo(mx - ux * gap, my - uy * gap - lensH * 0.18);
  ctx.quadraticCurveTo(mx, my - uy * gap - lensH * 0.34, mx + ux * gap, my + uy * gap - lensH * 0.18);
  ctx.stroke();
  // temples: near side full length, far side foreshortened
  const tLen = geom.eyeDist * 0.42;
  const leftT = dir > 0 ? 1 : dir < 0 ? 0.55 : 0.85;
  const rightT = dir > 0 ? 0.55 : dir < 0 ? 1 : 0.85;
  ctx.beginPath();
  ctx.moveTo(geom.left.x - ux * lensW * 0.52, geom.left.y - uy * lensW * 0.52);
  ctx.lineTo(
    geom.left.x - ux * (lensW * 0.52 + tLen * leftT),
    geom.left.y - uy * (lensW * 0.52 + tLen * leftT) - tLen * leftT * 0.12
  );
  ctx.moveTo(geom.right.x + ux * lensW * 0.52, geom.right.y + uy * lensW * 0.52);
  ctx.lineTo(
    geom.right.x + ux * (lensW * 0.52 + tLen * rightT),
    geom.right.y + uy * (lensW * 0.52 + tLen * rightT) - tLen * rightT * 0.12
  );
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ————— assembled PNG parts —————
// assets: { left, right, bridge, templeL, templeR, single } as HTMLImageElement|null
// pose: { roll, yaw, pitch } display-space; centerPx: smoothed eye midpoint px
// pxPerUnit: screen px per 1 IPD unit (smoothed eyeDist)
// layout: DEFAULT_LAYOUT merged with product calibration
const maskCache = new WeakMap();

export function drawAssembled(ctx, assets, pose, centerPx, pxPerUnit, layout = {}, opts = {}) {
  const L = { ...DEFAULT_LAYOUT, ...(layout || {}) };
  // per-product calibration carries only dy/w/h, so merge the lens box by key
  L.lensC = { ...DEFAULT_LAYOUT.lensC, ...((layout && layout.lensC) || {}) };
  L.bridge = { ...DEFAULT_LAYOUT.bridge, ...((layout && layout.bridge) || {}) };
  L.temple = { ...DEFAULT_LAYOUT.temple, ...((layout && layout.temple) || {}) };
  const color = opts.color || "#26221e";
  const P = makeProjector(pose || {});
  const yaw = pose?.yaw || 0;
  const nearLeft = opts.nearLeft != null ? !!opts.nearLeft : yaw >= 0; // yaw>0: nose screen-right, near cheek is screen-left
  // The far arm is behind the head: once the head turns it is occluded, so fade
  // it out instead of letting it project across the cheek.
  const hasFarOccluder = !!(opts.occluders && opts.occluders.far);
  const farAlpha = (side) => {
    const isFar = (nearLeft && side > 0) || (!nearLeft && side < 0);
    if (!isFar) return 1;
    const a = Math.abs(yaw);
    // The far arm is behind the head. Even at a slight turn it only shows a
    // sliver under the far rim, which reads as a second arm pointing the wrong
    // way — so it is gone by 0.18 rad, before the head gets in the way.
    if (a > 0.18) return 0;
    if (hasFarOccluder) return 1; // the head mask hides it exactly
    if (a <= 0.06) return 0.9;
    return Math.max(0, 0.9 * (1 - (a - 0.06) / 0.12));
  };

  const drawImg = (img, fr) => {
    if (!img || !img.complete || !img.naturalWidth) return false;
    // fr basis (X,Y) is in *unit* space; map image pixels through it:
    // setTransform maps (drawX, drawY) -> screen, so draw in image pixels
    // scaled by (wPx/iw, hPx/ih). Single scaling only — no double k.
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (![fr.a, fr.b, fr.c, fr.d, fr.e, fr.f, fr.wPx, fr.hPx].every(Number.isFinite)) return false;
    const su = fr.wPx / iw;
    const sv = fr.hPx / ih;
    // recover unit basis from fr (fr.a = X.x * k, etc.)
    const k = Math.max(1e-6, (fr.wPx || 1) / Math.max(1e-6, fr.wu || 1));
    const ux = fr.a / k;
    const uy = fr.b / k;
    const vx = fr.c / k;
    const vy = fr.d / k;
    ctx.save();
    ctx.setTransform(ux * su, uy * su, vx * sv, vy * sv, fr.e, fr.f);
    ctx.drawImage(img, -iw / 2, -ih / 2);
    ctx.restore();
    return true;
  };

  // Set only while the single frontal PNG is being drawn; carries hinge
  // position from calibration so drawTemple owns no layout knowledge.
  let singleHinge = null;

  // ————— temples: a real 3D arm, hinge → head side → ear → hook —————
  // The arm leaves the rim near its top-outer corner and runs BACK along the
  // head (z decreasing), so it foreshortens with yaw, tilts with pitch and
  // lands on the ear instead of floating in the frame plane.
  const templePoints = (side) => {
    const lensW = L.lensC.w;
    const lensH = L.lensC.h;
    // Single-view mode pins the hinge to the artwork itself: x on the outer
    // edge, y wherever the calibration puts it (armY, 0 = top, 1 = bottom).
    const hx = singleHinge
      ? side * singleHinge.halfW
      : side * (L.lensC.dx + lensW / 2 - 0.012); // rim outer edge, slight tuck
    const hy = singleHinge ? singleHinge.y : L.lensC.dy - 0.12 * lensH; // hinge just above the pupil line
    const k = L.temple.len / 0.7;
    return [
      [hx, hy, 0.02],                                 // hinge on the rim
      [hx + side * 0.030, hy + 0.100 * k, -0.22 * k], // arm leaves the frame
      [hx + side * 0.006, hy + 0.330 * k, -0.44 * k], // along the temple
      [hx - side * 0.020, hy + 0.560 * k, -0.60 * k], // ear canal / front of tragus
      [hx - side * 0.034, hy + 0.700 * k, -0.64 * k], // hook down behind the lobe
    ];
  };

  // Pitch is applied about the world X axis, so on a yawed head it turns the
  // arm's yaw-induced depth into height and flattens the hinge→ear line to a
  // stub. Shape the arm with yaw only, then shift it by the pose offset at the
  // hinge: it still rides the head, but keeps its length.
  const Py = makeProjector({ roll: pose?.roll || 0, yaw });
  const pitchShift = (() => {
    const a = P.point(-0.978, -0.144, 0.02); // far hinge, pose-independent enough
    const b = Py.point(-0.978, -0.144, 0.02);
    return { x: (a.x - b.x) * pxPerUnit, y: (a.y - b.y) * pxPerUnit };
  })();
  const projectTemple = (side) =>
    templePoints(side).map(([x, y, z]) => {
      const p = Py.point(x, y, z);
      return {
        x: centerPx.x + p.x * pxPerUnit + pitchShift.x,
        y: centerPx.y + p.y * pxPerUnit + pitchShift.y,
        s: p.s,
      };
    });

  // The temple artwork is a flat strip; at try-on scale (the arm is ~1 cm on
  // screen) slicing it along the path reads as mush. Draw a real arm instead:
  // a tapered metal ribbon that takes its colour from the artwork, with a
  // lit top edge, and keep the hinge badge from the art where it belongs.
  const colourCache = new Map();
  const templeColor = (img) => {
    if (!ready(img)) return color;
    const key = img.currentSrc || img.src || "t";
    if (colourCache.has(key)) return colourCache.get(key);
    let c = color;
    try {
      const cv = document.createElement("canvas");
      cv.width = 1;
      cv.height = 1;
      const c2 = cv.getContext("2d", { willReadFrequently: true });
      // middle of the bar: the strip is centred vertically, so sample the
      // centre row a third of the way in (past the hinge detail)
      c2.drawImage(img, Math.round(img.naturalWidth * 0.35), Math.round(img.naturalHeight * 0.5), 1, 1, 0, 0, 1, 1);
      const d = c2.getImageData(0, 0, 1, 1).data;
      if (d[3] > 8) c = `rgb(${d[0]},${d[1]},${d[2]})`;
    } catch {
      /* tainted canvas — keep the frame colour */
    }
    colourCache.set(key, c);
    return c;
  };

  const shade = (rgb, k) => {
    const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(rgb);
    if (!m) return rgb;
    const v = (i) => Math.max(0, Math.min(255, Math.round(+m[i] * k)));
    return `rgb(${v(1)},${v(2)},${v(3)})`;
  };

  // draw a tapered ribbon through pts, widths given per point
  const ribbon = (list, widths, fill, a) => {
    if (list.length < 2) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const q = list[i + 1] || p;
      const pr = list[i - 1] || p;
      const ax = q.x - pr.x;
      const ay = q.y - pr.y;
      const len = Math.hypot(ax, ay) || 1;
      const nx = -ay / len;
      const ny = ax / len;
      const hw = widths[i] / 2;
      if (i === 0) ctx.moveTo(p.x + nx * hw, p.y + ny * hw);
      else ctx.lineTo(p.x + nx * hw, p.y + ny * hw);
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const q = list[i + 1] || p;
      const pr = list[i - 1] || p;
      const ax = q.x - pr.x;
      const ay = q.y - pr.y;
      const len = Math.hypot(ax, ay) || 1;
      const nx = -ay / len;
      const ny = ax / len;
      ctx.lineTo(p.x - nx * (widths[i] / 2), p.y - ny * (widths[i] / 2));
    }
    ctx.closePath();
    ctx.fill();
    // round the ends so hinge / hook do not look cut
    for (let i = 0; i < list.length; i += list.length - 1) {
      ctx.beginPath();
      ctx.arc(list[i].x, list[i].y, widths[i] / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawTemple = (side, alpha = 1) => {
    if (alpha <= 0.02) return;
    const pts = projectTemple(side);
    const img = assets?.[side < 0 ? "templeL" : "templeR"];
    // an arm seen from the front is nearly edge-on and in shadow: use a
    // darkened metal, not the bright strip colour
    const metal = shade(templeColor(img), 0.62);
    const th = Math.max(2.5, pxPerUnit * 0.055); // ~3.5 mm arm
    // the near arm runs along the temple, in FRONT of the head: it must never
    // be masked. Only the far arm is genuinely behind the head.
    const behind = (nearLeft && side > 0) || (!nearLeft && side < 0);
    const hinge = pts[0];
    // head-on, the arm points away from the camera: only a stub of its drop is
    // visible. As the head turns the full hinge→ear line comes into view.
    const vis = Math.min(1, Math.abs(yaw) / 0.35);
    // stop short of the anchor: the landmark ear drops with head pitch (which
    // the 2D path cannot see), so an undamped end drags the arm into the jaw
    const kDrop = (0.12 + 0.88 * vis) * 0.78;
    // the landmark ear (brow→jaw blend) is authoritative: it follows pitch and
    // roll for free, so the arm lands on the tragus instead of always dropping
    const ear = opts.ears?.[side < 0 ? "left" : "right"];
    const ok = ear && Number.isFinite(ear.x) && Number.isFinite(ear.y);
    let ex = ok ? ear.x + side * 0.10 * pxPerUnit : pts[3].x;
    // the end must stay outward of the hinge, or the arm folds back over the lens
    if ((ex - hinge.x) * side < 0.02 * pxPerUnit) ex = hinge.x + side * 0.02 * pxPerUnit;
    const ey = ok ? ear.y : pts[3].y;
    // both axes damp toward the hinge when the head is square-on, otherwise a
    // horizontal sliver pokes out of the rim on a frontal face
    const end = { x: hinge.x + (ex - hinge.x) * kDrop, y: hinge.y + (ey - hinge.y) * kDrop };

    // ————— image arms —————
    // When the product ships arm artwork, draw the strip instead of the
    // synthetic ribbon. The near arm shows its outer face, the far arm its
    // inner face, so each side needs a front and a back upload.
    {
      const art = behind
        ? side < 0
          ? assets?.armLBack || assets?.templeL
          : assets?.armRBack || assets?.templeR
        : side < 0
          ? assets?.armLFront || assets?.templeL
          : assets?.armRFront || assets?.templeR;
      const dx = end.x - hinge.x;
      const dy = end.y - hinge.y;
      const len = Math.hypot(dx, dy);
      // a frontal head leaves only a stub; the ribbon reads better there than
      // a squashed 14:1 strip
      if (ready(art) && len > Math.max(6, 0.09 * pxPerUnit)) {
        const ux = dx / len;
        const uy = dy / len;
        // basis across the arm, always with a downward component so the strip
        // never lands upside down on a turned head
        let vx = -uy;
        let vy = ux;
        if (vy < 0) {
          vx = -vx;
          vy = -vy;
        }
        const aw = art.naturalWidth || 1;
        const ah = art.naturalHeight || 1;
        // keep the artwork's own aspect, capped so a chunky file cannot turn
        // into a slab across the cheek
        const thick = Math.max(2.5, Math.min((len * ah) / aw, 0.10 * pxPerUnit));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.setTransform(ux, uy, vx, vy, hinge.x, hinge.y);
        if (side > 0) {
          // the right arm is the left strip mirrored, hinge edge on the rim
          ctx.translate(len, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(art, 0, -thick / 2, len, thick);
        ctx.restore();
        // hinge plate: a small dark block where the arm meets the rim
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = shade(templeColor(img), 0.55);
        ctx.beginPath();
        ctx.arc(hinge.x, hinge.y, Math.max(2, thick * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }
    }

    const arm = [
      hinge,
      {
        x: hinge.x + (end.x - hinge.x) * 0.55 + side * 0.015 * pxPerUnit,
        y: hinge.y + (end.y - hinge.y) * 0.58,
      },
      end,
    ];
    // the hook always curls DOWN behind the lobe, whatever the pose did to the
    // ear anchor itself
    if (typeof window !== "undefined" && window.__TRYON_DEBUG && !behind) {
      window.__tryonTemple = { side, hinge, end, th, ppu: pxPerUnit, yaw, kDrop, vis, ear: ok ? { x: ear.x, y: ear.y } : null };
    }
    const hook = [
      end,
      { x: end.x + side * 0.004 * pxPerUnit, y: end.y + 0.045 * pxPerUnit },
      { x: end.x - side * 0.012 * pxPerUnit, y: end.y + 0.105 * pxPerUnit },
    ];
    // sample the arm as a smooth curve so the taper and the fade are even
    const n = 6;
    const samples = [];
    const [p0, p1, p2] = arm;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const w0 = (1 - u) * (1 - u);
      const w1 = 2 * (1 - u) * u;
      const w2 = u * u;
      samples.push({
        x: p0.x * w0 + p1.x * w1 + p2.x * w2,
        y: p0.y * w0 + p1.y * w1 + p2.y * w2,
      });
    }
    // the far end of the arm turns away from the camera and slides behind the
    // head, so fade it out instead of ending on a hard cut
    for (let i = 0; i < samples.length - 1; i++) {
      const u = i / (samples.length - 1);
      const cover = behind
        ? Math.max(occAlphaAt(samples[i + 1].x, samples[i + 1].y), occAlphaAt(samples[i].x, samples[i].y))
        : 0;
      const a1 = alpha * (u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45 * 0.85) * (1 - 0.95 * cover);
      const w1 = th * (1 - 0.34 * u);
      const w2 = th * (1 - 0.34 * (u + 1 / (samples.length - 1)));
      ribbon([samples[i], samples[i + 1]], [w1, w2], metal, a1);
    }
    // hinge plate: a small dark block where the arm meets the rim
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = shade(metal, 0.55);
    ctx.beginPath();
    ctx.arc(arm[0].x, arm[0].y, th * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (hook) {
      const a = Math.abs(yaw);
      const vis = Math.max(0, Math.min(1, (a - 0.28) / 0.22));
      if (vis > 0.02) {
        const cov = behind
          ? Math.max(occAlphaAt(hook[1].x, hook[1].y), occAlphaAt(hook[2].x, hook[2].y))
          : 0;
        ribbon(hook, [th * 0.62, th * 0.55, th * 0.36], metal, alpha * vis * 0.9 * (1 - 0.9 * cov));
      }
    }
  };

  const ready = (img) => !!(img && img.complete && img.naturalWidth);
  // Restore the head over the arm: the caller pre-masks the photo with the
  // hair / person segmentation, so one drawImage hides exactly the pixels the
  // temple should be behind.
  const paintOcc = (which) => {
    const o = opts.occluders && opts.occluders[which];
    if (!o) return;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.drawImage(o, 0, 0, w, h);
    ctx.restore();
  };
  // How much head/hair covers a point, 0..1: lets the arm melt into the
  // silhouette instead of stopping dead on the cheek. The mask is read back
  // once per photo (cheap, stable) and then sampled from memory — a per-point
  // getImageData in the rAF loop would stall the compositor.
  const occAlphaAt = (x, y) => {
    const o = opts.occluders && opts.occluders.far;
    if (!o) return 0;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (!(w > 0 && h > 0)) return 0;
    let m = maskCache.get(o);
    if (m === undefined) {
      try {
        const pc = document.createElement("canvas");
        pc.width = o.width;
        pc.height = o.height;
        const pctx = pc.getContext("2d", { willReadFrequently: true });
        pctx.drawImage(o, 0, 0);
        m = { d: pctx.getImageData(0, 0, o.width, o.height).data, w: o.width, h: o.height };
      } catch {
        m = null;
      }
      maskCache.set(o, m);
    }
    if (!m) return 0;
    const sx = Math.min(m.w - 1, Math.max(0, Math.round((x / w) * m.w)));
    const sy = Math.min(m.h - 1, Math.max(0, Math.round((y / h) * m.h)));
    return m.d[(sy * m.w + sx) * 4 + 3] / 255;
  };

  // Render mode: "auto" uses the lens kit when it exists, "single" forces the
  // front view + image arms even if lens parts are uploaded, "kit" forces the
  // 5-part kit.
  const kitReady = !!(assets && (ready(assets.left) || ready(assets.right)));
  const hasParts = layout?.mode === "single" ? false : kitReady;

  // ————— profile: the far lens is behind the nose and the far arm behind the
  // head, so a real side view shows one lens and one arm. The projected pair
  // collapses onto the visible eye, so place the surviving lens on that eye.
  if (hasParts && Math.abs(yaw) > 0.78 && opts.nearEye) {
    const back = nearLeft ? -1 : 1;
    const img = nearLeft ? assets.left : assets.right;
    const tImg = assets[nearLeft ? "templeL" : "templeR"];
    const cos = Math.max(0.18, Math.cos(Math.min(Math.abs(yaw), 1.45)));
    const w = L.lensC.w * pxPerUnit * cos;
    const h = L.lensC.h * pxPerUnit;
    const cx = opts.nearEye.x;
    const cy = opts.nearEye.y + L.lensC.dy * pxPerUnit * 0.35;
    const rot = pose?.roll || 0;
    if (ready(img)) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    const metal = shade(templeColor(tImg), 0.62);
    const th = Math.max(2, pxPerUnit * 0.034);
    const hinge = { x: cx + back * (w / 2) * 0.92, y: cy - h * 0.30 + 0 };
    const ear = opts.ears?.[back < 0 ? "left" : "right"];
    const end = ear && Number.isFinite(ear.x) ? ear : { x: hinge.x + back * 0.42 * pxPerUnit, y: hinge.y + 0.05 * pxPerUnit };
    ribbon(
      [hinge, { x: hinge.x + (end.x - hinge.x) * 0.5, y: hinge.y + (end.y - hinge.y) * 0.5 - 0.004 * pxPerUnit }, end],
      [th, th * 0.9, th * 0.62],
      metal,
      0.95
    );
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = shade(metal, 0.55);
    ctx.beginPath();
    ctx.arc(hinge.x, hinge.y, th * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return "parts";
  }

  const order = [];
  // far temple → head mask → frame → near temple → hair mask
  order.push({ kind: "temple", side: nearLeft ? 1 : -1, back: true });
  order.push({ kind: "occ", which: "far" });
  order.push({ kind: "lenses" });
  order.push({ kind: "bridge" });
  // the near arm is in FRONT of the sideburn/hairline — nothing may cover it
  order.push({ kind: "temple", side: nearLeft ? -1 : 1, back: false });

  // single frontal PNG mode (only when the file is actually loaded).
  // The PNG is a 1:1 slice of unit space (1000 px per IPD) with the eye line
  // at 47.4% of its height, so it is drawn at its natural size and aligned on
  // the eye line — never stretched into a fixed 1.90 x 0.78 box.
  if (!hasParts && layout?.mode !== "kit" && ready(assets?.single)) {
    const ih = assets.single.naturalHeight;
    const wU = assets.single.naturalWidth / 1000;
    const hU = ih / 1000;
    const cy = (0.5 - EYE_FRAC) * hU;
    const fr = P.frame(0, cy, 0, wU, hU, centerPx.x, centerPx.y, pxPerUnit);
    // Arm height on the artwork: 0 = top edge, 1 = bottom edge, default the
    // eye line. This is what lets the arms be placed at any height of the
    // single view instead of only where the shape renderer guessed.
    const armY = Number.isFinite(L.armY) ? Math.min(1, Math.max(0, L.armY)) : EYE_FRAC;
    const templeX = Number.isFinite(L.templeX) ? Math.min(1, Math.max(0.5, L.templeX)) : 1;
    const halfW = Math.min(wU / 2 - 0.012, (wU / 2 - 0.03) * templeX);
    singleHinge = { halfW, y: (armY - EYE_FRAC) * hU };
    // far arm → head mask → back side → front → near arm → hair mask
    drawTemple(nearLeft ? 1 : -1, farAlpha(nearLeft ? 1 : -1));
    paintOcc("far");
    if (ready(assets?.singleBack)) {
      // Two-sided front: the back artwork sits a couple of millimetres behind
      // and a hair larger, so its rim edge shows around the front — the frame
      // reads as a solid object instead of a sticker. Seen from the far side
      // of a turn it is what the eye gets.
      const fb = P.frame(0, cy, -0.02, wU * 1.012, hU * 1.012, centerPx.x, centerPx.y, pxPerUnit);
      drawImg(assets.singleBack, fb);
    }
    drawImg(assets.single, fr);
    drawTemple(nearLeft ? -1 : 1, farAlpha(nearLeft ? -1 : 1));
    singleHinge = null;
    return "single";
  }

  if (!hasParts) return "none";

  const lensW = L.lensC.w;
  const lensH = L.lensC.h;
  for (const step of order) {
    if (step.kind === "lenses") {
      const fl = P.frame(-L.lensC.dx, L.lensC.dy, 0, lensW, lensH, centerPx.x, centerPx.y, pxPerUnit);
      const fr2 = P.frame(L.lensC.dx, L.lensC.dy, 0, lensW, lensH, centerPx.x, centerPx.y, pxPerUnit);
      // past ~46 degrees the far lens is entirely behind the nose bridge; the
      // photo cannot occlude it for us, so stop drawing it (a real profile
      // shows one lens and the arm)
      const hideFar = Math.abs(yaw) > 0.8;
      if (nearLeft) {
        if (!hideFar) drawImg(assets.right, fr2);
        drawImg(assets.left, fl);
      } else {
        if (!hideFar) drawImg(assets.left, fl);
        drawImg(assets.right, fr2);
      }
    } else if (step.kind === "bridge") {
      if (assets.bridge) {
        // the bridge art may carry headroom above and below the bar, so take the
        // quad's height from the PNG aspect: 300x100 art keeps h = 0.10
        const b = assets.bridge;
        const bh = b.naturalWidth ? L.bridge.w * (b.naturalHeight / b.naturalWidth) : L.bridge.h;
        const fb = P.frame(0, L.bridge.dy, L.bridge.z, L.bridge.w, bh, centerPx.x, centerPx.y, pxPerUnit);
        drawImg(assets.bridge, fb);
      }
    } else if (step.kind === "temple") {
      drawTemple(step.side, farAlpha(step.side));
    } else if (step.kind === "occ") {
      paintOcc(step.which);
    }
  }
  return "parts";
}
