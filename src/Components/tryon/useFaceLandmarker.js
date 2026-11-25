"use client";
import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Self-hosted: the CDN pair (jsdelivr wasm + storage.googleapis model) is a
// hard dependency on two third-party hosts, and when either is blocked the 2D
// try-on sits on a spinner forever while the 3D path keeps working (its assets
// ship in /public/facefilter). Everything below now comes from
// /public/mediapipe, pinned — no `@latest` drift either.
const VISION_PATH = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/face_landmarker.task";

const cache = {};

// GPU first: the CPU (XNNPACK) delegate costs 30-60 ms per frame on a laptop,
// which is what made the frame trail the head. Chrome falls back cleanly.
async function createLandmarker(vision, mode, withMatrix, numFaces, delegate) {
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL_PATH, delegate },
    runningMode: mode,
    numFaces,
    ...(withMatrix ? { outputFacialTransformationMatrixes: true } : {}),
  });
}

async function getLandmarker(mode, withMatrix, numFaces = 1) {
  const key = `${mode}_${withMatrix ? "MATRIX" : "PLAIN"}_${numFaces}`;
  if (!cache[key]) {
    cache[key] = (async () => {
      const vision = await FilesetResolver.forVisionTasks(VISION_PATH);
      try {
        return await createLandmarker(vision, mode, withMatrix, numFaces, "GPU");
      } catch {
        // no WebGL2 / no float16 support: fall back to the CPU graph
        return createLandmarker(vision, mode, withMatrix, numFaces, "CPU");
      }
    })();
  }
  return cache[key];
}

async function getLandmarkerLegacy(mode) {
  return getLandmarker(mode, false);
}

/**
 * Shared FaceLandmarker loader (singleton per running mode).
 * Returns stable helpers; never re-creates the model.
 */
export function useFaceLandmarker() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return {
    // classic landmark-only instances (shared with older code paths)
    forVideo: () => getLandmarkerLegacy("VIDEO"),
    forImage: () => getLandmarkerLegacy("IMAGE"),
    // pose instances: also output the facial transformation matrix
    forVideoPose: () => getLandmarker("VIDEO", true),
    forImagePose: () => getLandmarker("IMAGE", true),
    // stills: a group shot should still find the wearer, so look for a few
    // faces and let the caller pick (video stays at 1 for frame budget)
    forImagePoseMulti: (n = 4) => getLandmarker("IMAGE", true, n),
  };
}

// Landmark indices (MediaPipe FaceMesh topology)
export const IDX = {
  leftOuter: 33,
  leftInner: 133,
  rightInner: 362,
  rightOuter: 263,
  noseTip: 1,
  irisL: [468, 469, 470, 471, 472],
  irisR: [473, 474, 475, 476, 477],
  // side-of-head points: 127/356 sit on the outer brow, 234/454 on the jaw
  // below the ear — the ear canal is between them, so the anchor is a blend
  templeL: 127,
  templeR: 356,
  jawL: 234,
  jawR: 454,
  // vertical face extent: yaw-invariant, so it survives a turn where the
  // eye distance collapses (profile)
  forehead: 10,
  chin: 152,
};

function meanPoint(pts, indices) {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const i of indices) {
    const p = pts[i];
    if (!p) return null;
    x += p.x;
    y += p.y;
    n++;
  }
  if (!n) return null;
  return { x: x / n, y: y / n };
}

/**
 * Decompose the facial transformation matrix into head pose.
 * `data` is the 16-float column-major matrix (three.js convention —
 * matches how MediaPipe web demos feed it straight into Matrix4.fromArray).
 * Returns angles in IMAGE space (x right, y down, unmirrored frame):
 *   roll    – in-plane rotation, radians
 *   yawMag  – out-of-plane turn magnitude, radians (sign resolved separately
 *             from landmarks, which is unambiguous in display space)
 *   pitchMag– up/down tilt magnitude, radians
 */
export function poseFromMatrix(data) {
  try {
    if (!data || data.length < 16) return null;
    const d = data;
    const n0 = Math.hypot(d[0], d[1], d[2]);
    const n1 = Math.hypot(d[4], d[5], d[6]);
    const n2 = Math.hypot(d[8], d[9], d[10]);
    if (!n0 || !n1 || !n2 || n0 < 1e-6 || n1 < 1e-6 || n2 < 1e-6) return null;
    // canonical X axis imaged on screen → screen roll
    const roll = Math.atan2(d[1] / n0, d[0] / n0);
    // canonical Z axis tilt away from the viewer → yaw / pitch magnitudes
    const zx = d[8] / n2;
    const zy = d[9] / n2;
    const zz = Math.abs(d[10] / n2);
    const yawMag = Math.atan2(Math.abs(zx), Math.max(zz, 1e-6));
    const pitchMag = Math.atan2(Math.abs(zy), Math.max(zz, 1e-6));
    if (!isFinite(roll) || !isFinite(yawMag) || !isFinite(pitchMag)) return null;
    // face normal tilting up the screen (zy < 0) means the chin is up
    const pitch = -Math.sign(zy) * pitchMag;
    return { roll, yawMag, pitchMag, pitch };
  } catch {
    return null;
  }
}

