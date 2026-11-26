"use client";
// MediaPipe face tracking + three.js renderer for the studio's GLB.
//
// MediaPipe's facial transformation matrix maps the canonical face
// (centimetres, origin between the eyes, +Z out of the face) into camera space,
// and utils/tryonGlb.js builds the studio GLB in those same centimetres on the
// same origin — so the frame needs no calibration, just a translation onto the
// eye line. The three camera below is MediaPipe's virtual camera: 63° vertical
// FOV, scene in centimetres.
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Download, Glasses, Camera, ImagePlus } from "lucide-react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useFaceLandmarker } from "./useFaceLandmarker";
import { SERVER_URL } from "@/Api/adminApi";

const TRACKING_FOV = 63;
// Canonical face, cm: eyes at y 2.6, corneas at z 3.9 — the lens plane sits
// ~13 mm in front of them, and the GLB's origin is between the lenses.
const EYE_ANCHOR = new THREE.Vector3(0, 2.6, 5.2);
const CALIB_KEY = "mhs-tryon3d-calib";

const gltfCache = new Map();
function loadGltf(url) {
  if (!gltfCache.has(url)) gltfCache.set(url, new GLTFLoader().loadAsync(url));
  return gltfCache.get(url);
}

const readCalib = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CALIB_KEY) || "{}");
    return {
      size: Number.isFinite(raw.size) ? raw.size : 1,
      height: Number.isFinite(raw.height) ? raw.height : 0,
    };
  } catch {
    return { size: 1, height: 0 };
  }
};

