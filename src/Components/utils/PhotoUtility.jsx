"use client";
import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useTranslation } from "react-i18next";

const VISION_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const IRIS_WIDTH_IN_MM = 12;
const FACE_WIDTH_OVER_PD_RATIO = 2.2;
const RESIZE_OVERLAY = false;

let sharedLandmarkerPromise = null;

export default function PhotoUtility({ onClose, productId, onSaved, onTakePhoto }) {
  const { t } = useTranslation();
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
  const lastResultsRef = useRef(null);
  const arucoLoadedRef = useRef(false);
  const arucoLoadingRef = useRef(false);
  const [pdMm, setPdMm] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [inGuide, setInGuide] = useState(false);
  const [overlaySize, setOverlaySize] = useState({ widthPx: 0, heightPx: 0 });
  const [containerSize, setContainerSize] = useState({ cw: 0, ch: 0 });

  useEffect(() => {
    const updateOverlaySize = () => {
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // Mobile: Small face guide - 120px width max
        const width = Math.min(220, window.innerWidth * 0.50);
        const height = width * (4/3);
        setOverlaySize({ widthPx: width, heightPx: height });
      } else {
        // Desktop: Larger face guide - 280px width max
        const width = Math.min(220, window.innerWidth * 0.20);
        const height = width * (4/3);
        setOverlaySize({ widthPx: width, heightPx: height });
      }
    };
    
    updateOverlaySize();
    
    const handleResize = () => updateOverlaySize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getPreferredVideoConstraints = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 480;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const isMobile = vw <= 768;

    if (isMobile) {
      // For mobile, use 4:3 aspect ratio
      return {
        facingMode: { ideal: 'user' },
        width: { ideal: 640, min: 480, max: 1280 },
        height: { ideal: 480, min: 360, max: 960 },
        aspectRatio: 4/3,
        frameRate: { ideal: 30, max: 30 }
      };
    } else {
      // For desktop, use 16:9 aspect ratio
      return {
        facingMode: { ideal: 'user' },
        width: { ideal: 1280, min: 960, max: 1920 },
        height: { ideal: 720, min: 540, max: 1080 },
        aspectRatio: 16/9,
        frameRate: { ideal: 30, max: 30 }
      };
    }
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
    <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] ${
      window.innerWidth <= 768 ? 'p-0' : 'p-4'
    }`}>
      <div className={`bg-white shadow-2xl w-full flex flex-col overflow-hidden ${
        window.innerWidth <= 768 
          ? 'h-full max-h-screen rounded-none' 
          : 'rounded-2xl max-w-5xl max-h-[95vh]'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">{t('photoUtility.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="text-gray-600 text-sm">{t('photoUtility.loadingCamera')}</div>
        ) : error ? (
          <div className="text-red-600 text-sm">{error}</div>
        ) : (
          <>
            {/* Instructions */}
            <div className="mb-4 px-2">
              <p className="text-sm text-gray-600 text-center">
                {t('photoUtility.instructions')}
              </p>
            </div>

            {/* Camera Container */}
            <div className="flex-1 flex items-center justify-center px-4 pb-4">
              <div className="relative w-full max-w-4xl">
                {/* Video Container with proper aspect ratios */}
                <div 
                  ref={overlayContainerRef}
                  className="relative w-full bg-black rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg"
                  style={{
                    aspectRatio: window.innerWidth <= 768 ? '4/3' : '16/9',
                    height: window.innerWidth <= 768 ? '55vh' : '60vh'
                  }}
                >
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                    playsInline
                    autoPlay
                    muted
                  />
                  
                  {/* Canvas for processing */}
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none transform scale-x-[-1] opacity-0"
                  />
                  
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg
                      className="opacity-80 drop-shadow-lg"
                      width={overlaySize.widthPx}
                      height={overlaySize.heightPx}
                      viewBox="0 0 120 160"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <g stroke={faceDetected ? "#22c55e" : "#06b6d4"} fill="none" strokeWidth="2">
                        {/* Face outline */}
                        <path
                          d="M60 8 C 88 12, 110 45, 102 85 C 95 135, 75 152, 60 155 C 45 152, 25 135, 18 85 C 10 45, 32 12, 60 8 Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                       
                        <line x1="30" y1="70" x2="90" y2="70" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                        <line x1="60" y1="55" x2="60" y2="110" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                        <line x1="40" y1="120" x2="80" y2="120" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
                      </g>
                    </svg>
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
                    {!faceDetected ? (
                      <div className="bg-black/70 text-white px-3 py-2 rounded-full text-xs backdrop-blur-sm animate-pulse">
                        {t('photoUtility.positionFace')}
                      </div>
                    ) : (
                      <div className="bg-green-600/90 text-white px-3 py-2 rounded-full text-xs backdrop-blur-sm">
                        {pdMm ? `${t('photoUtility.pd')}: ${Math.round(pdMm)}mm` : t('photoUtility.faceDetected')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="px-4 pb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-gray-500 text-center sm:text-left">
              
                  {t('photoUtility.printTip')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {t('photoUtility.close')}
                  </button>
                  <button
                    onClick={takePhoto}
                    disabled={!!error || loading || isTakingPhoto}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 min-w-[120px] justify-center"
                  >
                    {isTakingPhoto ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('photoUtility.processing')}
                      </>
                    ) : (
                      t('photoUtility.capturePhoto')
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