/** Mirror an image-space angle into our mirrored selfie display space. */
export function mirrorAngle(a) {
  return -a;
}

/** Convert normalized landmarks to canvas pixels, mirrored for selfie view. */
export function toDisplay(landmarks, width, height) {
  return landmarks.map((p) => ({ x: (1 - p.x) * width, y: p.y * height }));
}

/**
 * Derive glasses geometry from eye landmarks (already in display pixels).
 * PRIMARY: iris centers (pupils) — optical centers belong on pupils, and the
 * iris ring is the most reliably localized structure (glare/frame-proof).
 * FALLBACK: side-agnostic eye-corner midpoints when iris data is missing.
 */
export function glassesGeometry(pts) {
  try {
    const irisL = meanPoint(pts, IDX.irisL);
    const irisR = meanPoint(pts, IDX.irisR);
    if (irisL && irisR) {
      return irisGeometry(pts, irisL, irisR);
    }
    return cornerGeometry(pts);
  } catch {
    return null;
  }
}

function finishGeom(cx, cy, angle, eyeDist, lensW, left, right, method, ears) {
  // push lens centers slightly outward so rims sit on the temples,
  // and drop them a touch below the pupils like real frames sit
  const push = 0.07 * eyeDist;
  const drop = 0.06 * eyeDist;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  // screen-down perpendicular to the eye axis
  const dxn = -uy;
  const dyn = ux;
  // 127/356 are anatomical (subject's right/left), but the selfie view is
  // mirrored, so in display space they land on the opposite screen side. The
  // caller always means SCREEN side, so pin each anchor to the nearer lens.
  let eL = ears?.left || null;
  let eR = ears?.right || null;
  if (eL && eR && Math.abs(eL.x - left.x) > Math.abs(eR.x - left.x)) {
    const t = eL;
    eL = eR;
    eR = t;
  }
  return {
    cx,
    cy,
    angle,
    eyeDist,
    lensW,
    method,
    left: { x: left.x - ux * push + dxn * drop, y: left.y - uy * push + dyn * drop },
    right: { x: right.x + ux * push + dxn * drop, y: right.y + uy * push + dyn * drop },
    ears: { left: eL, right: eR },
  };
}

/**
 * Ear anchor for the temple arms. 127/356 sit on the outer brow and 234/454 on
 * the jaw below the ear, so the tragus is interpolated between them — that is
 * where a real arm rests. Falls back to the brow point when either is missing.
 */
function earAnchor(pts, templeIdx, jawIdx) {
  const t = pts[templeIdx];
  const j = pts[jawIdx];
  if (!t) return null;
  if (!j) return t;
  // 0.75 of the way from the brow down the side of the head: the tragus sits
  // just above the jaw point, and a shallower blend parks the arm over the brow
  return { x: t.x + (j.x - t.x) * 0.75, y: t.y + (j.y - t.y) * 0.75 };
}

function irisGeometry(pts, irisL, irisR) {
  // order by screen x — immune to convention flips
  const left = irisL.x <= irisR.x ? irisL : irisR;
  const right = irisL.x <= irisR.x ? irisR : irisL;
  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  const eyeDist = Math.hypot(right.x - left.x, right.y - left.y);
  if (!eyeDist || eyeDist < 8) return null;
  const angle = Math.atan2(right.y - left.y, Math.abs(right.x - left.x));
  // lens width ~0.9x true IPD matches real frame proportions
  return finishGeom(cx, cy, angle, eyeDist, eyeDist * 0.9, left, right, "iris", {
    left: earAnchor(pts, IDX.templeL, IDX.jawL),
    right: earAnchor(pts, IDX.templeR, IDX.jawR),
  });
}

function cornerGeometry(pts) {
  const a = pts[IDX.leftOuter];
  const b = pts[IDX.leftInner];
  const c = pts[IDX.rightInner];
  const d = pts[IDX.rightOuter];
  if (!a || !b || !c || !d) return null;
  // order the two eye clusters by screen x — immune to convention flips
  const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const m2 = { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
  const left = m1.x <= m2.x ? m1 : m2;
  const right = m1.x <= m2.x ? m2 : m1;
  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  // widest honest spread across all four corners
  const xs = [a.x, b.x, c.x, d.x];
  const spanX = Math.max(...xs) - Math.min(...xs);
  const eyeDist = Math.max(Math.hypot(right.x - left.x, right.y - left.y), spanX);
  if (!eyeDist || eyeDist < 8) return null;
  // dx is guaranteed >= 0 after ordering → angle near 0, never ±PI
  const angle = Math.atan2(right.y - left.y, Math.abs(right.x - left.x));
  return finishGeom(cx, cy, angle, eyeDist, eyeDist * 0.6, left, right, "corners", {
    left: earAnchor(pts, IDX.templeL, IDX.jawL),
    right: earAnchor(pts, IDX.templeR, IDX.jawR),
  });
}
