"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Camera, ImagePlus, Download, RefreshCw, Glasses, Bug } from "lucide-react";
import { segmentOccluders } from "./useFaceSegmenter";
import { useFaceLandmarker, toDisplay, glassesGeometry, poseFromMatrix, mirrorAngle, IDX } from "./useFaceLandmarker";
import { drawGlasses, drawAssembled, frameColor } from "./drawGlasses";
import { SERVER_URL } from "@/Api/adminApi";

// Flip this to -1 if up/down ever feels inverted on device testing.
const PITCH_SIGN = 1;

// forehead (10) → chin (152) measured in IPD units; median of the pose set
// forehead(10) → chin(152) in IPD units. Measured on the frontal reference
// head: 456 px of face height against a 160 px iris distance = 2.85. Using a
// smaller constant made the head-based scale over-read by ~25% past 0.25 rad
// of yaw, so the frame visibly grew as soon as the head started to turn.
const FACE_H_UNITS = 2.85;

// Resolve a product's try-on assets to absolute URLs (or nulls).
function tryonUrls(product) {
  const parts = product?.tryOnParts && typeof product.tryOnParts === "object" ? product.tryOnParts : null;
  const file = (f) => (f ? `${SERVER_URL}/img/tryon/${f}` : null);
  return {
    single: file(product?.tryOnImage),
    parts: parts
      ? {
          left: file(parts.left),
          right: file(parts.right),
          bridge: file(parts.bridge),
          templeL: file(parts.templeL),
          templeR: file(parts.templeR),
        }
      : null,
    calibration: (parts && parts.calibration) || {},
  };
}

// Module-level image cache: url -> HTMLImageElement (loading or ready)
// crossOrigin MUST be set before src, otherwise drawing the image taints
// the canvas and toDataURL (capture) throws a SecurityError.
const imgCache = new Map();
function getImg(url) {
  if (!url) return null;
  let img = imgCache.get(url);
  if (!img) {
    img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    imgCache.set(url, img);
  }
  return img;
}

function layoutFromCal(active) {
  const c = active?.tryOnParts?.calibration || {};
  const num = (v, d) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : d;
  };
  const drop = num(c.drop, 0.06);
  return {
    lensC: { dy: drop, w: num(c.lensW, 0.9), h: num(c.lensH, 0.62) },
    // the bridge is anchored to the lens centre, not the eye line, so it can
    // never drift off the rims when `drop` is calibrated away from 0.06
    bridge: { dy: drop - 0.08, w: 0.3, h: 0.1, z: 0.06 },
    temple: { len: num(c.templeLen, 0.7), droop: 0.12, z1: -0.55 },
  };
}

/**
 * 2D mirror try-on (phase 1: procedural shapes).
 * Shows whenever the product has a shape — no 3D models needed.
 */
