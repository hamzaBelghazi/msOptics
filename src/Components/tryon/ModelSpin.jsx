"use client";
// 360° product view for the studio's GLB.
//
// The frame is built in centimetres with its origin between the lenses
// (utils/tryonGlb.js), so there is nothing to calibrate: centre the bounding
// box, frame it, and let the shopper spin it. Dragging turns the model a full
// 360° horizontally and a limited arc vertically; a slow auto-rotate keeps it
// alive until the first touch.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw, Play, Pause, Hand } from "lucide-react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SERVER_URL } from "@/Api/adminApi";

const PITCH_LIMIT = 0.62; // radians either way: enough to see the top and the temples
const AUTO_SPEED = 0.42; // rad/s
const RESUME_AFTER = 1800; // ms of no input before the auto-rotate picks up again
const ZOOM_RANGE = [0.62, 2.4];
const FOV = 30; // long-ish lens: glasses photograph badly at wide angles

const cache = new Map();
function loadGltf(url) {
  if (!cache.has(url)) cache.set(url, new GLTFLoader().loadAsync(url));
  return cache.get(url);
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export default function ModelSpin({
  model,
  variants = [],
  variantId = "",
  onVariantChange,
  className = "",
}) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [spinning, setSpinning] = useState(true);

  // imperative handles the render loop and the buttons share
  const api = useRef({ reset: () => {}, setSpinning: () => {} });
  const spinRef = useRef(true);
  // survives the re-init that a variant switch triggers
  const poseRef = useRef(null);
  useEffect(() => {
    spinRef.current = spinning;
    api.current.setSpinning?.(spinning);
  }, [spinning]);

  const url = model ? `${SERVER_URL}/img/tryon/${model}` : null;
  // a variant swap re-runs the effect below; the previous frame stays on screen
  // until the new one is ready, so the box never flashes empty

  useEffect(() => {
    if (!url) return;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    let disposed = false;
    let raf = 0;
    let renderer = null;
    let scene = null;
    let camera = null;
    let pivot = null;
    let root = null;
    let baseDist = 10;
    let visible = true;
    let envTexture = null;
    let pmrem = null;
    const disposables = [];

    // ---- input state ------------------------------------------------------
    const pose = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, zoom: 1, zoomTarget: 1 };
    if (poseRef.current) {
      pose.yaw = poseRef.current.yaw;
      pose.pitch = poseRef.current.pitch;
      pose.zoom = pose.zoomTarget = poseRef.current.zoom;
    }
    let dragging = false;
    let pointerId = null;
    let last = { x: 0, y: 0, t: 0 };
    let auto = true;
    // hold the front view for a moment before the turntable starts
    let idleAt = performance.now() - RESUME_AFTER + 900;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) auto = false;

    const resize = () => {
      if (!renderer || !camera) return;
      const w = stage.clientWidth || 1;
      const h = stage.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    // Fit the model to the viewport: the glasses are long and thin, so frame by
    // the bounding sphere against whichever field of view is tighter.
    const frame = (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      object.position.sub(centre);
      const radius = Math.max(size.length() * 0.5, 0.5);

      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      const dist = Math.max(radius / Math.sin(vFov / 2), radius / Math.sin(hFov / 2));
      return dist;
    };

    const start = async () => {
      const gltf = await loadGltf(url).catch(() => null);
      if (disposed) return;
      if (!gltf) {
        setState("error");
        return;
      }

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setClearAlpha(0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      scene = new THREE.Scene();
      pmrem = new THREE.PMREMGenerator(renderer);
      envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmrem.dispose();

      // Same light rig as the try-on view, so the frame reads the same colour in
      // both places: a single key, a cool rim to separate the metal from the
      // dark background, and a low hemisphere fill.
      const key = new THREE.DirectionalLight(0xffffff, 0.66);
      key.position.set(0.4, 0.8, 1.2);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xffffff, 0.16);
      rim.position.set(-4, 1.2, -3.5);
      scene.add(rim);
      // warm fill: a blue-grey hemisphere drains the gold out of the metal
      scene.add(new THREE.HemisphereLight(0xfff3e0, 0x2a1f14, 0.34));

      camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 5000);
      camera.position.set(0, 0, 10);

      root = gltf.scene.clone(true);
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mat = (o.material = o.material.clone());
        const isLens = /lens/i.test(mat.name || "");
        const lensOrBridge = isLens || /bridge/i.test(mat.name || "");
        mat.envMapIntensity = lensOrBridge ? 0.22 : 0.55;
        // The studio paints glass at ~30% alpha so the face reads through it in
        // the try-on. Seen against a dark product page, that is transparent
        // enough to show the opposite temple crossing the lens, which no photo
        // of sunglasses shows — so the lens is drawn denser here.
        if (isLens && mat.transparent) mat.opacity = 7;
        // The metal parts carry the studio's sampled frame colour as a flat
        // value; a bright room environment blows a 0.55-metal gold out to cream,
        // so soften it the same way the try-on view does.
        if (!mat.map && (mat.metalness ?? 0) > 0.4) {
          // The flat-colour metal parts only have the sampled frame colour to
          // go on, so keep the reflection soft: a mirror finish has nothing to
          // reflect but the room, and reads as cream rather than gold.
          mat.metalness = 0.25;
          mat.roughness = 0.55;
          mat.envMapIntensity = 0.35;
        }
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        // geometry and textures belong to the cached gltf, only the cloned
        // materials are ours to throw away
        disposables.push(mat);
      });

      pivot = new THREE.Group();
      pivot.rotation.order = "YXZ"; // turntable: yaw last, so the frame stays upright
      pivot.add(root);
      scene.add(pivot);

      resize();
      baseDist = frame(root);
      camera.position.setZ(baseDist * pose.zoom);
      setState("ready");

      const clock = new THREE.Clock();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05);
        if (!visible) return;

        // idle auto-rotate, paused while the shopper is turning the model
        const idle = !dragging && performance.now() - idleAt > RESUME_AFTER;
        if (auto && spinRef.current && idle) pose.yaw += AUTO_SPEED * dt;

        if (!dragging) {
          pose.yaw += pose.vyaw * dt;
          pose.pitch = clamp(pose.pitch + pose.vpitch * dt, -PITCH_LIMIT, PITCH_LIMIT);
          pose.vyaw *= 0.9;
          pose.vpitch *= 0.9;
        }
        pose.zoom += (pose.zoomTarget - pose.zoom) * 0.14;

        pivot.rotation.y = pose.yaw;
        pivot.rotation.x = pose.pitch;
        camera.position.z = baseDist * pose.zoom;

        renderer.render(scene, camera);
      };
      tick();
    };

    // ---- pointer input ---------------------------------------------------
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse") return;
      dragging = true;
      pointerId = e.pointerId;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      pose.vyaw = 0;
      pose.vpitch = 0;
      canvas.setPointerCapture?.(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onMove = (e) => {
      if (!dragging || e.pointerId !== pointerId) return;
      const now = performance.now();
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dt = Math.max((now - last.t) / 1000, 1 / 240);
      const k = 0.0075 * (0.6 + 0.4 / pose.zoom); // slower when zoomed in
      pose.yaw += dx * k;
      pose.pitch = clamp(pose.pitch + dy * k, -PITCH_LIMIT, PITCH_LIMIT);
      pose.vyaw = THREE.MathUtils.clamp((dx * k) / dt, -4, 4);
      pose.vpitch = THREE.MathUtils.clamp((dy * k) / dt, -4, 4);
      last = { x: e.clientX, y: e.clientY, t: now };
      idleAt = now;
    };
    const onUp = (e) => {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;
      dragging = false;
      pointerId = null;
      idleAt = performance.now();
      canvas.releasePointerCapture?.(e.pointerId);
      canvas.style.cursor = "grab";
    };
    const onWheel = (e) => {
      e.preventDefault();
      pose.zoomTarget = clamp(pose.zoomTarget * (1 + e.deltaY * 0.0012), ZOOM_RANGE[0], ZOOM_RANGE[1]);
      idleAt = performance.now();
    };
    const onDouble = () => {
      pose.yaw = 0;
      pose.pitch = 0;
      pose.vyaw = 0;
      pose.vpitch = 0;
      pose.zoomTarget = 1;
      idleAt = performance.now();
    };

    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dblclick", onDouble);

    // touching the model stops the auto-rotate until the shopper is done
    api.current.reset = () => {
      pose.yaw = 0;
      pose.pitch = 0;
      pose.vyaw = 0;
      pose.vpitch = 0;
      pose.zoomTarget = 1;
      idleAt = 0; // let the auto-rotate resume straight away
    };
    api.current.setSpinning = (on) => {
      auto = on && !reduceMotion;
      idleAt = 0;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(stage);
    const onVisibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibility);

    start().catch(() => setState("error"));

    return () => {
      poseRef.current = { yaw: pose.yaw, pitch: pose.pitch, zoom: pose.zoomTarget };
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDouble);
      for (const d of disposables) d.dispose?.();
      envTexture?.dispose?.();
      renderer?.dispose?.();
    };
  }, [url]);

  if (!url) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`} ref={wrapRef}>
      <div
        ref={stageRef}
        className="relative w-full h-96 lg:h-[500px] bg-gradient-to-br from-background-soft to-background"
      >
        <canvas
          // a variant is a different GLB: give it a fresh context instead of
          // re-initialising a renderer on the old one
          key={url}
          ref={canvasRef}
          className="block w-full h-full"
          aria-label={t("tryon.view360", "360° view of the frame")}
        />

        {state === "loading" && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <p className="text-sm text-text-muted">
              {t("tryon.view360Error", "This frame has no 3D model yet.")}
            </p>
          </div>
        )}

        {state === "ready" && (
          <>
            <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-white uppercase">
              360°
            </span>
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-[11px] text-white/90 backdrop-blur-sm">
              <Hand size={12} /> {t("tryon.dragToRotate", "Drag to rotate")}
            </span>
            <div className="absolute bottom-3 left-3 flex gap-2">
              <button
                type="button"
                onClick={() => setSpinning((v) => !v)}
                aria-label={spinning ? t("tryon.pauseSpin", "Pause rotation") : t("tryon.playSpin", "Start rotation")}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
              >
                {spinning ? <Pause size={15} /> : <Play size={15} />}
              </button>
              <button
                type="button"
                onClick={() => api.current.reset()}
                aria-label={t("tryon.resetView", "Reset view")}
                className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
              >
                <RotateCcw size={15} />
              </button>
            </div>
          </>
        )}
        {/* the swatches stay reachable if a variant's GLB fails to load */}
        {state !== "loading" && variants.length > 0 && (
          <div className="absolute bottom-12 left-1/2 z-10 flex max-w-[80%] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => onVariantChange?.("")}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition ${
                !variantId
                  ? "border-primary/70 bg-primary/25 text-white"
                  : "border-white/10 bg-black/50 text-white/80 hover:text-white"
              }`}
            >
              <span className="h-3 w-3 rounded-full border border-white/40 bg-white/70" />
              {t("tryon.original", "Original")}
            </button>
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onVariantChange?.(v.id)}
                title={v.name}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm transition ${
                  variantId === v.id
                    ? "border-primary/70 bg-primary/25 text-white"
                    : "border-white/10 bg-black/50 text-white/80 hover:text-white"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-white/40"
                  style={{ backgroundColor: v.frameColor }}
                />
                <span
                  className="-ml-1 h-3 w-3 rounded-full border border-white/40"
                  style={{ backgroundColor: v.lensColor }}
                />
                {v.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