export default function FaceTryOn({ product, onClose }) {
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const lang = i18n.language;
  const { forVideoPose, forImagePose } = useFaceLandmarker();

  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const stageRef = useRef(null);
  const fileRef = useRef(null);

  const [mode, setMode] = useState("camera"); // camera | photo
  const [calib, setCalib] = useState(() => readCalib());
  const calibRef = useRef(calib);
  calibRef.current = calib;

  // smoothed camera pose (cm + quaternion) and the still-photo pose
  // camera pose: filtered position/quaternion plus their rates, so the model can
  // keep moving between detections instead of stepping once per detection
  const poseRef = useRef({ pos: null, quat: null, seen: 0, on: false, vel: null, prevQuat: null, deltaQ: null, dt: 0, lastAt: 0 });
  const photoRef = useRef(null);

  // the render loop reads these without re-running its effect
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const hasFaceRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const [error, setError] = useState("");

  // Colour / lens variations the admin saved in the studio: each carries its
  // own recoloured parts and its own GLB, so switching is a model swap.
  const variants = Array.isArray(product?.tryOnParts?.variants)
    ? product.tryOnParts.variants
    : [];
  const [variantId, setVariantId] = useState("");
  const activeVariant = variants.find((v) => v.id === variantId) || null;
  const baseModel = product?.tryOnParts?.model || null;
  const shownModel = activeVariant?.model || baseModel;
  const modelUrl = shownModel ? `${SERVER_URL}/img/tryon/${shownModel}` : null;

  const title =
    product?.titleTranslations?.[lang?.startsWith("ar") ? "ar" : lang?.startsWith("de") ? "de" : "en"] ||
    product?.titleTranslations?.en ||
    product?.title ||
    "";

  const setCalibAndSave = useCallback((next) => {
    setCalib(next);
    try {
      localStorage.setItem(CALIB_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
  }, []);

  // ---- renderer + model (built once per product) ------------------------
  useEffect(() => {
    if (!modelUrl) {
      setError("No 3D model for this product");
      return;
    }
    let disposed = false;
    setReady(false);
    setHasFace(false);
    setError("");
    poseRef.current = { pos: null, quat: null, seen: 0, on: false, vel: null, prevQuat: null, deltaQ: null, dt: 0, lastAt: 0 };
    photoRef.current = null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;

    const start = async () => {
      const lm = await forVideoPose();
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setClearAlpha(0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
      keyLight.position.set(0.4, 0.8, 1.2);
      scene.add(keyLight);
      scene.add(new THREE.HemisphereLight(0xdce8ff, 0x241a12, 0.5));

      const camera = new THREE.PerspectiveCamera(TRACKING_FOV, 4 / 3, 0.1, 10000);

      const gltf = await loadGltf(modelUrl);
      if (disposed) return;
      const root = gltf.scene.clone(true);
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mat = (o.material = o.material.clone());
        const lensOrBridge = /lens|bridge/i.test(mat.name || "");
        mat.envMapIntensity = lensOrBridge ? 0.22 : 0.55;
        if (/temple/i.test(mat.name || "") || /temple/i.test(o.name)) {
          // Preserve the frame color sampled from the Studio temple artwork.
          mat.metalness = 0.2;
          mat.roughness = 0.62;
          mat.envMapIntensity = 0.32;
        }
      });
      // With no head mesh, a rear-pointing arm converges on the vanishing point
      // and draws across the lens, so the back halves are only shown for the
      // near side once the head is turned.
      const arms = {
        left: root.getObjectByName("TempleLeftBack"),
        right: root.getObjectByName("TempleRightBack"),
      };
      for (const m of Object.values(arms)) {
        if (!m) continue;
        m.material = m.material.clone();
        m.material.transparent = true;
        m.visible = false;
      }

      // There is no head behind the arm to hide it, so the last stretch of each
      // temple is dissolved: it reads as the arm passing behind the ear and
      // vanishing into the hair, instead of ending in a hard cut across the
      // cheek. Distances are in the model's own frame (cm behind the hinge).
      const EAR_FADE = { from: 5.8, to: 8.8 };
      const templeMats = [];
      let armReach = 0;
      root.traverse((o) => {
        if (!o.isMesh || !/temple/i.test(o.name || "")) return;
        o.geometry.computeBoundingBox();
        armReach = Math.max(armReach, -o.geometry.boundingBox.min.z);
        templeMats.push(o.material);
      });
      for (const mat of templeMats) {
        // the arm becomes translucent over the head rather than being cut
        mat.transparent = true;
        mat.depthWrite = true;
        mat.onBeforeCompile = (shader) => {
          mat.userData.shader = shader;
          shader.uniforms.uFadeFrom = { value: EAR_FADE.from };
          shader.uniforms.uFadeTo = { value: EAR_FADE.to };
          shader.vertexShader = shader.vertexShader
            .replace("#include <common>", "#include <common>\nvarying float vBehindHinge;")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvBehindHinge = -position.z;");
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying float vBehindHinge;\nuniform float uFadeFrom;\nuniform float uFadeTo;"
            )
            .replace(
              "#include <alphamap_fragment>",
              `#include <alphamap_fragment>
               // squared smoothstep: solid by the hinge, gone at the ear, so
               // the arm melts into the hair instead of stopping on an edge
               float earFade = smoothstep(uFadeFrom, uFadeTo, vBehindHinge);
               earFade *= earFade;
               diffuseColor.a *= 1.0 - earFade;`
            );
        };
        mat.customProgramCacheKey = () => "temple-ear-fade";
      }
      const model = new THREE.Group();
      model.matrixAutoUpdate = false;
      model.add(root);
      model.visible = false;
      scene.add(model);

      const resize = () => {
        const bw = wrap.clientWidth;
        const bh = wrap.clientHeight;
        if (!bw || !bh) return;
        const img = imgRef.current;
        const usePhoto = modeRef.current === "photo" && img && img.naturalWidth;
        const vw = usePhoto ? img.naturalWidth : video.videoWidth || 640;
        const vh = usePhoto ? img.naturalHeight : video.videoHeight || 480;
        renderer.setSize(bw, bh, false);
        // the source is object-fit: cover in the same box, so shrink the
        // vertical FOV by however much of its height got cropped away
        const scale = Math.max(bw / vw, bh / vh);
        const visibleH = bh / scale;
        const fovV = (2 * Math.atan(Math.tan((TRACKING_FOV * Math.PI) / 360) * (visibleH / vh)) * 180) / Math.PI;
        camera.fov = fovV;
        camera.aspect = bw / bh;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      stageRef.current = { renderer, scene, camera, model, arms, lm, resize, ro };
      setReady(true);

      // ---- frame loop ----
      const metrics = { fps: 0, detectMs: 0 };
      const faceMatrix = new THREE.Matrix4();
      const wanted = new THREE.Matrix4();
      const scaleM = new THREE.Matrix4();
      const offset = new THREE.Matrix4();
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      const rawPos = new THREE.Vector3();
      const rawQuat = new THREE.Quaternion();
      const one = new THREE.Vector3(1, 1, 1);
      const euler = new THREE.Euler();
      const tmpV = new THREE.Vector3();
      const tmpQ = new THREE.Quaternion();
      let frames = 0;
      let fpsAt = performance.now();
      let lastVideoTime = -1;

      const loop = () => {
        if (disposed) return;
        rafRef.current = requestAnimationFrame(loop);
        const now = performance.now();
        const sm = poseRef.current;

        if (modeRef.current === "camera" && video.videoWidth && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          let arr = null;
          const t0 = performance.now();
          try {
            arr = lm.detectForVideo(video, now)?.facialTransformationMatrixes?.[0]?.data || null;
          } catch {
            arr = null;
          }
          metrics.detectMs = Math.round(performance.now() - t0);
          if (arr && arr.length === 16) {
            faceMatrix.fromArray(arr);
            faceMatrix.decompose(rawPos, rawQuat, s);
            const dt = sm.lastAt ? (now - sm.lastAt) / 1000 : 0;
            if (!sm.on) {
              sm.pos = rawPos.clone();
              sm.quat = rawQuat.clone();
              sm.vel = new THREE.Vector3();
              sm.prevQuat = rawQuat.clone();
              sm.deltaQ = new THREE.Quaternion();
              sm.on = true;
            } else {
              // speed-adaptive: heavy while still, light while the head moves.
              // The gains sit higher than a pure de-jitter filter would use —
              // a frame that trails the head is worse than a frame that shakes
              // by a pixel.
              const dp = sm.pos.distanceTo(rawPos);
              const dq = 1 - Math.abs(sm.quat.dot(rawQuat));
              const kp = 0.42 + 0.52 * Math.min(1, dp / 0.8);
              const kq = 0.40 + 0.52 * Math.min(1, dq / 0.04);
              if (dt > 0.004 && dt < 0.25) {
                // cm/s, blended so one noisy frame cannot fling the model
                tmpV.copy(rawPos).sub(sm.pos).divideScalar(dt);
                tmpV.clampLength(0, 400);
                sm.vel.lerp(tmpV, 1 - Math.exp(-dt / 0.08));
              }
              // per-detection rotation delta, for the same extrapolation
              sm.deltaQ.copy(sm.prevQuat).invert().multiply(rawQuat);
              sm.prevQuat.copy(sm.quat);
              sm.pos.lerp(rawPos, kp);
              sm.quat.slerp(rawQuat, kq);
            }
            sm.dt = Math.max(0.004, Math.min(0.12, dt || 0.033));
            sm.lastAt = now;
            sm.seen = now;
            if (!hasFaceRef.current) {
              hasFaceRef.current = true;
              setHasFace(true);
            }
          } else if (sm.on && now - sm.seen > 250) {
            sm.on = false;
          }
        }

        const pose = modeRef.current === "photo" ? photoRef.current : sm.on ? sm : null;
        if (pose && pose.pos && pose.quat) {
          if (modeRef.current === "photo") {
            p.copy(pose.pos);
            q.copy(pose.quat);
          } else {
            // advance the filtered pose by its own rate, up to one detection
            // interval: detection runs at video rate, drawing at 60 fps
            const age = Math.min((now - sm.lastAt) / 1000, Math.min(sm.dt, 0.08));
            p.copy(sm.pos).addScaledVector(sm.vel, age);
            q.copy(sm.quat);
            if (sm.deltaQ) {
              const t = Math.min(1, age / Math.max(0.008, sm.dt));
              tmpQ.identity().slerp(sm.deltaQ, t);
              q.multiply(tmpQ);
            }
          }
          euler.setFromQuaternion(q, "YXZ");
          const yaw = euler.y;
          const fade = Math.min(1, Math.max(0, (Math.abs(yaw) - 0.12) / 0.18));
          if (arms.left) {
            arms.left.visible = fade > 0.02 && yaw > 0;
            if (arms.left.visible) arms.left.material.opacity = fade;
          }
          if (arms.right) {
            arms.right.visible = fade > 0.02 && yaw < 0;
            if (arms.right.visible) arms.right.material.opacity = fade;
          }
          wanted.compose(p, q, one);
          offset.makeTranslation(EYE_ANCHOR.x, EYE_ANCHOR.y + calibRef.current.height, EYE_ANCHOR.z);
          const k = calibRef.current.size;
          scaleM.makeScale(k, k, k);
          wanted.multiply(offset).multiply(scaleM);
          model.matrix.copy(wanted);
          model.visible = true;
          // the ear does not move when the fit slider does: keep the dissolve
          // at a real distance behind the hinge, and never past the arm's end
          const reachW = armReach * k;
          const toW = Math.min(EAR_FADE.to, reachW * 0.96);
          const fromW = Math.min(EAR_FADE.from, toW * 0.78);
          for (const mat of templeMats) {
            const sh = mat.userData.shader;
            if (!sh) continue;
            sh.uniforms.uFadeFrom.value = fromW / k;
            sh.uniforms.uFadeTo.value = toW / k;
          }
        } else {
          model.visible = false;
        }

        frames++;
        if (now - fpsAt > 1000) {
          metrics.fps = Math.round((frames * 1000) / (now - fpsAt));
          frames = 0;
          fpsAt = now;
        }
        if (typeof window !== "undefined" && window.__TRYON_DEBUG) {
          window.__tryon3dpose = {
            raw: [rawPos.x, rawPos.y, rawPos.z, rawQuat.x, rawQuat.y, rawQuat.z, rawQuat.w],
            sm: sm.pos ? [sm.pos.x, sm.pos.y, sm.pos.z, sm.quat.x, sm.quat.y, sm.quat.z, sm.quat.w] : null,
            visible: model.visible,
            detected: sm.on,
            mode: modeRef.current,
            fps: metrics.fps,
            detectMs: metrics.detectMs,
          };
        }
        renderer.render(scene, camera);
      };
      loop();

      stageRef.current.dispose = () => {
        ro.disconnect();
        renderer.dispose();
      };
    };

    start().catch((e) => {
      if (disposed) return;
      setError(String(e?.name === "NotAllowedError" ? "camera" : e?.message || e));
    });

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stage = stageRef.current;
      stageRef.current = null;
      if (stage?.dispose) stage.dispose();
      hasFaceRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ---- camera lifecycle -------------------------------------------------
  useEffect(() => {
    if (mode !== "camera") {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      return;
    }
    let cancelled = false;
    setError("");
    (async () => {
      try {
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
        stageRef.current?.resize?.();
      } catch (e) {
        if (!cancelled) setError(String(e?.name === "NotAllowedError" ? "camera" : e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(
    () => () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((tr) => tr.stop());
      if (imgRef.current?.src?.startsWith("blob:")) URL.revokeObjectURL(imgRef.current.src);
    },
    []
  );

  // ---- still photo ------------------------------------------------------
  const onPhoto = useCallback(
    async (file) => {
      if (!file) return;
      setError("");
      setMode("photo");
      try {
        const img = imgRef.current;
        if (img?.src?.startsWith("blob:")) URL.revokeObjectURL(img.src);
        img.src = URL.createObjectURL(file);
        await (img.decode ? img.decode().catch(() => {}) : new Promise((res) => (img.onload = res)));
        const lm = await forImagePose();
        const res = lm.detect(img);
        const arr = res?.facialTransformationMatrixes?.[0]?.data;
        if (!arr || arr.length !== 16) {
          setHasFace(false);
          setError("No face found in that photo");
          return;
        }
        const m = new THREE.Matrix4().fromArray(arr);
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        m.decompose(pos, quat, new THREE.Vector3());
        photoRef.current = { pos, quat };
        hasFaceRef.current = true;
        setHasFace(true);
        stageRef.current?.resize?.();
      } catch (e) {
        setError(e?.message || "Could not read that photo");
      }
    },
    [forImagePose]
  );

  const backToCamera = useCallback(() => {
    if (imgRef.current?.src?.startsWith("blob:")) URL.revokeObjectURL(imgRef.current.src);
    if (imgRef.current) imgRef.current.removeAttribute("src");
    photoRef.current = null;
    hasFaceRef.current = false;
    setHasFace(false);
    setMode("camera");
  }, []);

  const onDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const source = mode === "photo" ? imgRef.current : videoRef.current;
    if (!source) return;
    const out = document.createElement("canvas");
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext("2d");
    ctx.save();
    // the camera view is mirrored, a chosen photo is shown as it is
    if (mode === "camera") {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    const sw = mode === "photo" ? source.naturalWidth : source.videoWidth;
    const sh = mode === "photo" ? source.naturalHeight : source.videoHeight;
    // cover-fit, same as the <video>/<img> in the box
    const scale = Math.max(out.width / sw, out.height / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(source, (out.width - dw) / 2, (out.height - dh) / 2, dw, dh);
    ctx.drawImage(canvas, 0, 0, out.width, out.height);
    ctx.restore();
    const a = document.createElement("a");
    a.href = out.toDataURL("image/png");
    a.download = `tryon-${product?._id || "frame"}.png`;
    a.click();
  }, [mode, product?._id]);

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
            <span className="truncate max-w-[40vw]">{title || t("tryon.title", "Virtual try-on")}</span>
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
          <div ref={wrapRef} className="relative rounded-3xl overflow-hidden bg-black/90 border border-white/10 mx-auto w-full aspect-[4/3]">
            <div className="absolute inset-0" style={mode === "camera" ? { transform: "scaleX(-1)" } : undefined}>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: mode === "camera" ? "block" : "none" }}
              />
              <img
                ref={imgRef}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: mode === "photo" ? "block" : "none" }}
              />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>

            {!ready && !error && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <span className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-gold animate-spin" />
              </div>
            )}
            {ready && !hasFace && !error && (
              <div className="absolute top-4 inset-x-4 flex justify-center pointer-events-none">
                <span className="glass !bg-black/50 !border-white/25 rounded-full px-4 py-2 text-xs font-bold text-white">
                  {t("tryon.center_face", "Center your face in the frame")}
                </span>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 grid place-items-center p-6 bg-black/70">
                <div className="text-center text-white/90">
                  <p className="text-sm font-semibold mb-1">
                    {error === "camera" ? t("tryon.no_camera", "Camera unavailable") : t("tryon.error", "Try-on could not start")}
                  </p>
                  <p className="text-xs text-white/60 break-words">{error === "camera" ? "" : error}</p>
                </div>
              </div>
            )}

            {ready && !error && (
              <button
                onClick={onDownload}
                className="absolute bottom-4 right-4 grid place-items-center w-10 h-10 rounded-full bg-white/90 text-black shadow-lg hover:scale-105 transition"
                aria-label={t("tryon.download", "Download")}
              >
                <Download size={17} />
              </button>
            )}
          </div>

          {/* colour / lens variations */}
          {variants.length > 0 && ready && !error && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
                {t("tryon.colour", "Colour")}
              </span>
              <button
                onClick={() => setVariantId("")}
                className={`btn-glass !py-1.5 !px-3 text-xs flex items-center gap-1.5 ${
                  !variantId ? "!border-primary/60" : ""
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full border border-white/40 bg-white/70" />
                {t("tryon.original", "Original")}
              </button>
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  title={v.name}
                  className={`btn-glass !py-1.5 !px-3 text-xs flex items-center gap-1.5 ${
                    variantId === v.id ? "!border-primary/60" : ""
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/40"
                    style={{ backgroundColor: v.frameColor }}
                  />
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/40 -ml-1.5"
                    style={{ backgroundColor: v.lensColor }}
                  />
                  {v.name}
                </button>
              ))}
            </div>
          )}

          {/* camera / photo + fit controls */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
            <button
              onClick={backToCamera}
              className={`btn-glass !py-2.5 text-sm ${mode === "camera" ? "!border-primary/60" : ""}`}
            >
              <Camera size={15} />
              {t("tryon.camera", "Camera")}
            </button>
            <button onClick={() => fileRef.current?.click()} className={`btn-glass !py-2.5 text-sm ${mode === "photo" ? "!border-primary/60" : ""}`}>
              <ImagePlus size={15} />
              {t("tryon.photo", "Photo")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />

            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary px-2">
              {t("tryon.size", "Size")}
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.01"
                value={calib.size}
                onChange={(e) => setCalibAndSave({ ...calib, size: parseFloat(e.target.value) })}
                className="accent-[#0D7A66] w-24"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary px-2">
              {t("tryon.height", "Height")}
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.05"
                value={calib.height}
                onChange={(e) => setCalibAndSave({ ...calib, height: parseFloat(e.target.value) })}
                className="accent-[#0D7A66] w-24"
              />
            </label>
            <button
              onClick={() => setCalibAndSave({ size: 1, height: 0 })}
              className="text-xs font-semibold text-text-secondary underline-offset-2 hover:underline px-2"
            >
              {t("tryon.reset_fit", "Reset fit")}
            </button>
          </div>
          <p className="text-center text-[11px] text-text-secondary mt-2">
            {t("tryon.preview_only", "Preview only — your camera never leaves this device.")}
          </p>
        </div>
      </div>
    </div>
  );
}
