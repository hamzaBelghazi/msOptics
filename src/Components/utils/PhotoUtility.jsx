"use client";
import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const VISION_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const IRIS_WIDTH_IN_MM = 12; // Reference iris diameter used in PdModal

// Shared singleton to prevent repeated WASM/model loads across modal opens
let sharedLandmarkerPromise = null;

export default function PhotoUtility({ onClose, productId, onSaved , onTakePhoto }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const landmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);
  // No DrawingUtils; do not render landmarks on the face
  const lastResultsRef = useRef(null);
  const arucoLoadedRef = useRef(false);
  const arucoLoadingRef = useRef(false);

  useEffect(() => {

    const setup = async () => {
      try {
        // Wait until refs are mounted
        if (!videoRef.current || !canvasRef.current) {
          requestAnimationFrame(setup);
          return;
        }
        if (!landmarkerRef.current) {
          if (!sharedLandmarkerPromise) {
            sharedLandmarkerPromise = (async () => {
              const vision = await FilesetResolver.forVisionTasks(VISION_PATH);
              return FaceLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: MODEL_PATH },
                runningMode: "VIDEO",
                numFaces: 1,
              });
            })();
          }
          landmarkerRef.current = await sharedLandmarkerPromise;
        }

        // Camera access (selfie/front). Try exact 'user' first, then fall back.
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: "user" },
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
        } catch (_) {
          try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
          } catch (e2) {
            // Final fallback: default camera
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 640 }, height: { ideal: 480 } },
              audio: false,
            });
          }
        }
        if (!videoRef.current) {
          setLoading(false);
          return;
        }
        const video = videoRef.current;
        video.srcObject = streamRef.current;
        // As soon as stream attached, show UI regardless of metadata (prevents infinite loading)
        setLoading(false);
        const handleLoadedMeta = () => {
          // Size canvas to actual video resolution
          if (canvasRef.current) {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            canvasRef.current.width = vw;
            canvasRef.current.height = vh;
          }
        };
        const handleCanPlay = async () => {
          try {
            await video.play();
          } catch {}
          if (!animationIdRef.current) predict();
        };
        video.addEventListener("loadedmetadata", handleLoadedMeta, { once: true });
        video.addEventListener("canplay", handleCanPlay, { once: true });
        // Fallback: if events don't fire, start predict after short delay
        setTimeout(() => {
          if (!animationIdRef.current) predict();
        }, 800);
      } catch (e) {
        console.error("Failed to initialize face landmarker:", e);
        setError(e?.message || "Camera/Model initialization failed");
        setLoading(false);
      }
    };

    const predict = () => {
      if (!videoRef.current || !canvasRef.current || !landmarkerRef.current) {
        animationIdRef.current = requestAnimationFrame(predict);
        return;
      }
      const video = videoRef.current;
      const nowInMs = performance.now();
      // Ensure we have valid intrinsic dimensions before detection
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) {
        animationIdRef.current = requestAnimationFrame(predict);
        return;
      }
      // Keep canvas in sync with actual video size
      if (canvasRef.current.width !== vw || canvasRef.current.height !== vh) {
        canvasRef.current.width = vw;
        canvasRef.current.height = vh;
      }
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        let results = {};
        try {
          results = landmarkerRef.current.detectForVideo(video, nowInMs) || {};
        } catch (err) {
          // Skip this frame if ROI/dimensions are invalid; try again next RAF
          console.warn("FaceLandmarker.detectForVideo error:", err?.message || err);
          animationIdRef.current = requestAnimationFrame(predict);
          return;
        }
        // store latest results for capture-time measurements
        lastResultsRef.current = results;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) {
          animationIdRef.current = requestAnimationFrame(predict);
          return;
        }
        ctx.save();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.restore();
      }
      // Avoid stacking multiple loops
      animationIdRef.current = requestAnimationFrame(predict);
    };

    // Safety net: force loading off after 2.5s
    const loadingTimeout = setTimeout(() => setLoading(false), 2500);
    setup();

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
      clearTimeout(loadingTimeout);
      try {
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        // Keep landmarker alive (avoids reloading WASM on next open). Do not close shared resources here.
      } catch {}
    };
  }, []);

  const loadArUco = () => {
    if (arucoLoadedRef.current || arucoLoadingRef.current) return Promise.resolve(arucoLoadedRef.current);
    arucoLoadingRef.current = true;
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/js-aruco@1.3.0/build/aruco.js";
      script.async = true;
      script.onload = () => {
        arucoLoadedRef.current = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const autoCalibrateWithArUco = async (canvas) => {
    try {
      const ok = await loadArUco();
      if (!ok || !window.AR) return null;
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      const imageData = ctx.getImageData(0, 0, width, height);
      const detector = new window.AR.Detector();
      const markers = detector.detect(imageData);
      if (!markers || !markers.length) return null;
      // Use first marker; ask for real marker side in mm (default 50mm)
      const sizeInput = window.prompt("Detected marker. Enter its real side length in mm:", "50");
      const markerMM = Math.max(1, parseFloat(sizeInput || "50") || 50);
      const m = markers[0];
      const pts = m.corners;
      // Average side length in pixels
      const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const sidePx = (d(pts[0], pts[1]) + d(pts[1], pts[2]) + d(pts[2], pts[3]) + d(pts[3], pts[0])) / 4;
      if (!sidePx || !isFinite(sidePx)) return null;
      return markerMM / sidePx; // mmPerPx
    } catch {
      return null;
    }
  };

  const takePhoto = async () => {
    if (!canvasRef.current) return;
    const srcCanvas = canvasRef.current;
    // Draw to an offscreen canvas so we can add measurement overlays
    const out = document.createElement("canvas");
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    const octx = out.getContext("2d");
    if (!octx) return;
    // Copy current frame
    octx.drawImage(srcCanvas, 0, 0, out.width, out.height);

    // Compute measurement scale: prefer ArUco marker, else fallback to PD
    let mmPerPx = null;
    try {
      mmPerPx = await autoCalibrateWithArUco(out);
    } catch {
      mmPerPx = null;
    }
    if (!mmPerPx) {
      try {
        const res = lastResultsRef.current;
        const lm = res?.faceLandmarks?.[0];
        if (lm) {
          // Use iris-based scale like PdModal: mmPerPx = IRIS_MM / irisWidthPx
          const li0 = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[0].start;
          const li2 = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[2].start;
          const ri0 = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[0].start;
          const ri2 = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[2].start;
          const ldx = (lm[li0].x - lm[li2].x) * out.width;
          const ldy = (lm[li0].y - lm[li2].y) * out.height;
          const rdx = (lm[ri0].x - lm[ri2].x) * out.width;
          const rdy = (lm[ri0].y - lm[ri2].y) * out.height;
          const leftIrisPx = Math.hypot(ldx, ldy);
          const rightIrisPx = Math.hypot(rdx, rdy);
          const irisPx = (leftIrisPx + rightIrisPx) / 2;
          if (irisPx > 0) {
            mmPerPx = IRIS_WIDTH_IN_MM / irisPx;
          }
        }
      } catch {}
    } else {
      // Do not draw any marker annotation on face
    }

    const dataUrl = out.toDataURL("image/jpeg", 0.95);
    // Emit the JPEG to parent if requested
    if (typeof onTakePhoto === 'function') {
      try { onTakePhoto(dataUrl); } catch (_) {}
    }
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15; // mm

    // Compute image placement with true size if mmPerPx available
    const img = new Image();
    img.onload = () => {
      const imgW = img.width;
      const imgH = img.height;
      const pageInnerW = pageWidth - margin * 2;
      const pageInnerH = pageHeight - margin * 2;
      let drawW;
      let drawH;
      let scaleNote = "";

      if (mmPerPx) {
        const naturalWmm = imgW * mmPerPx;
        const naturalHmm = imgH * mmPerPx;
        // Do NOT scale down. Print at true physical size; allow clipping.
        drawW = naturalWmm;
        drawH = naturalHmm;
        scaleNote = "1:1 scale (actual size — may be clipped)";
      } else {
        drawW = pageInnerW;
        drawH = (imgH / imgW) * drawW;
        if (drawH > pageInnerH) {
          drawH = pageInnerH;
          drawW = (imgW / imgH) * drawH;
        }
        scaleNote = "No calibration — fitted to page";
      }

      const x = (pageWidth - drawW) / 2;
      const y = (pageHeight - drawH) / 2;
      pdf.addImage(dataUrl, "JPEG", x, y, drawW, drawH);
      // Draw a 1 cm grid overlay above the image for validation
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.1);
      for (let gx = margin; gx <= pageWidth - margin + 0.001; gx += 10) {
        pdf.line(gx, margin, gx, pageHeight - margin);
      }
      for (let gy = margin; gy <= pageHeight - margin + 0.001; gy += 10) {
        pdf.line(margin, gy, pageWidth - margin, gy);
      }
      // Thicker every 5 cm
      pdf.setDrawColor(170);
      pdf.setLineWidth(0.3);
      for (let gx = margin; gx <= pageWidth - margin + 0.001; gx += 50) {
        pdf.line(gx, margin, gx, pageHeight - margin);
      }
      for (let gy = margin; gy <= pageHeight - margin + 0.001; gy += 50) {
        pdf.line(margin, gy, pageWidth - margin, gy);
      }
      pdf.setFontSize(10);
      const footerY = pageHeight - margin + 6;
      pdf.text(scaleNote, margin, footerY);
      if (mmPerPx) {
        pdf.text(`Calibration: ~${mmPerPx.toFixed(3)} mm/px`, margin, footerY + 5);
      }
      // Save PDF to localStorage instead of downloading
      const pdfDataUrl = pdf.output('datauristring');
      const keyBase = productId ? `face:${productId}` : `face:${Date.now()}`;
      try {
        localStorage.setItem(keyBase, pdfDataUrl);
        if (typeof onSaved === 'function') onSaved(keyBase);
      } catch (e) {
        console.warn('Failed to store face PDF in localStorage', e);
      }
      // Close after saving
      if (typeof onClose === 'function') onClose();
    };
    img.src = dataUrl;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3">
      <div className="bg-white/95 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-2xl relative w-full max-w-[720px]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Face Measurement Capture</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>
        {loading ? (
          <div className="text-gray-600 text-sm">Loading camera...</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-2">Align your face inside the rectangle. Keep the phone upright, good lighting, and look straight at the camera.</p>
            <div className="relative w-full max-w-[640px] mb-3 rounded-lg overflow-hidden border border-gray-200 mx-auto">
              {/* 4:3 aspect ratio spacer for responsiveness */}
              <div className="block w-full" style={{ paddingTop: '75%' }} />
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                playsInline
                autoPlay
                muted
              ></video>
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1]"
              ></canvas>
              {/* Centered guide rectangle overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className="border-2 border-dashed border-cyan-400/80 rounded-md w-2/4 h-3/4 animate-pulse"
                  aria-hidden="true"
                  title="Align your face inside this box"
                ></div>
                {/* corner markers */}
                <div className="absolute w-8 h-8 border-t-4 border-l-4 border-cyan-400/90 rounded-tl-md" style={{ left: '25%', top: '12.5%' }} />
                <div className="absolute w-8 h-8 border-t-4 border-r-4 border-cyan-400/90 rounded-tr-md" style={{ right: '25%', top: '12.5%' }} />
                <div className="absolute w-8 h-8 border-b-4 border-l-4 border-cyan-400/90 rounded-bl-md" style={{ left: '25%', bottom: '12.5%' }} />
                <div className="absolute w-8 h-8 border-b-4 border-r-4 border-cyan-400/90 rounded-br-md" style={{ right: '25%', bottom: '12.5%' }} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="text-xs text-gray-500 text-center sm:text-left">Tip: For true-size prints, use “Actual size / 100%” in your print dialog.</div>
              <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  onClick={takePhoto}
                  disabled={!!error || loading}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md shadow-sm transition"
                >
                  Capture Photo
                </button>
                <button
                  onClick={onClose}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md transition"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
