import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Ruler,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import {
  PD_MAX,
  PD_MIN,
  cropForSheet,
  measureFace,
  medianMetrics,
} from "./faceMetrics";
import { buildFaceSheet, formatStamp } from "./faceSheet";

// The model and the WASM runtime ship with the app, so the tool works offline.
// The CDN copies stay as a last resort for unusual deployments.
const LOCAL_VISION_PATH = "/mediapipe/wasm";
const LOCAL_MODEL_PATH = "/mediapipe/face_landmarker.task";
const CDN_VISION_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const CDN_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Checkout reads this key, and the success page clears every "facePhoto:" key.
const STORAGE_PREFIX = "facePhoto:";
const MAX_STORED_PX = 1500;
const MAX_UPLOAD_PX = 2400;
const TEAL = "#0f766e";

const isBrowser = typeof window !== "undefined";

/* ------------------------------------------------------------------ model */

let landmarkerPromise = null;

function loadLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const createWith = async (visionPath, modelPath) => {
        const fileset = await FilesetResolver.forVisionTasks(visionPath);
        const create = (delegate) =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: modelPath, delegate },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        try {
          return await create("GPU");
        } catch (gpuError) {
          return await create("CPU");
        }
      };
      try {
        return await createWith(LOCAL_VISION_PATH, LOCAL_MODEL_PATH);
      } catch (localError) {
        console.error("Local face model failed, falling back to CDN", localError);
        return await createWith(CDN_VISION_PATH, CDN_MODEL_PATH);
      }
    })().catch((error) => {
      landmarkerPromise = null;
      throw error;
    });
  }
  return landmarkerPromise;
}

/* ----------------------------------------------------------------- camera */

async function requestStream(facingMode) {
  if (!isBrowser || !navigator.mediaDevices?.getUserMedia) {
    const error = new Error("Camera API unavailable");
    error.name = "NotSupportedError";
    throw error;
  }
  const high = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  };
  const attempts = [
    { video: { facingMode: { ideal: facingMode }, ...high }, audio: false },
    {
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    },
    { video: high, audio: false },
    { video: true, audio: false },
  ];
  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") break;
    }
  }
  throw lastError || new Error("Camera unavailable");
}

function cameraErrorMessage(error) {
  const name = error?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera access is blocked. Allow it in the address bar, or upload a photo instead.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError")
    return "No camera found on this device. You can upload a photo instead.";
  if (name === "NotReadableError" || name === "TrackStartError")
    return "Another app is using the camera. Close it, then try again.";
  if (name === "NotSupportedError")
    return "This browser can not open a camera here. Upload a photo instead.";
  return "The camera did not start. Try again, or upload a photo instead.";
}

/* ----------------------------------------------------------------- images */

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not open that image"));
    image.src = src;
  });

// Keep memory bounded on phones: photos are only ever printed at true size,
// and 1500 px is already enough for a 178 mm sheet.
const shrinkImage = (image, maxSide) => {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  return canvas;
};

// jsPDF's data URL export mangles the compressed stream, so take the blob and
// encode it here: the sheet the shop prints has to be byte clean.
const pdfToDataUrl = async (doc) => {
  const blob = doc.output("blob");
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return "data:application/pdf;base64," + btoa(binary);
};

const round1 = (value) => Math.round(Number(value) * 10) / 10;

// The measurements travel with the order, so the shop prints from numbers and
// not from a picture of a screen.
const buildFaceMeta = (metrics, shot) => {
  if (!metrics) return null;
  return {
    pd: round1(metrics.pdMm),
    right: round1(metrics.rightPdMm),
    left: round1(metrics.leftPdMm),
    faceWidth: Math.round(metrics.faceWidthMm),
    faceHeight: Math.round(metrics.faceHeightMm),
    mmPerPx: Number(metrics.mmPerPx.toFixed(4)),
    calibration: metrics.calibration,
    level: metrics.level,
    issues: metrics.issues || [],
    takenAt: shot?.at || Date.now(),
    width: shot?.width || 0,
    height: shot?.height || 0,
  };
};

/* --------------------------------------------------------------- overlay */

function drawPill(context, text, x, y, color, unit) {
  context.font = "600 " + 11 * unit + "px ui-sans-serif, system-ui, sans-serif";
  const textWidth = context.measureText(text).width;
  const padX = 6 * unit;
  const height = 19 * unit;
  const width = textWidth + padX * 2;
  const left = x - width / 2;
  const top = y - height / 2;
  const radius = 6 * unit;
  context.beginPath();
  context.moveTo(left + radius, top);
  context.arcTo(left + width, top, left + width, top + height, radius);
  context.arcTo(left + width, top + height, left, top + height, radius);
  context.arcTo(left, top + height, left, top, radius);
  context.arcTo(left, top, left + width, top, radius);
  context.closePath();
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 1 * unit;
  context.stroke();
  context.fillStyle = color;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y + 0.5 * unit);
}