export default function MirrorTryOn({ product, items = [], onClose }) {
  const { t, i18n } = useTranslation();
  const { forVideoPose, forImagePoseMulti } = useFaceLandmarker();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const nearRef = useRef({ sign: true });
  const earsRef = useRef(null);
  const streamRef = useRef(null);
  const smoothRef = useRef(null);
  const missRef = useRef(0);
  const lastVideoTime = useRef(-1);

  const [active, setActive] = useState(product);
  const [mode, setMode] = useState("camera"); // camera | selfie
  const [occluders, setOccluders] = useState(null);
  const occludersRef = useRef(null);
  occludersRef.current = occluders;
  const [ready, setReady] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [camError, setCamError] = useState("");
  const [selfie, setSelfie] = useState(null); // { img, landmarks }
  const [nudge, setNudge] = useState({ dx: 0, dy: 0, s: 1 });
  const nudgeRef = useRef(nudge);
  nudgeRef.current = nudge;
  // manual calibration in eyeDist units (persists across sessions)
  const [calib, setCalib] = useState(() => {
    try {
      const raw = localStorage.getItem("mhs-tryon-calib-v2");
      if (raw) {
        const p = JSON.parse(raw);
        return { dx: Number(p.dx) || 0, dy: Number(p.dy) || 0 };
      }
    } catch {}
    return { dx: 0, dy: 0 };
  });
  const calibRef = useRef(calib);
  calibRef.current = calib;
  const eyeDistRef = useRef(0);
  const dbgRef = useRef(null);
  const [debug, setDebug] = useState(false);
  const debugRef = useRef(false);
  debugRef.current = debug;

  // debug overlay: landmark dots + live geometry readout
  const drawDebug = (ctx, w, h) => {
    const snap = dbgRef.current;
    if (!snap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    // key landmarks with index labels
    const dot = (p, color, r = 3, tag = "") => {
      if (!p) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (tag) {
        ctx.font = `${10 * dpr}px monospace`;
        ctx.fillStyle = color;
        ctx.fillText(tag, p.x + 5 * dpr, p.y - 5 * dpr);
      }
    };
    const P = snap.pts || {};
    dot(P.lo, "#22ff66", 3, "33");
    dot(P.li, "#22ff66", 3, "133");
    dot(P.ri, "#22ff66", 3, "362");
    dot(P.ro, "#22ff66", 3, "263");
    dot(P.nose, "#ff4444", 4, "1");
    dot(P.mouthL, "#4488ff", 3, "61");
    dot(P.mouthR, "#4488ff", 3, "291");
    dot(P.templeL, "#ff9f1c", 3, "127");
    dot(P.templeR, "#ff9f1c", 3, "356");
    dot(P.bridge, "#c77dff", 3, "168");
    dot(P.forehead, "#9bf6ff", 3, "10");
    dot(P.chin, "#9bf6ff", 3, "152");
    dot(P.irisL, "#00e5ff", 4, "L");
    dot(P.irisR, "#00e5ff", 4, "R");
    // lens centers
    dot(snap.left, "#ffe14d", 4);
    dot(snap.right, "#ffe14d", 4);
    // readout
    ctx.font = `${12 * dpr}px monospace`;
    const fmt = (v) => (v === null || v === undefined ? "?" : Number(v).toFixed(2));
    const lines = [
      `eyeDist ${snap.eyeDist?.toFixed(0)}px via ${snap.method || "?"}  yaw ${fmt(snap.yaw)}`,
      `mRoll ${fmt(snap.mRoll)}  gRoll ${fmt(snap.gRoll)}  out ${fmt(snap.roll)}`,
      `calib dx ${(snap.calib?.dx ?? 0).toFixed(3)} dy ${(snap.calib?.dy ?? 0).toFixed(3)}  size ${(snap.size ?? 1).toFixed(2)}`,
      `fh ${(snap.fh ?? 0).toFixed(0)}px  ppu ${(snap.ppu ?? 0).toFixed(0)}  pitch ${fmt(snap.pitch)}`,
    ];
    const pad = 8 * dpr;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.fillRect(pad, pad, tw + pad * 2, lines.length * 18 * dpr + pad * 2);
    ctx.fillStyle = "#7CFC00";
    lines.forEach((l, i) => ctx.fillText(l, pad * 2, pad * 2 + (i + 1) * 15 * dpr));
    ctx.restore();
  };
  const [dragging, setDragging] = useState(false);
  const dragFrom = useRef(null);

  const list = items && items.length ? items : [product].filter(Boolean);
  const lang = i18n.language;

  // try-on assets for the active product (single PNG and/or 5-part kit)
  const urls = useMemo(() => tryonUrls(active), [active]);
  const layout = useMemo(() => layoutFromCal(active), [active]);
  const resolveAssets = useCallback(() => {
    if (!urls.parts && !urls.single) return null;
    const out = { single: getImg(urls.single) };
    if (urls.parts) {
      out.left = getImg(urls.parts.left);
      out.right = getImg(urls.parts.right);
      out.bridge = getImg(urls.parts.bridge);
      out.templeL = getImg(urls.parts.templeL);
      out.templeR = getImg(urls.parts.templeR);
    }
    return out;
  }, [urls]);

  useEffect(() => setActive(product), [product]);

  const titleOf = (p) =>
    p?.titleTranslations?.[lang?.startsWith("ar") ? "ar" : lang?.startsWith("de") ? "de" : "en"] ||
    p?.titleTranslations?.en ||
    p?.title ||
    "";

  // ---- camera lifecycle ----
  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const fitRef = useRef({ key: "", w: 0, h: 0 });

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return { w: 0, h: 0 };
    const parent = canvas.parentElement;
    const cw = parent ? parent.clientWidth : 640;
    let vw = 640;
    let vh = 480;
    if (mode === "camera" && video?.videoWidth) {
      vw = video.videoWidth;
      vh = video.videoHeight;
    } else if (mode === "selfie" && selfie?.img) {
      vw = selfie.img.naturalWidth || selfie.img.width;
      vh = selfie.img.naturalHeight || selfie.img.height;
    }
    // only touch canvas dimensions when something actually changed —
    // resetting width every frame reallocates the buffer and forces layout
    const key = `${mode}|${cw}|${vw}|${vh}`;
    const scale = cw / vw;
    const w = Math.round(cw);
    const h = Math.round(vh * scale);
    if (fitRef.current.key !== key) {
      fitRef.current = { key, w, h };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }
    return { w: canvas.width, h: canvas.height };
  }, [mode, selfie]);

  // ---- main render loop (camera) ----
  useEffect(() => {
    if (mode !== "camera") return;
    let cancelled = false;
    setReady(false);
    setCamError("");

    const start = async () => {
      try {
        await forVideoPose(); // warm up model (with pose matrix output)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play().catch(() => {});
        const lm = await forVideoPose();
        if (cancelled) return;
        setReady(true);

        const color = frameColor(active);
        const shape = active?.shape || "round";
        const tinted = active?.glassesType === "sunglasses";
        const poseRef = { yaw: 0 }; // smoothed signed yaw (display space)
        const pitchBaseRef = { v: null }; // slow frontal baseline for pitch sign

        const loop = async () => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (!canvas || !video.videoWidth) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          const { w, h } = fitCanvas();
          const ctx = canvas.getContext("2d");
          // mirror selfie
          ctx.save();
          ctx.clearRect(0, 0, w, h);
          ctx.translate(w, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, w, h);
          ctx.restore();

          let geom = null;
          let pose = null; // { roll, yaw } in display space
          try {
            if (video.currentTime !== lastVideoTime.current) {
              lastVideoTime.current = video.currentTime;
              const res = lm.detectForVideo(video, performance.now());
              const face = res?.faceLandmarks?.[0];
              if (face) {
                const disp = toDisplay(face, w, h);
                geom = glassesGeometry(disp);
                // snapshot for debug overlay (raw landmarks + pose)
                dbgRef.current = {
                  show: debugRef.current,
                  pts: {
                    lo: disp[IDX.leftOuter],
                    li: disp[IDX.leftInner],
                    ri: disp[IDX.rightInner],
                    ro: disp[IDX.rightOuter],
                    nose: disp[IDX.noseTip],
                    mouthL: disp[61],
                    mouthR: disp[291],
                    irisL: disp[470],
                    irisR: disp[475],
                    templeL: disp[127],
                    templeR: disp[356],
                    bridge: disp[168],
                    forehead: disp[10],
                    chin: disp[152],
                  },
                  calib: { ...calibRef.current },
                  size: nudgeRef.current.s,
                  eyeDist: geom?.eyeDist,
                  yaw: null,
                  roll: null,
                };
                // head pose from the transformation matrix (full-mesh fit)
                const m = res?.facialTransformationMatrixes?.[0]?.data;
                const mp = poseFromMatrix(m);
                if (mp && geom) {
                  const mRoll = mirrorAngle(mp.roll);
                  // self-validating: trust the matrix only when it agrees
                  // with the landmark roll (protects against layout drift)
                  let dR = mRoll - geom.angle;
                  dR = Math.atan2(Math.sin(dR), Math.cos(dR));
                  const roll = Math.abs(dR) < 0.35 ? 0.7 * mRoll + 0.3 * geom.angle : geom.angle;
                  // yaw sign from nose tip vs eye midpoint (unambiguous on screen).
                  // Mirrored selfie: nose screen-RIGHT of midpoint = turned to
                  // your right = your left cheek forward = near side screen-left.
                  // Frontal deadband: inside ±3.5% of eyeDist the sign would
                  // flicker with noise, so hold yaw at 0 there.
                  const nose = disp[IDX.noseTip];
                  const midX = (geom.left.x + geom.right.x) / 2;
                  const noseOff = nose ? nose.x - midX : 0;
                  // Hard deadband used to snap yaw between 0 and full magnitude,
                  // which pulsed the perspective (and the frame size) as the nose
                  // crossed it. Ramp in over a band instead: same frontal
                  // stability, no step.
                  const offU = geom.eyeDist > 0 ? Math.abs(noseOff) / geom.eyeDist : 0;
                  const yawRamp = Math.min(1, Math.max(0, (offU - 0.030) / 0.045));
                  const yawSigned =
                    (noseOff > 0 ? 1 : -1) * Math.min(mp.yawMag, 1.1) * yawRamp;
                  // pitch sign from vertical compression vs a slow frontal baseline
                  const mouth = disp[61] && disp[291] ? { x: (disp[61].x + disp[291].x) / 2, y: (disp[61].y + disp[291].y) / 2 } : null;
                  const eyeMidY = (geom.left.y + geom.right.y) / 2;
                  let pitch = 0;
                  if (mouth && geom.eyeDist > 0) {
                    const r = Math.abs(mouth.y - eyeMidY) / geom.eyeDist;
                    if (pitchBaseRef.v === null) pitchBaseRef.v = r;
                    else pitchBaseRef.v += (r - pitchBaseRef.v) * 0.03;
                    pitch = PITCH_SIGN * Math.max(-0.5, Math.min(0.5, (pitchBaseRef.v - r) * 2.5));
                  }
                  pose = { roll, yaw: yawSigned, pitch };
                }
              }
            } else if (smoothRef.current) {
              geom = smoothRef.current.raw || null;
              pose = smoothRef.current.pose || null;
            }
          } catch {
            geom = null;
            pose = null;
          }

          if (geom) {
            missRef.current = 0;
            const prev = smoothRef.current;
            // Adaptive (One-Euro-lite) smoothing: heavy when still, responsive
            // when moving. k eases from base toward base+span with speed.
            const adaptK = (speed, base, span, scale) => {
              const t = Math.min(1, Math.max(0, speed / Math.max(1e-6, scale)));
              return base + span * t * t;
            };
            const px = geom.eyeDist;
            let cx = prev?.cx ?? geom.cx;
            let cy = prev?.cy ?? geom.cy;
            if (prev) {
              const kPos = adaptK(Math.hypot(geom.cx - prev.cx, geom.cy - prev.cy), 0.12, 0.5, px * 0.06);
              cx = prev.cx + (geom.cx - prev.cx) * kPos;
              cy = prev.cy + (geom.cy - prev.cy) * kPos;
              // deadband: ignore sub-pixel jitter
              if (Math.hypot(cx - prev.cx, cy - prev.cy) < 0.8) {
                cx = prev.cx;
                cy = prev.cy;
              }
            }
            let dA = (pose ? pose.roll : geom.angle) - (prev?.angle ?? (pose ? pose.roll : geom.angle));
            dA = Math.atan2(Math.sin(dA), Math.cos(dA)); // wrap to [-PI, PI]
            const kAng = prev ? adaptK(Math.abs(dA), 0.1, 0.45, 0.03) : 1;
            let angle = (prev?.angle ?? (pose ? pose.roll : geom.angle) - dA) + dA * kAng;
            angle = Math.max(-0.6, Math.min(0.6, angle)); // clamp wild rotations
            // smooth signed yaw + pitch for perspective
            const targetYaw = pose ? pose.yaw : 0;
            const kYaw = prev ? adaptK(Math.abs(targetYaw - (prev.yaw ?? targetYaw)), 0.08, 0.3, 0.05) : 1;
            let yaw = (prev?.yaw ?? targetYaw) + (targetYaw - (prev?.yaw ?? targetYaw)) * kYaw;
            yaw = Math.max(-1.1, Math.min(1.1, yaw));
            const targetPitch = pose && pose.pitch ? pose.pitch : 0;
            const kPitch = prev ? adaptK(Math.abs(targetPitch - (prev?.pitch ?? targetPitch)), 0.1, 0.4, 0.06) : 1;
            let pitch = (prev?.pitch ?? targetPitch) + (targetPitch - (prev?.pitch ?? targetPitch)) * kPitch;
            pitch = Math.max(-0.5, Math.min(0.5, pitch));
            const dScale = Math.abs(geom.eyeDist - (prev?.eyeDist ?? geom.eyeDist));
            const kScale = prev ? adaptK(dScale, 0.07, 0.32, px * 0.02) : 1;
            const eyeDist =
              (prev?.eyeDist ?? geom.eyeDist) + (geom.eyeDist - (prev?.eyeDist ?? geom.eyeDist)) * kScale;
            // near/far side must not flip on landmark noise around yaw 0
            if (Math.abs(yaw) > 0.05) nearRef.current.sign = yaw >= 0;
            // ear anchors jitter by a pixel or two per frame: smooth them
            const ePrev = earsRef.current;
            const eK = ePrev ? 0.28 : 1;
            const ears = geom.ears
              ? {
                  left: ePrev?.left
                    ? { x: ePrev.left.x + (geom.ears.left.x - ePrev.left.x) * eK, y: ePrev.left.y + (geom.ears.left.y - ePrev.left.y) * eK }
                    : geom.ears.left,
                  right: ePrev?.right
                    ? { x: ePrev.right.x + (geom.ears.right.x - ePrev.right.x) * eK, y: ePrev.right.y + (geom.ears.right.y - ePrev.right.y) * eK }
                    : geom.ears.right,
                }
              : null;
            earsRef.current = ears;
            const s = { cx, cy, angle, eyeDist, yaw, pitch, lensW: geom.lensW, method: geom.method, left: null, right: null, raw: geom, pose, mRoll: pose?.mRoll ?? null, gRoll: pose?.gRoll ?? geom.angle, ears };
            const rs = s.eyeDist / geom.eyeDist;
            // rotate fresh lens centers by the smoothed angle delta, rescaled
            const dA2 = s.angle - geom.angle;
            const cos = Math.cos(dA2);
            const sin = Math.sin(dA2);
            const rot = (dx, dy) => ({
              x: s.cx + (dx * cos - dy * sin) * rs,
              y: s.cy + (dx * sin + dy * cos) * rs,
            });
            s.left = rot(geom.left.x - geom.cx, geom.left.y - geom.cy);
            s.right = rot(geom.right.x - geom.cx, geom.right.y - geom.cy);
            // manual calibration offset (eyeDist units, user-tunable)
            const cEx = s.eyeDist * (calibRef.current.dx || 0);
            const cEy = s.eyeDist * (calibRef.current.dy || 0);
            s.left.x += cEx;
            s.left.y += cEy;
            s.right.x += cEx;
            s.right.y += cEy;
            s.cx += cEx;
            s.cy += cEy;
            eyeDistRef.current = s.eyeDist;
            smoothRef.current = s;
            setHasFace((v) => (v ? v : true));
            // render: assembled parts → single PNG → procedural shapes
            // iris distance foreshortens with yaw; restore the frontal scale
            const pxPerUnit = s.eyeDist / Math.max(0.55, Math.cos(Math.abs(s.yaw || 0)));
            const drawn = drawAssembled(
              ctx,
              resolveAssets(),
              { roll: s.angle, yaw: s.yaw || 0, pitch: s.pitch || 0 },
              { x: s.cx, y: s.cy },
              pxPerUnit,
              layout,
              { color, ears: s.ears, nearLeft: nearRef.current.sign }
            );
            if (drawn === "none") {
              drawGlasses(ctx, { ...s, eyeDist: s.eyeDist * nudgeRef.current.s, lensW: (s.lensW || s.eyeDist * 0.6) * nudgeRef.current.s }, { shape, color, tinted, yaw: s.yaw || 0 });
            }
            // test hook: `.scratch` harnesses read window.__tryon instead of
            // guessing from pixels. Only when explicitly enabled.
            if (typeof window !== "undefined" && window.__TRYON_DEBUG) {
              window.__tryon = {
                drawn,
                method: s.method,
                yaw: s.yaw,
                pitch: s.pitch,
                angle: s.angle,
                eyeDist: s.eyeDist,
                cx: s.cx,
                cy: s.cy,
                ppu: pxPerUnit,
                left: s.left,
                right: s.right,
                ears: s.ears,
                rawEars: geom.ears,
                dt: { mRoll: pose?.mRoll ?? null, gRoll: pose?.gRoll ?? null },
              };
            }
            if (dbgRef.current) {
              dbgRef.current.left = { ...s.left };
              dbgRef.current.right = { ...s.right };
              dbgRef.current.yaw = s.yaw || 0;
              dbgRef.current.roll = s.angle || 0;
              dbgRef.current.mRoll = s.mRoll;
              dbgRef.current.gRoll = s.gRoll;
              dbgRef.current.eyeDist = s.eyeDist;
              dbgRef.current.method = geom.method || s.method;
            }
            if (dbgRef.current?.show) drawDebug(ctx, w, h);
          } else {
            missRef.current += 1;
            if (missRef.current > 8) {
              smoothRef.current = null;
              poseRef.yaw = 0;
              setHasFace((v) => (v ? false : v));
            } else if (smoothRef.current) {
              const st = smoothRef.current;
              const drawnStale = drawAssembled(
                ctx,
                resolveAssets(),
                { roll: st.angle, yaw: st.yaw || 0, pitch: st.pitch || 0 },
                { x: st.cx, y: st.cy },
                st.eyeDist / Math.max(0.55, Math.cos(Math.abs(st.yaw || 0))),
                layout,
                { color, ears: st.ears }
              );
              if (drawnStale === "none") {
                drawGlasses(ctx, st, { shape, color, tinted, yaw: st.yaw || 0 });
              }
            }
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        if (!cancelled) {
          setCamError(e?.message || "Camera unavailable");
          setReady(true);
        }
      }
    };
    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      smoothRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, active?._id]);

  // ---- selfie still mode ----
  const onSelfieFile = async (file) => {
    if (!file) return;
    setReady(false);
    try {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      // group shots are common: detect a handful and wear the glasses on the
      // biggest face (the person who framed the picture), not whichever
      // happened to sort first
      const lm = await forImagePoseMulti(4);
      const res = await lm.detect(img);
      const faces = res?.faceLandmarks || [];
      if (!faces.length) {
        setCamError(t("tryon.no_face", "No face found in this photo — try another one."));
        setReady(true);
        return;
      }
      const area = (lms) => {
        let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
        for (const p of lms) {
          if (p.x < x0) x0 = p.x;
          if (p.y < y0) y0 = p.y;
          if (p.x > x1) x1 = p.x;
          if (p.y > y1) y1 = p.y;
        }
        return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
      };
      let pick = 0;
      for (let i = 1; i < faces.length; i++) if (area(faces[i]) > area(faces[pick])) pick = i;
      const face = faces[pick];
      // pose for stills is unmirrored: use matrix roll directly
      let stillYaw = 0;
      let stillPitch = 0;
      let stillRoll = null;
      const mp = poseFromMatrix(res?.facialTransformationMatrixes?.[pick]?.data);
      if (mp) {
        const pts0 = face.map((p) => ({ x: p.x, y: p.y }));
        const nose = pts0[IDX.noseTip];
        const lo = pts0[IDX.leftOuter];
        const ro = pts0[IDX.rightOuter];
        const midX = ((lo?.x ?? 0) + (ro?.x ?? 0)) / 2;
        // still photo is NOT mirrored: nose image-right of midpoint =
        // turned to your left = near side image-left
        const sign = nose && midX !== undefined ? (nose.x > midX ? 1 : -1) : 0;
        stillYaw = sign * Math.min(mp.yawMag, 1.1);
      }
      if (mp) stillPitch = Math.max(-0.45, Math.min(0.45, mp.pitch * 0.8));
      // stills are unmirrored, so the matrix roll is used as-is
      if (mp && Number.isFinite(mp.roll)) stillRoll = mp.roll;
      setCamError("");
      setSelfie({ img, landmarks: face, yaw: stillYaw, pitch: stillPitch, roll: stillRoll });
      // occlusion layers run in the background: a temple that should be behind
      // the head/hair is hidden once the mask lands, never before the photo
      // is on screen
      segmentOccluders(img)
        .then((occ) => {
          if (occ) setOccluders(occ);
        })
        .catch(() => {});
      setNudge({ dx: 0, dy: 0, s: 1 });
      setMode("selfie");
      setReady(true);
    } catch (e) {
      setCamError(e?.message || "Could not read photo");
      setReady(true);
    }
  };

  // render selfie still each frame (cheap repaint for nudge/slider)
  useEffect(() => {
    if (mode !== "selfie" || !selfie) return;
    let raf = 0;
    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { w, h } = fitCanvas();
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(selfie.img, 0, 0, w, h);
      const pts = selfie.landmarks.map((p) => ({ x: p.x * w, y: p.y * h }));
      const g = glassesGeometry(pts);
      if (g) {
        setHasFace((v) => (v ? v : true));
        // The iris pair is measured on screen, so it foreshortens with yaw
        // (~cos yaw). Undo that before using it as px-per-IPD, otherwise the
        // frame shrinks on head turns and the temples never reach the ears.
        // Face height barely moves with yaw, so it takes over as the head turns
        // (at profile the eye distance is down to ~40% and unusable).
        const yawAbs = Math.abs(selfie.yaw || 0);
        const pitchAbs = Math.abs(selfie.pitch || 0);
        const fhPx = pts[IDX.forehead] && pts[IDX.chin]
          ? Math.hypot(pts[IDX.forehead].x - pts[IDX.chin].x, pts[IDX.forehead].y - pts[IDX.chin].y)
          : 0;
        const ppuEye = g.eyeDist / Math.max(0.55, Math.cos(Math.min(yawAbs, 1.1)));
        const ppuHead = fhPx ? fhPx / (FACE_H_UNITS * Math.max(0.8, Math.cos(pitchAbs))) : ppuEye;
        const wHead = Math.max(0, Math.min(1, (yawAbs - 0.25) / 0.35));
        const pxPerUnit = ppuEye * (1 - wHead) + ppuHead * wHead;
        dbgRef.current = {
          show: debugRef.current,
          pts: {
            lo: pts[IDX.leftOuter], li: pts[IDX.leftInner], ri: pts[IDX.rightInner], ro: pts[IDX.rightOuter],
            nose: pts[IDX.noseTip], mouthL: pts[61], mouthR: pts[291],
            irisL: pts[470], irisR: pts[475], templeL: pts[127], templeR: pts[356],
            bridge: pts[168], forehead: pts[10], chin: pts[152],
          },
          calib: { ...calibRef.current },
          size: nudge.s,
          eyeDist: g.eyeDist,
          fh: fhPx,
          ppu: pxPerUnit,
          ppuEye,
          ppuHead,
          pitch: selfie.pitch || 0,
          yaw: selfie.yaw || 0,
          roll: g.angle,
          left: g.left,
          right: g.right,
        };
        if (debugRef.current) drawDebug(ctx, w, h);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const sEyeDist = g.eyeDist * nudge.s;
        const sLensW = (g.lensW || g.eyeDist * 0.6) * nudge.s;
        // blend the matrix roll with the landmark roll when they agree; the
        // corner-based angle over-rotates once the near eye foreshortens
        let rollUse = g.angle;
        if (selfie.roll != null) {
          let dR = selfie.roll - g.angle;
          dR = Math.atan2(Math.sin(dR), Math.cos(dR));
          if (Math.abs(dR) < 0.35) rollUse = 0.7 * selfie.roll + 0.3 * g.angle;
        }
        const drawnSelfie = drawAssembled(
          ctx,
          resolveAssets(),
          { roll: rollUse, yaw: selfie.yaw || 0, pitch: selfie.pitch || 0 },
          { x: g.cx, y: g.cy },
          pxPerUnit,
          layoutFromCal(active),
          {
            color: frameColor(active),
            ears: { left: pts[IDX.templeL], right: pts[IDX.templeR] },
            // profile rendering needs the one eye the camera can actually see
            nearEye: (selfie.yaw || 0) >= 0 ? g.left : g.right,
            occluders: occludersRef.current || undefined,
          }
        );
        if (drawnSelfie === "none") {
          drawGlasses(
            ctx,
            {
              left: { x: g.left.x + nudge.dx * dpr, y: g.left.y + nudge.dy * dpr },
              right: { x: g.right.x + nudge.dx * dpr, y: g.right.y + nudge.dy * dpr },
              angle: g.angle,
              eyeDist: sEyeDist,
              lensW: sLensW,
            },
            { shape: active?.shape || "round", color: frameColor(active), tinted: active?.glassesType === "sunglasses", yaw: selfie.yaw || 0 }
          );
        }
      } else {
        setHasFace((v) => (v ? false : v));
      }
      raf = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selfie, nudge, active?._id]);

  const onPointerDown = (e) => {
    setDragging(true);
    dragFrom.current = { x: e.clientX, y: e.clientY, nudge: { ...nudge }, calib: { ...calibRef.current } };
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    if (mode === "selfie") {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setNudge({
        ...nudge,
        dx: dragFrom.current.nudge.dx + ((e.clientX - dragFrom.current.x) * dpr) / 2,
        dy: dragFrom.current.nudge.dy + ((e.clientY - dragFrom.current.y) * dpr) / 2,
      });
      return;
    }
    // camera mode: drag calibrates placement in eyeDist units (persists)
    const ed = eyeDistRef.current || 200;
    const canvas = canvasRef.current;
    const cssW = canvas?.parentElement?.clientWidth || 640;
    const pxPerCss = (canvas?.width || 640) / cssW;
    const edx = ((e.clientX - dragFrom.current.x) * pxPerCss) / ed;
    const edy = ((e.clientY - dragFrom.current.y) * pxPerCss) / ed;
    const next = {
      dx: dragFrom.current.calib.dx + edx,
      dy: dragFrom.current.calib.dy + edy,
    };
    setCalib(next);
    try {
      localStorage.setItem("mhs-tryon-calib-v2", JSON.stringify(next));
    } catch {}
  };
  const resetCalib = () => {
    const zero = { dx: 0, dy: 0 };
    setCalib(zero);
    try {
      localStorage.removeItem("mhs-tryon-calib-v2");
    } catch {}
  };

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `mhs-tryon-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const dir = i18n.dir();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-6" dir={dir}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-[1.8rem] w-full max-w-3xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="h-1 bg-gradient-to-r from-primary via-gold to-primary" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h3 className="font-display font-semibold text-xl text-text-primary flex items-center gap-2.5">
            <span className="grid place-items-center w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-gold text-white">
              <Glasses size={19} />
            </span>
            <span className="truncate max-w-[40vw]">{titleOf(active) || t("tryon.title", "Virtual try-on")}</span>
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-9 h-9 rounded-full bg-background text-text-secondary hover:text-primary hover:rotate-90 transition-all duration-300"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-5 overflow-y-auto">
          <div
            className="relative rounded-3xl overflow-hidden bg-black/90 border border-white/10 mx-auto w-full"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => setDragging(false)}
            onPointerLeave={() => setDragging(false)}
            style={{ touchAction: "none", cursor: mode === "selfie" ? "move" : "grab" }}
          >
            <video ref={videoRef} playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="block mx-auto" />
            {!ready && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-gold animate-spin" />
              </div>
            )}
            {ready && !hasFace && !camError && (
              <div className="absolute top-4 inset-x-4 flex justify-center pointer-events-none">
                <span className="glass !bg-black/50 !border-white/25 rounded-full px-4 py-2 text-xs font-bold text-white">
                  {t("tryon.center_face", "Center your face in the frame")}
                </span>
              </div>
            )}
            {camError && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center">
                <div>
                  <p className="text-white font-semibold">{camError}</p>
                  <label className="btn-glass !text-white !border-white/30 mt-4 inline-flex cursor-pointer">
                    <ImagePlus size={16} />
                    {t("tryon.upload_photo", "Use a photo instead")}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelfieFile(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            <button
              onClick={() => {
                stopCamera();
                setSelfie(null);
                setOccluders(null);
                setNudge({ dx: 0, dy: 0, s: 1 });
                setMode("camera");
              }}
              className={`btn-glass !py-2.5 text-sm ${mode === "camera" ? "!border-primary/60" : ""}`}
            >
              <Camera size={15} />
              {t("tryon.camera", "Camera")}
            </button>
            <label className={`btn-glass !py-2.5 text-sm cursor-pointer ${mode === "selfie" ? "!border-primary/60" : ""}`}>
              <ImagePlus size={15} />
              {t("tryon.photo", "Photo")}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onSelfieFile(e.target.files?.[0])} />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary px-2">
              {t("tryon.size", "Size")}
              <input
                type="range"
                min="0.8"
                max="2.0"
                step="0.01"
                value={nudge.s}
                onChange={(e) => setNudge({ ...nudge, s: parseFloat(e.target.value) })}
                className="accent-[#0D7A66] w-24"
              />
            </label>
            {mode === "camera" && (
              <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary px-2">
                {t("tryon.height", "Height")}
                <input
                  type="range"
                  min="-0.3"
                  max="0.3"
                  step="0.005"
                  value={calib.dy}
                  onChange={(e) => {
                    const next = { ...calib, dy: parseFloat(e.target.value) };
                    setCalib(next);
                    try {
                      localStorage.setItem("mhs-tryon-calib-v2", JSON.stringify(next));
                    } catch {}
                  }}
                  className="accent-[#0D7A66] w-24"
                />
              </label>
            )}
            {(
              <>
                <button
                  onClick={() => setDebug((d) => !d)}
                  className={`btn-glass !py-2.5 text-sm ${debug ? "!border-gold/70" : ""}`}
                  title="Show tracking landmarks"
                >
                  <Bug size={15} />
                  {debug ? "Hide dots" : "Dots"}
                </button>
                <button onClick={resetCalib} className="btn-glass !py-2.5 text-sm" title={t("tryon.reset", "Reset position")}>
                  <RefreshCw size={15} />
                </button>
              </>
            )}
            <button onClick={capture} className="btn-luxe !py-2.5 text-sm">
              <Download size={15} />
              {t("tryon.capture", "Capture")}
            </button>
            {mode === "selfie" && (
              <button onClick={() => setNudge({ dx: 0, dy: 0, s: 1 })} className="btn-glass !py-2.5 text-sm" title={t("tryon.reset", "Reset position")}>
                <RefreshCw size={15} />
              </button>
            )}
          </div>

          {/* product switcher */}
          {list.length > 1 && (
            <div className="flex gap-2 justify-start mt-4 overflow-x-auto pb-1">
              {list.map((p) => (
                <button
                  key={p._id || p.id}
                  onClick={() => setActive(p)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                    (p._id || p.id) === (active?._id || active?.id)
                      ? "bg-primary text-white border-primary shadow"
                      : "border-border text-text-secondary hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {titleOf(p).slice(0, 22)}
                </button>
              ))}
            </div>
          )}
          <p className="text-center text-[11px] text-text-muted mt-3">
            {t("tryon.private", "Preview only — your camera never leaves this device.")}
          </p>
        </div>
      </div>
    </div>
  );
}
