"use client";
import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const VISION_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const IRIS_WIDTH_IN_MM = 12; // Reference iris diameter used in PdModal
const FACE_WIDTH_OVER_PD_RATIO = 2.2; // Tighter realistic ratio (~140mm face width for ~63mm PD)
const RESIZE_OVERLAY = false; // keep face guide fixed-size

// Shared singleton to prevent repeated WASM/model loads across modal opens
let sharedLandmarkerPromise = null;

export default function PhotoUtility({ onClose, productId, onSaved , onTakePhoto }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const landmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const animationIdRef = useRef(null);
  const streamRef = useRef(null);
  // No DrawingUtils; do not render landmarks on the face
  const lastResultsRef = useRef(null);
  const arucoLoadedRef = useRef(false);
  const arucoLoadingRef = useRef(false);
  // PD indicator state
  const [pdMm, setPdMm] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [inGuide, setInGuide] = useState(false);
  // Dynamic overlay sizing (in screen pixels for reliability)
  const [overlaySize, setOverlaySize] = useState({ widthPx: 0, heightPx: 0 });
  const [containerSize, setContainerSize] = useState({ cw: 0, ch: 0 });

  // Initialize overlay size from container on first render
  useEffect(() => {
    const cont = overlayContainerRef.current;
    if (!cont) return;
    const measure = () => {
      const cw = cont.clientWidth;
      const ch = cont.clientHeight;
      if (!cw || !ch) return;
      setContainerSize({ cw, ch });
      if (!overlaySize.widthPx || !overlaySize.heightPx) {
        // initialize roughly centered size with increased height
        setOverlaySize({ widthPx: cw * 0.56, heightPx: ch * 0.9 });
      }
    };
    measure();
    // Observe container resize
    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => measure());
      ro.observe(cont);
    } else {
      // Fallback
      const id = setInterval(measure, 500);
      return () => clearInterval(id);
    }
    return () => {
      try { ro && ro.disconnect(); } catch {}
    };
  }, [overlayContainerRef]);

  // Compute preferred camera constraints, prioritizing mobile-friendly sizes
  const getPreferredVideoConstraints = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 640;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 480;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const isPortrait = vh >= vw;
    const isMobile = vw <= 900; // heuristic

    // Baseline desktop/default
    let widthIdeal = 640;
    let heightIdeal = 480;
    let aspect = 4 / 3;

    if (isMobile) {
      // Prefer 720p in the dominant axis to balance quality and performance
      if (isPortrait) {
        // 3:4 portrait (e.g., 720x960) keeps face large in frame
        widthIdeal = Math.round(360 * dpr) * 2;   // ~720 @ dpr=2
        heightIdeal = Math.round((widthIdeal * 4) / 3);
        aspect = 3 / 4;
      } else {
        // Landscape 16:9-ish but we keep 720 height for stability
        heightIdeal = Math.round(360 * dpr) * 2;  // ~720 @ dpr=2
        widthIdeal = Math.round((heightIdeal * 4) / 3); // still 4:3 to match canvas/layout
        aspect = 4 / 3;
      }
      // Cap extremes
      widthIdeal = Math.min(Math.max(widthIdeal, 480), 1280);
      heightIdeal = Math.min(Math.max(heightIdeal, 360), 960);
    }

    return {
      facingMode: { exact: 'user' },
      width: { ideal: widthIdeal },
      height: { ideal: heightIdeal },
      aspectRatio: { ideal: aspect },
    };
  };

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
            video: getPreferredVideoConstraints(),
            audio: false,
          });
        } catch (_) {
          try {
            const fallback = getPreferredVideoConstraints();
            // Soften facingMode requirement in fallback
            fallback.facingMode = 'user';
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: fallback,
              audio: false,
            });
          } catch (e2) {
            // Final fallback: default camera
            const vw = typeof window !== 'undefined' ? window.innerWidth : 640;
            const vh = typeof window !== 'undefined' ? window.innerHeight : 480;
            const isPortrait = vh >= vw;
            const w = isPortrait ? 720 : 960;
            const h = isPortrait ? 960 : 720;
            streamRef.current = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: w }, height: { ideal: h } },
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
        // Compute PD for badge (no drawing overlays on canvas)
        try {
          const lm = results?.faceLandmarks?.[0];
          const hasFace = Boolean(lm);
          setFaceDetected(hasFace);
          
          if (hasFace) {
            // Iris horizontal diameter points
            const li0 = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[0].start;
            const li2 = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[2].start;
            const ri0 = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[0].start;
            const ri2 = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[2].start;

            const lx0 = lm[li0].x * vw;
            const ly0 = lm[li0].y * vh;
            const lx2 = lm[li2].x * vw;
            const ly2 = lm[li2].y * vh;
            const rx0 = lm[ri0].x * vw;
            const ry0 = lm[ri0].y * vh;
            const rx2 = lm[ri2].x * vw;
            const ry2 = lm[ri2].y * vh;

            // Pupils approximated as midpoints of 0 and 2
            const lpX = (lx0 + lx2) / 2;
            const lpY = (ly0 + ly2) / 2;
            const rpX = (rx0 + rx2) / 2;
            const rpY = (ry0 + ry2) / 2;
            const pupilsDistPx = Math.hypot(lpX - rpX, lpY - rpY);

            // Only proceed with face detection if we have valid landmarks
            if (lm && lm.length) {
              // Prefer actual on-screen rect from canvas/video for higher reliability
              const rect = canvasRef.current?.getBoundingClientRect?.() || null;
              const cw = rect?.width || containerSize.cw || overlayContainerRef.current?.clientWidth || vw;
              const ch = rect?.height || containerSize.ch || overlayContainerRef.current?.clientHeight || vh;
              
              if (cw && ch) {
                const coverScale = Math.max(cw / vw, ch / vh);
                
                // Compute face bbox width in video pixels
                let minX = 1, maxX = 0;
                for (let i = 0; i < lm.length; i++) {
                  const x = lm[i].x;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                }
                
                const faceBoxWidthPx = Math.max(1, (maxX - minX) * vw);
                
                // Primary sizing from face bbox for more visible scaling, with padding
                let desiredFaceWidthScreenPx = faceBoxWidthPx * 1.25 * coverScale;
                
                // Fallback/mix with PD-based if available (helps when bbox is noisy)
                if (pupilsDistPx > 0) {
                  const pdBased = pupilsDistPx * FACE_WIDTH_OVER_PD_RATIO * coverScale;
                  desiredFaceWidthScreenPx = desiredFaceWidthScreenPx * 0.85 + pdBased * 0.15;
                }
                
                const minW = cw * 0.30;
                const maxW = cw * 0.90;
                const widthPxClamped = Math.min(maxW, Math.max(minW, desiredFaceWidthScreenPx));
                
                // Update PD if we have valid iris measurements
                try {
                  const leftIrisPx = Math.hypot(lx0 - lx2, ly0 - ly2);
                  const rightIrisPx = Math.hypot(rx0 - rx2, ry0 - ry2);
                  const irisPx = (leftIrisPx + rightIrisPx) / 2;
                  
                  if (irisPx > 0 && pupilsDistPx > 0) {
                    const pd = (IRIS_WIDTH_IN_MM / irisPx) * pupilsDistPx;
                    setPdMm((prev) => prev === null ? pd : prev * 0.7 + pd * 0.3);
                  }
                } catch (e) {
                  console.warn('Error calculating PD:', e);
                  setPdMm(null);
                }
              }
            }
          }
        } catch (e) {
          console.warn('Error in face detection:', e);
        } finally {
          ctx.restore();
        }
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
    if (!canvasRef.current || isTakingPhoto) return;
    setIsTakingPhoto(true);
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
            <p className="text-sm text-gray-600 mb-2">Align your face within the face outline. Keep the phone upright, use good lighting, and look straight at the camera.</p>
            <div ref={overlayContainerRef} className="relative w-full max-w-[640px] mb-3 rounded-lg overflow-hidden border border-gray-200 mx-auto">
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
              {/* Centered face-shaped guide overlay (dynamically scaled) */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <svg
                  aria-hidden="true"
                  className="opacity-90 drop-shadow"
                  style={{ width: overlaySize.widthPx ? `${overlaySize.widthPx}px` : '56%', height: overlaySize.heightPx ? `${overlaySize.heightPx}px` : '95%' }}
                  viewBox="0 0 100 160"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Dynamic color changes when face is inside the guide */}
                  {(() => {
                    const guideColor = inGuide ? '#22c55e' : '#22d3ee'; // green when inside
                    return (
                      <g>
                        {/* Head outline */}
                        <path d="M50 15 C 75 15, 85 40, 85 70 C 85 100, 75 120, 50 140 C 25 120, 15 100, 15 70 C 15 40, 25 15, 50 15 Z" 
                          fill="none" 
                          stroke={guideColor} 
                          strokeWidth="2.5" 
                          strokeDasharray="4 5" 
                          vectorEffect="non-scaling-stroke" 
                        />
                        {/* Eye level guide */}
                        <path d="M30 50 L70 50" 
                          stroke={guideColor} 
                          strokeWidth="1.5" 
                          strokeDasharray="3 6" 
                          vectorEffect="non-scaling-stroke" 
                        />
                        {/* Nose vertical guide */}
                        <path d="M50 40 L50 90" 
                          stroke={guideColor} 
                          strokeWidth="1.2" 
                          strokeDasharray="2 6" 
                          vectorEffect="non-scaling-stroke" 
                        />
                        {/* Chin guide */}
                        <path d="M30 90 L70 90" 
                          stroke={guideColor} 
                          strokeWidth="1.2" 
                          strokeDasharray="2 6" 
                          vectorEffect="non-scaling-stroke" 
                        />
                      </g>
                    );
                  })()}
                </svg>
              </div>
              {/* PD indicator badge */}
              <div className="absolute right-2 top-2 flex flex-col items-end gap-2 pointer-events-none">
                {!faceDetected && (
                  <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-sm animate-pulse">
                    Align your face and look straight
                  </div>
                )}
                {faceDetected && (
                  <div className="bg-cyan-600/90 text-white px-3 py-1.5 rounded-full text-xs shadow">
                    {pdMm != null ? `PD: ${Math.round(pdMm)} mm` : 'Detecting...'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 flex-col sm:flex-row">
              <div className="text-xs text-gray-500 text-center sm:text-left">Tip: For true-size prints, use “Actual size / 100%” in your print dialog.</div>
              <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
                <button
                  onClick={takePhoto}
                  disabled={!!error || loading || isTakingPhoto}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md shadow-sm transition flex items-center justify-center min-w-[120px]"
                >
                  {isTakingPhoto ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : 'Take Picture'}
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