// Draws exactly what the printed sheet draws, so the review preview is the
// same measurement the paper will carry.
function drawShotOverlay(canvas, metrics, imageWidth, imageHeight) {
  const context = canvas?.getContext("2d");
  if (!context || !metrics || !canvas.width) return;
  const cw = canvas.width;
  const ch = canvas.height;
  context.clearRect(0, 0, cw, ch);
  const unit = cw / (canvas.clientWidth || cw);
  const scale = Math.min(cw / imageWidth, ch / imageHeight);
  const offsetX = (cw - imageWidth * scale) / 2;
  const offsetY = (ch - imageHeight * scale) / 2;
  const at = (point) => ({
    x: offsetX + point.x * scale,
    y: offsetY + point.y * scale,
  });

  const right = at(metrics.anchors.rightEye);
  const left = at(metrics.anchors.leftEye);
  const nasion = at(metrics.anchors.nasion);
  const faceLeft = at(metrics.anchors.faceLeft);
  const faceRight = at(metrics.anchors.faceRight);

  context.strokeStyle = TEAL;
  context.fillStyle = TEAL;
  context.lineWidth = 1.6 * unit;
  context.beginPath();
  context.moveTo(right.x, right.y);
  context.lineTo(left.x, left.y);
  context.stroke();
  [right, left].forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, 3.4 * unit, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y - 6 * unit);
    context.lineTo(point.x, point.y + 6 * unit);
    context.stroke();
  });

  drawPill(
    context,
    "PD " + metrics.pdMm.toFixed(1) + " mm",
    (right.x + left.x) / 2,
    (right.y + left.y) / 2 - 16 * unit,
    TEAL,
    unit
  );

  context.setLineDash([3 * unit, 3 * unit]);
  context.lineWidth = 1 * unit;
  context.beginPath();
  context.moveTo(right.x, right.y);
  context.lineTo(nasion.x, nasion.y);
  context.lineTo(left.x, left.y);
  context.stroke();
  context.setLineDash([]);

  context.font = "600 " + 9.5 * unit + "px ui-sans-serif, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("R " + metrics.rightPdMm.toFixed(1), right.x, right.y + 14 * unit);
  context.fillText("L " + metrics.leftPdMm.toFixed(1), left.x, left.y + 14 * unit);

  const widthY = Math.max(faceLeft.y, faceRight.y) + 10 * unit;
  context.strokeStyle = TEAL;
  context.lineWidth = 1.4 * unit;
  context.beginPath();
  context.moveTo(faceLeft.x, widthY);
  context.lineTo(faceRight.x, widthY);
  context.stroke();
  [faceLeft, faceRight].forEach((point) => {
    context.beginPath();
    context.moveTo(point.x, widthY - 4 * unit);
    context.lineTo(point.x, widthY + 4 * unit);
    context.stroke();
  });
  drawPill(
    context,
    "Face width " + metrics.faceWidthMm + " mm",
    (faceLeft.x + faceRight.x) / 2,
    widthY + 16 * unit,
    TEAL,
    unit
  );
}

/* -------------------------------------------------------------------- ui */

const ISSUE_TEXT = {
  turned: "Turn to face the camera",
  "slightly-turned": "Almost straight — square your shoulders",
  tilted: "Keep your head level",
  "slightly-tilted": "A little tilted",
  "too-far": "Move closer to the camera",
  far: "A bit far — move closer for detail",
  "small-in-frame": "Fill more of the frame",
  "odd-framing": "Face the camera straight on",
  "implausible-pd": "Measurement looks off — retake",
  "implausible-width": "Measurement looks off — retake",
};

const STEP_LABELS = [
  ["capture", "Capture"],
  ["review", "Review"],
  ["sheet", "A4 sheet"],
];

function StepChips({ step }) {
  return (
    <div className="flex items-center gap-1">
      {STEP_LABELS.map(([key, label], index) => {
        const done = STEP_LABELS.findIndex(([value]) => value === step) > index;
        const active = key === step;
        return (
          <React.Fragment key={key}>
            {index > 0 && <span className="h-px w-3 bg-border" />}
            <span
              className={clsx(
                "flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                active && "bg-primary text-primary-foreground",
                !active && done && "text-primary",
                !active && !done && "text-text-muted"
              )}
            >
              {done ? <Check size={11} strokeWidth={3} /> : <span>{index + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function GuideRow({ tone, label, value }) {
  const dot =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
      ? "bg-amber-500"
      : tone === "bad"
      ? "bg-rose-500"
      : "bg-border";
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm text-text-secondary">
        <span className={clsx("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </span>
      <span className="text-xs font-medium text-text-primary">{value}</span>
    </div>
  );
}

function StatCard({ label, value, unit, hint }) {
  return (
    <div className="rounded-[18px] border border-border bg-card-background p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl leading-none text-text-primary">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-text-secondary">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-snug text-text-muted">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------- component */

export default function FacePdfModal({
  onClose,
  productId,
  onSaved,
  onTakePhoto,
  knownPd,
  productName,
}) {
  const [step, setStep] = useState("capture");
  const [facing, setFacing] = useState("user");
  const [cameraStatus, setCameraStatus] = useState("loading");
  const [modelStatus, setModelStatus] = useState("loading");
  const [cameraError, setCameraError] = useState("");
  const [autoCapture, setAutoCapture] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [live, setLive] = useState(null);
  const [videoAspect, setVideoAspect] = useState(4 / 3);
  const [shot, setShot] = useState(null);
  const [knownPdInput, setKnownPdInput] = useState(() => {
    const initial = Number(knownPd);
    return Number.isFinite(initial) && initial >= PD_MIN && initial <= PD_MAX
      ? String(initial)
      : "";
  });
  const [applyPd, setApplyPd] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState(null);
  const [sheetError, setSheetError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const streamGenRef = useRef(0);
  const landmarkerRef = useRef(null);
  const runningRef = useRef(false);
  const aliveRef = useRef(true);
  const samplesRef = useRef([]);
  const goodSinceRef = useRef(0);
  const countdownRef = useRef(0);
  const lastEmitRef = useRef(0);
  const lastTsRef = useRef(0);
  const captureRef = useRef(null);
  const sheetUrlRef = useRef("");

  const knownValue = useMemo(() => {
    const value = Number(knownPdInput);
    return knownPdInput !== "" && Number.isFinite(value) && value >= PD_MIN && value <= PD_MAX
      ? value
      : null;
  }, [knownPdInput]);

  const storedKey = STORAGE_PREFIX + (productId || "photo");

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Lock the page behind the modal and close it with Escape.
  useEffect(() => {
    if (!isBrowser) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const stopCamera = useCallback(() => {
    streamGenRef.current += 1; // discard any getUserMedia call still in flight
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = 0;
    }
    setCountdown(0);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch (ignored) {}
      video.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(
    async (mode) => {
      stopCamera();
      setCameraStatus("loading");
      setCameraError("");
      setLive(null);
      samplesRef.current = [];
      goodSinceRef.current = 0;
      // A permission prompt that never settles (or a device that is slow to
      // wake) must not leave the panel spinning forever.
      const generation = (streamGenRef.current += 1);
      const request = requestStream(mode);
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        request
          .then((late) => late.getTracks().forEach((track) => track.stop()))
          .catch(() => {});
        if (!aliveRef.current) return;
        setCameraError(
          "The camera is taking too long. Allow access in the address bar, or upload a photo instead."
        );
        setCameraStatus("error");
      }, 12000);

      try {
        const stream = await request;
        clearTimeout(timer);
        if (timedOut || !aliveRef.current || generation !== streamGenRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play().catch(() => {});
        if (video.videoWidth && video.videoHeight) {
          setVideoAspect(video.videoWidth / video.videoHeight);
        }
        if (aliveRef.current) setCameraStatus("live");
      } catch (streamError) {
        clearTimeout(timer);
        if (!aliveRef.current || timedOut || generation !== streamGenRef.current) return;
        setCameraError(cameraErrorMessage(streamError));
        setCameraStatus("error");
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (step !== "capture") return undefined;
    startCamera(facing);
    return () => stopCamera();
  }, [step, facing, startCamera, stopCamera]);

  useEffect(
    () => () => {
      if (sheetUrlRef.current) URL.revokeObjectURL(sheetUrlRef.current);
    },
    []
  );

  /* ---------------------------------------------------------- capture */

  const cancelCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = 0;
    }
    setCountdown((current) => (current ? 0 : current));
  }, []);

  const beginCountdown = useCallback(() => {
    if (countdownRef.current) return;
    let remaining = 3;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = 0;
        setCountdown(0);
        captureRef.current?.();
      } else {
        setCountdown(remaining);
      }
    }, 700);
  }, []);

  const handleFrame = useCallback(
    (landmarks, width, height) => {
      const now = performance.now();
      const metrics = landmarks
        ? measureFace(landmarks, { width, height, knownPd: knownValue })
        : null;

      if (!metrics) {
        samplesRef.current = [];
        goodSinceRef.current = 0;
        cancelCountdown();
        if (now - lastEmitRef.current > 140) {
          lastEmitRef.current = now;
          setLive(null);
        }
        return;
      }

      const samples = samplesRef.current;
      if (metrics.level !== "poor") {
        samples.push(metrics);
        if (samples.length > 20) samples.shift();
      }
      const median = medianMetrics(samples);
      const values = samples.map((item) => item.pdMm);
      const spread = values.length
        ? (Math.max(...values) - Math.min(...values)) / (median?.pdMm || 1)
        : 1;
      const steady = samples.length >= 7 && spread < 0.02;

      if (autoCapture && metrics.level === "good" && steady) {
        if (!goodSinceRef.current) goodSinceRef.current = now;
        else if (now - goodSinceRef.current > 900) beginCountdown();
      } else {
        goodSinceRef.current = 0;
        cancelCountdown();
      }

      if (now - lastEmitRef.current > 140) {
        lastEmitRef.current = now;
        setLive({
          level: metrics.level,
          issues: metrics.issues,
          pdMm: median ? median.pdMm : metrics.pdMm,
          faceWidthMm: median ? median.faceWidthMm : metrics.faceWidthMm,
          steady,
          samples: samples.length,
        });
      }
    },
    [autoCapture, beginCountdown, cancelCountdown, knownValue]
  );

  useEffect(() => {
    if (step !== "capture" || cameraStatus !== "live") return undefined;
    runningRef.current = true;
    let raf = 0;
    let lastTime = -1;

    const loop = () => {
      if (!runningRef.current) return;
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) return;
      if (video.currentTime === lastTime) return;
      lastTime = video.currentTime;
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const landmarks = result.faceLandmarks?.[0] || null;
        handleFrame(landmarks, video.videoWidth, video.videoHeight);
      } catch (detectionError) {
        // a dropped frame must not stop the loop
      }
    };

    setModelStatus((current) => (current === "ready" ? current : "loading"));
    loadLandmarker()
      .then((landmarker) => {
        landmarkerRef.current = landmarker;
        if (!aliveRef.current || !runningRef.current) return;
        setModelStatus("ready");
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        if (!aliveRef.current) return;
        setModelStatus("error");
        setCameraError("The face model could not load. Check your connection, or upload a photo.");
      });

    return () => {
      runningRef.current = false;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [step, cameraStatus, handleFrame]);

  const finishCapture = useCallback(
    (canvas, landmarks, width, height) => {
      const metrics = landmarks
        ? measureFace(landmarks, { width, height, knownPd: knownValue })
        : null;
      setShot({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        landmarks,
        width,
        height,
        at: Date.now(),
      });
      setError("");
      setStep("review");
      if (metrics && metrics.level === "poor") {
        setError("Your head was not straight. Retake for a more accurate print.");
      }
    },
    [knownValue]
  );

  const captureNow = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.readyState < 2) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(video, 0, 0, width, height);
    // Landmarks from the exact pixels that were just captured, so the lines
    // drawn on the sheet sit where they were measured.
    const stamp = Math.max(performance.now(), lastTsRef.current + 2);
    lastTsRef.current = stamp;
    let landmarks = null;
    try {
      const result = landmarker.detectForVideo(canvas, stamp);
      landmarks = result.faceLandmarks?.[0] || null;
    } catch (detectionError) {
      landmarks = null;
    }
    finishCapture(canvas, landmarks, width, height);
  }, [finishCapture]);

  captureRef.current = captureNow;

  /* ----------------------------------------------------------- upload */

  const handleFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setBusy("upload");
      setError("");
      try {
        const dataUrl = await readFile(file);
        const image = await loadImage(dataUrl);
        const canvas = shrinkImage(image, MAX_UPLOAD_PX);
        const landmarker = await loadLandmarker();
        landmarkerRef.current = landmarker;
        const stamp = Math.max(performance.now(), lastTsRef.current + 2);
        lastTsRef.current = stamp;
        const result = landmarker.detectForVideo(canvas, stamp);
        const landmarks = result.faceLandmarks?.[0] || null;
        if (!landmarks) {
          setError("No face found in that photo. Use a straight, well-lit portrait.");
          return;
        }
        finishCapture(canvas, landmarks, canvas.width, canvas.height);
      } catch (uploadError) {
        setError(uploadError?.message || "That photo could not be used.");
      } finally {
        if (aliveRef.current) setBusy("");
      }
    },
    [finishCapture]
  );

  /* ----------------------------------------------------------- review */

  const metrics = useMemo(() => {
    if (!shot?.landmarks) return null;
    return measureFace(shot.landmarks, {
      width: shot.width,
      height: shot.height,
      knownPd: knownValue,
    });
  }, [shot, knownValue]);

  useEffect(() => {
    if (step !== "review" || !shot) return undefined;
    const canvas = overlayRef.current;
    if (!canvas) return undefined;
    const paint = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(parent.clientWidth * ratio));
      canvas.height = Math.max(1, Math.round(parent.clientHeight * ratio));
      drawShotOverlay(canvas, metrics, shot.width, shot.height);
    };
    paint();
    window.addEventListener("resize", paint);
    return () => window.removeEventListener("resize", paint);
  }, [step, shot, metrics]);

  /* ------------------------------------------------------------ sheet */

  const buildSheet = useCallback(
    async (targetShot, targetMetrics) => {
      let image = targetShot.dataUrl;
      let imageWidthMm = null;
      let imageHeightMm = null;
      let aspect = targetShot.width / targetShot.height;
      let crop = null;

      if (targetMetrics?.mmPerPx) {
        crop = cropForSheet(targetShot.landmarks, {
          width: targetShot.width,
          height: targetShot.height,
          mmPerPx: targetMetrics.mmPerPx,
        });
      }

      if (crop) {
        const source = await loadImage(targetShot.dataUrl);
        const scale = Math.min(1, 1600 / Math.max(crop.width, crop.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(crop.width * scale));
        canvas.height = Math.max(1, Math.round(crop.height * scale));
        canvas
          .getContext("2d")
          .drawImage(
            source,
            crop.x,
            crop.y,
            crop.width,
            crop.height,
            0,
            0,
            canvas.width,
            canvas.height
          );
        image = canvas.toDataURL("image/jpeg", 0.92);
        imageWidthMm = crop.mmWidth;
        imageHeightMm = crop.mmHeight;
        aspect = crop.width / crop.height;
      }

      return buildFaceSheet({
        image,
        imageWidthMm,
        imageHeightMm,
        imageAspect: aspect,
        metrics: targetMetrics,
        crop,
        productName: productName || "",
        takenAt: new Date(targetShot.at || Date.now()),
      });
    },
    [productName]
  );

  useEffect(() => {
    if (step !== "sheet" || !shot) return undefined;
    let cancelled = false;
    setBusy("sheet");
    setSheetError("");
    buildSheet(shot, metrics)
      .then((built) => {
        if (cancelled || !aliveRef.current) return;
        if (sheetUrlRef.current) URL.revokeObjectURL(sheetUrlRef.current);
        const url = built.doc.output("bloburl");
        sheetUrlRef.current = url;
        setSheet({ url, calibrated: built.calibrated, at: new Date() });
      })
      .catch((buildError) => {
        if (!cancelled) setSheetError("The A4 sheet could not be prepared.");
      })
      .finally(() => {
        if (!cancelled && aliveRef.current) setBusy("");
      });
    return () => {
      cancelled = true;
    };
  }, [step, shot, metrics, buildSheet]);

  const downloadSheet = useCallback(() => {
    if (!sheet?.url) return;
    const link = document.createElement("a");
    link.href = sheet.url;
    link.download = "face-measurement-" + formatStamp(new Date()).replace(/[ :]/g, "-") + ".pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [sheet]);

  const printSheet = useCallback(async () => {
    if (!shot) return;
    try {
      setBusy("print");
      const built = await buildSheet(shot, metrics);
      built.doc.autoPrint();
      const url = built.doc.output("bloburl");
      const opened = window.open(url, "_blank");
      if (!opened) downloadSheet();
    } catch (printError) {
      setSheetError("Printing could not be started. Download the PDF instead.");
    } finally {
      if (aliveRef.current) setBusy("");
    }
  }, [shot, metrics, buildSheet, downloadSheet]);

  /* ------------------------------------------------------------- save */

  const publishPd = useCallback((value) => {
    if (!value) return;
    const total = Math.round(value.pdMm * 10) / 10;
    try {
      localStorage.setItem("measuredPD", String(total));
      localStorage.setItem("pdMeasurementTimestamp", String(Date.now()));
    } catch (ignored) {}
    if (isBrowser) {
      window.dispatchEvent(
        new CustomEvent("pd:measured", {
          detail: { pd: total, right: value.rightPdMm, left: value.leftPdMm },
        })
      );
    }
  }, []);

  const storePhoto = useCallback(async () => {
    const image = await loadImage(shot.dataUrl);
    const attempts = [
      { maxSide: MAX_STORED_PX, quality: 0.85 },
      { maxSide: 1100, quality: 0.75 },
      { maxSide: 800, quality: 0.7 },
    ];
    let lastError = null;
    for (const attempt of attempts) {
      const canvas = shrinkImage(image, attempt.maxSide);
      const dataUrl = canvas.toDataURL("image/jpeg", attempt.quality);
      try {
        localStorage.setItem(storedKey, dataUrl);
        return dataUrl;
      } catch (quotaError) {
        lastError = quotaError;
      }
    }
    throw lastError || new Error("Storage unavailable");
  }, [shot, storedKey]);

  const usePhoto = useCallback(async () => {
    if (!shot) return;
    setBusy("save");
    setError("");
    try {
      const dataUrl = await storePhoto();
      const meta = buildFaceMeta(metrics, shot);
      try {
        // drop the previous key format so old photos do not linger
        localStorage.removeItem("face:" + (productId || "photo"));
      } catch (ignored) {}

      // The measurements, and the A4 sheet itself, are kept next to the photo
      // so the order can carry them to the shop.
      const metaKey = "facePhotoMeta:" + (productId || "photo");
      const sheetKey = "faceSheet:" + (productId || "photo");
      try {
        if (meta) localStorage.setItem(metaKey, JSON.stringify(meta));
      } catch (ignored) {}
      if (meta) {
        try {
          const built = await buildSheet(shot, metrics);
          const sheetUrl = await pdfToDataUrl(built.doc);
          localStorage.setItem(sheetKey, sheetUrl);
        } catch (sheetFailure) {
          // A full disk or a blocked export must never stop the order.
          try {
            localStorage.removeItem(sheetKey);
          } catch (ignored) {}
        }
      }

      if (applyPd && metrics) publishPd(metrics);
      onTakePhoto?.(dataUrl, meta);
      onSaved?.(storedKey);
      onClose?.();
    } catch (saveError) {
      setError(
        "This device refused to store the photo (" +
          (saveError?.name || "error") +
          "). Free some space, or download the PDF instead."
      );
    } finally {
      if (aliveRef.current) setBusy("");
    }
  }, [
    shot,
    storePhoto,
    productId,
    applyPd,
    metrics,
    publishPd,
    onTakePhoto,
    onSaved,
    onClose,
    storedKey,
    buildSheet,
  ]);

  const retake = useCallback(() => {
    setShot(null);
    setError("");
    setStep("capture");
  }, []);

  /* -------------------------------------------------------------- ui */

  const levelTone = (value) =>
    value === "ok" ? "ok" : value === "warn" ? "warn" : value === "bad" ? "bad" : "idle";

  const liveRows = (() => {
    if (!live) {
      return [
        ["Face in frame", "waiting", "idle"],
        ["Head straight", "waiting", "idle"],
        ["Eyes level", "waiting", "idle"],
        ["Close enough", "waiting", "idle"],
      ];
    }
    const has = (code) => live.issues.includes(code);
    return [
      ["Face in frame", "found", "ok"],
      [
        "Head straight",
        has("turned") ? "turn" : has("slightly-turned") ? "almost" : "good",
        has("turned") ? "bad" : has("slightly-turned") ? "warn" : "ok",
      ],
      [
        "Eyes level",
        has("tilted") ? "level it" : has("slightly-tilted") ? "almost" : "good",
        has("tilted") ? "bad" : has("slightly-tilted") ? "warn" : "ok",
      ],
      [
        "Close enough",
        has("too-far") ? "too far" : has("far") || has("small-in-frame") ? "closer" : "good",
        has("too-far") ? "bad" : has("far") || has("small-in-frame") ? "warn" : "ok",
      ],
    ];
  })();

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Face photo"
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-card-background text-text-primary sm:h-[min(94vh,900px)] sm:max-w-5xl sm:rounded-[26px] sm:border sm:border-border sm:shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Camera size={18} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-gold">
                Face photo
              </p>
              <h2 className="font-display text-lg leading-tight sm:text-xl">
                Measure and print at true size
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StepChips step={step} />
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-text-secondary transition hover:bg-black/5"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {error ? (
            <div className="mb-4 flex items-start gap-2 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span>{error}</span>
            </div>
          ) : null}

          {step === "capture" ? (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <div className="space-y-3">
                <div
                  className="relative overflow-hidden rounded-[22px] border border-border bg-black"
                  style={{ aspectRatio: String(videoAspect) }}
                >
                  <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
                    muted
                    playsInline
                    autoPlay
                  />

                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    aria-hidden="true"
                  >
                    <ellipse
                      cx="50"
                      cy="47"
                      rx="25"
                      ry="34"
                      fill="none"
                      stroke="rgba(255,255,255,0.72)"
                      strokeWidth="0.5"
                      strokeDasharray="2.2 1.8"
                    />
                    <line
                      x1="50"
                      y1="13"
                      x2="50"
                      y2="81"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="0.35"
                    />
                    <line
                      x1="25"
                      y1="40"
                      x2="75"
                      y2="40"
                      stroke="rgba(255,255,255,0.22)"
                      strokeWidth="0.35"
                    />
                  </svg>

                  <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-center gap-1.5">
                    <span
                      className={clsx(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur",
                        live
                          ? "bg-emerald-500/20 text-emerald-50"
                          : "bg-black/45 text-white/80"
                      )}
                    >
                      <span
                        className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          live ? "bg-emerald-300" : "bg-white/50"
                        )}
                      />
                      {live ? "Face detected" : "Looking for your face"}
                    </span>
                    {live ? (
                      <span className="rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white backdrop-blur">
                        PD {live.pdMm.toFixed(1)} mm
                      </span>
                    ) : null}
                    {live?.steady ? (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-50 backdrop-blur">
                        steady
                      </span>
                    ) : null}
                  </div>

                  {countdown > 0 ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/30">
                      <span className="grid h-20 w-20 place-items-center rounded-full bg-white/90 font-display text-4xl text-black">
                        {countdown}
                      </span>
                    </div>
                  ) : null}

                  {cameraStatus !== "live" ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/70 px-6 text-center">
                      {cameraStatus === "loading" ? (
                        <div className="space-y-2 text-white/80">
                          <Loader2 className="mx-auto animate-spin" size={22} />
                          <p className="text-xs">Starting the camera…</p>
                          <p className="text-[10px] text-white/50">
                            Allow access if your browser asks
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 text-white/85">
                          <Camera className="mx-auto" size={22} />
                          <p className="text-xs leading-relaxed">{cameraError}</p>
                          <button
                            type="button"
                            onClick={() => startCamera(facing)}
                            className="mx-auto flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-black"
                          >
                            <RefreshCw size={12} /> Try again
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1">
                    <Ruler size={13} /> Print stays true to life
                  </span>
                  <span className="h-3 w-px bg-border" />
                  <button
                    type="button"
                    onClick={() => setFacing((current) => (current === "user" ? "environment" : "user"))}
                    className="flex items-center gap-1 font-medium text-text-secondary transition hover:text-primary"
                  >
                    <RefreshCw size={12} /> Switch camera
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[20px] border border-border bg-card-background p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                      Live check
                    </p>
                    <span className="text-[10px] text-text-muted">
                      {modelStatus === "ready" ? "model ready" : modelStatus === "error" ? "model failed" : "loading model…"}
                    </span>
                  </div>
                  <div className="mt-1 divide-y divide-border/70">
                    {liveRows.map(([label, value, tone]) => (
                      <GuideRow key={label} label={label} value={value} tone={levelTone(tone)} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-end justify-between rounded-[14px] bg-black/[0.03] px-3 py-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Pupillary distance</p>
                      <p className="font-display text-2xl leading-tight tabular-nums">
                        {live ? live.pdMm.toFixed(1) : "--"}
                        <span className="ml-1 text-[11px] font-normal text-text-secondary">mm</span>
                      </p>
                    </div>
                    <span className="pb-1 text-[10px] text-text-muted">
                      {live ? live.faceWidthMm + " mm wide" : "waiting"}
                    </span>
                  </div>
                </div>

                <div className="rounded-[20px] border border-border bg-card-background p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    How to stand
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-secondary">
                    <li>Face a window or a lamp, no backlight.</li>
                    <li>Take off glasses, look straight into the lens.</li>
                    <li>Neutral face, hair away from the eyes.</li>
                    <li>About 50 to 70 cm away, chin level.</li>
                  </ul>
                </div>

                <div className="rounded-[20px] border border-border bg-card-background p-4">
                  <label
                    htmlFor="face-known-pd"
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted"
                  >
                    Know your PD? (optional)
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="face-known-pd"
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      min={PD_MIN}
                      max={PD_MAX}
                      value={knownPdInput}
                      onChange={(event) => setKnownPdInput(event.target.value)}
                      placeholder="e.g. 63.5"
                      className="w-full rounded-[12px] border border-border bg-transparent px-3 py-2 text-sm outline-none transition focus:border-primary"
                    />
                    <span className="text-[11px] text-text-muted">mm</span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
                    With your PD the sheet is exact. Without it we scale from the iris, which is close but about 5% off.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {step === "review" && shot ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <div className="rounded-[22px] border border-border bg-black/5 p-2">
                  <div
                    className="relative w-full overflow-hidden rounded-[16px] bg-black"
                    style={{ aspectRatio: shot.width + " / " + shot.height }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.dataUrl}
                      alt="Captured face"
                      className="h-full w-full object-contain"
                    />
                    <canvas ref={overlayRef} className="absolute inset-0 h-full w-full" />
                  </div>
                </div>
                <p className="px-1 text-[11px] leading-relaxed text-text-muted">
                  The lines are the real measurements, drawn on your photo. Nothing is resized or stretched.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-[20px] border border-border bg-card-background p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    Your measurement
                  </p>
                  <div className="mt-1 flex items-end gap-2">
                    <span className="font-display text-4xl leading-none tabular-nums">
                      {metrics ? metrics.pdMm.toFixed(1) : "--"}
                    </span>
                    <span className="pb-1 text-sm text-text-secondary">mm PD</span>
                  </div>
                  <p className="mt-2 text-xs text-text-secondary">
                    {metrics
                      ? "Right " +
                        metrics.rightPdMm.toFixed(1) +
                        " mm · Left " +
                        metrics.leftPdMm.toFixed(1) +
                        " mm"
                      : "No face found in this photo."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Face width"
                    value={metrics ? metrics.faceWidthMm : "--"}
                    unit={metrics ? "mm" : ""}
                    hint="cheekbones"
                  />
                  <StatCard
                    label="Scale"
                    value={metrics?.calibration === "known-pd" ? "exact" : metrics ? "approx." : "--"}
                    unit=""
                    hint={metrics?.calibration === "known-pd" ? "from your PD" : "from the iris"}
                  />
                </div>

                {metrics && metrics.calibration === "known-pd" ? (
                  <p className="rounded-[14px] bg-black/[0.03] px-3 py-2 text-[11px] text-text-secondary">
                    The iris alone reads {metrics.irisPdMm.toFixed(1)} mm. Your PD of
                    {" "}
                    {metrics.pdMm.toFixed(1)} mm is used for the scale, so the print is exact.
                  </p>
                ) : null}

                {metrics && metrics.issues.length ? (
                  <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    <strong className="font-semibold">Retake for the best print:</strong>{" "}
                    {metrics.issues.map((code) => ISSUE_TEXT[code] || code).join(". ")}.
                  </div>
                ) : null}

                <div className="rounded-[20px] border border-border bg-card-background p-4">
                  <label
                    htmlFor="face-known-pd-review"
                    className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted"
                  >
                    Your PD (mm)
                  </label>
                  <input
                    id="face-known-pd-review"
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={PD_MIN}
                    max={PD_MAX}
                    value={knownPdInput}
                    onChange={(event) => setKnownPdInput(event.target.value)}
                    placeholder="optional"
                    className="mt-2 w-full rounded-[12px] border border-border bg-transparent px-3 py-2 text-sm outline-none transition focus:border-primary"
                  />
                  <label className="mt-3 flex items-start gap-2 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={applyPd}
                      onChange={(event) => setApplyPd(event.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Use this measurement as my PD on this order.</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 rounded-[16px] bg-black/[0.03] px-3 py-2 text-[11px] text-text-muted">
                  <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
                  Your photo stays on this device until you place the order.
                </div>
              </div>
            </div>
          ) : null}

          {step === "sheet" ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
              <div className="overflow-hidden rounded-[18px] border border-border bg-white">
                {busy === "sheet" ? (
                  <div className="grid h-[52vh] place-items-center gap-2 text-text-muted">
                    <Loader2 className="animate-spin" size={20} />
                    <p className="text-xs">Preparing the A4 sheet…</p>
                  </div>
                ) : sheetError ? (
                  <div className="grid h-[52vh] place-items-center px-6 text-center text-xs text-text-muted">
                    {sheetError}
                  </div>
                ) : isMobile ? (
                  <div className="grid h-[42vh] place-items-center gap-2 px-6 text-center">
                    <FileText className="text-text-muted" size={22} />
                    <p className="text-xs text-text-muted">
                      The A4 sheet is ready. Open it to check the 100 mm ruler before printing.
                    </p>
                    {sheet?.url ? (
                      <a
                        href={sheet.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-primary underline"
                      >
                        Open the A4 preview
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <iframe
                    title="A4 face sheet preview"
                    src={sheet?.url || "about:blank"}
                    className="h-[60vh] w-full"
                  />
                )}
              </div>

              <aside className="space-y-3">
                <div className="rounded-[18px] border border-border bg-card-background p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    On the sheet
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-text-secondary">
                    <li className="flex gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Face printed at {metrics?.mmPerPx ? "true (1:1) size" : "reference, not to scale"}
                    </li>
                    <li className="flex gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      PD, left and right PD lines
                    </li>
                    <li className="flex gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Face width and a 100 mm ruler
                    </li>
                  </ul>
                </div>

                <p className="rounded-[14px] bg-black/[0.03] px-3 py-2 text-[11px] leading-relaxed text-text-secondary">
                  The sheet crops close to the face, so the head fills the print without
                  changing its size.
                </p>

                <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-900">
                  <p className="font-semibold">Print at 100%</p>
                  <p className="mt-1">
                    In the print dialog choose actual size. If the 100 mm line is off, the paper is not true size.
                  </p>
                </div>

                {sheet?.calibrated === false ? (
                  <p className="rounded-[14px] bg-black/[0.03] px-3 py-2 text-[11px] text-text-muted">
                    This photo has no scale, so the sheet is labelled not to scale.
                  </p>
                ) : null}
              </aside>
            </div>
          ) : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card-background px-4 py-3 sm:px-6">
          {step === "capture" ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy === "upload"}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-black/5 disabled:opacity-50"
              >
                {busy === "upload" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Upload
              </button>

              <button
                type="button"
                onClick={captureNow}
                disabled={cameraStatus !== "live" || modelStatus !== "ready"}
                aria-label="Take photo"
                className="grid h-16 w-16 place-items-center rounded-full border-2 border-primary/25 bg-primary/5 transition hover:bg-primary/10 disabled:opacity-40"
              >
                <span className="block h-11 w-11 rounded-full bg-primary shadow-inner" />
              </button>

              <button
                type="button"
                onClick={() => setAutoCapture((current) => !current)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition",
                  autoCapture
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-text-secondary hover:bg-black/5"
                )}
              >
                <RefreshCw size={13} /> Auto
              </button>
            </>
          ) : null}

          {step === "review" ? (
            <>
              <button
                type="button"
                onClick={retake}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-black/5"
              >
                <RefreshCw size={14} /> Retake
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={usePhoto}
                  disabled={!!busy}
                  className="rounded-full border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-black/5 disabled:opacity-50"
                >
                  Use photo only
                </button>
                <button
                  type="button"
                  onClick={() => setStep("sheet")}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Continue <ChevronRight size={14} />
                </button>
              </div>
            </>
          ) : null}

          {step === "sheet" ? (
            <>
              <button
                type="button"
                onClick={() => setStep("review")}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-black/5"
              >
                <ChevronLeft size={14} /> Back
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSheet}
                  disabled={!sheet?.url}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-black/5 disabled:opacity-50"
                >
                  <Download size={14} /> PDF
                </button>
                <button
                  type="button"
                  onClick={printSheet}
                  disabled={!shot || !!busy}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium text-text-secondary transition hover:bg-black/5 disabled:opacity-50"
                >
                  {busy === "print" ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                  Print
                </button>
                <button
                  type="button"
                  onClick={usePhoto}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {busy === "save" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Use this photo
                </button>
              </div>
            </>
          ) : null}
        </footer>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}