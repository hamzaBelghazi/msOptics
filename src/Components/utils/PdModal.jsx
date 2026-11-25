import clsx from "clsx";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// The WASM runtime and the model ship with the app in /public/mediapipe, so
// the measurement works offline and does not depend on CDNs that are often
// blocked or throttled. The CDN copies stay as a last-resort fallback.
const LOCAL_VISION_PATH = "/mediapipe/wasm";
const LOCAL_MODEL_PATH = "/mediapipe/face_landmarker.task";
const CDN_VISION_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const CDN_MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const IRIS_WIDTH_IN_MM = 12;
const PD_MIN = 40;
const PD_MAX = 85;
const SAMPLE_SIZE = 18;

const roundHalf = (value) => Math.round(value * 2) / 2;

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Distance between two normalised landmarks. The x axis is corrected by the
// video aspect ratio so the result is measured in square (normalised) units.
const normDistance = (a, b, aspect) =>
  Math.hypot((a.x - b.x) * aspect, a.y - b.y);

const PdModal = ({
  openModal,
  setOpenModal,
  isAutomaticMeasurePd,
  setIsAutomaticMeasurePd,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const landmarkerPromiseRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const samplesRef = useRef([]);
  const lastSavedRef = useRef({ at: 0, value: 0 });
  const [pd, setPd] = useState(0);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  // Load the face landmarker once and reuse it for every measurement session.
  const loadLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    if (!landmarkerPromiseRef.current) {
      landmarkerPromiseRef.current = (async () => {
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

        let landmarker;
        try {
          landmarker = await createWith(LOCAL_VISION_PATH, LOCAL_MODEL_PATH);
        } catch (localError) {
          console.error("Local face landmarker failed, retrying CDN:", localError);
          landmarker = await createWith(CDN_VISION_PATH, CDN_MODEL_PATH);
        }
        landmarkerRef.current = landmarker;
        return landmarker;
      })().catch((err) => {
        landmarkerPromiseRef.current = null;
        throw err;
      });
    }
    return landmarkerPromiseRef.current;
  }, []);

  // Some webcams reject `facingMode: { exact: "user" }`; fall back gradually
  // instead of failing with an OverconstrainedError.
  const requestStream = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const err = new Error("Camera API unavailable");
      err.name = "NotSupportedError";
      throw err;
    }
    const attempts = [
      {
        video: {
          facingMode: { exact: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      },
      {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
      { video: true, audio: false },
    ];
    let lastError;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        lastError = err;
        // Permission was refused: retrying with other constraints cannot help.
        if (err?.name === "NotAllowedError" || err?.name === "SecurityError") break;
      }
    }
    throw lastError;
  }, []);

  const stopMeasure = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (_) {}
      videoRef.current.srcObject = null;
    }
    lastVideoTimeRef.current = -1;
    samplesRef.current = [];
    setIsFaceDetected(false);
  }, []);

  const publish = useCallback((value) => {
    const rounded = roundHalf(value);
    setPd(rounded);
    try {
      localStorage.setItem("measuredPD", String(rounded));
      localStorage.setItem("pdMeasurementTimestamp", String(Date.now()));
    } catch (_) {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pd:measured", { detail: { pd: rounded } })
      );
    }
  }, []);

  const drawOverlay = useCallback((landmarks, canvas) => {
    const video = videoRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    // Match the letterboxing of the video element (object-contain).
    const scale = Math.min(cw / vw, ch / vh);
    const offsetX = (cw - vw * scale) / 2;
    const offsetY = (ch - vh * scale) / 2;
    const px = (p) => offsetX + p.x * vw * scale;
    const py = (p) => offsetY + p.y * vh * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPoint = (p, color, size) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px(p), py(p), size, 0, Math.PI * 2);
      ctx.fill();
    };
    const drawSegment = (a, b, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(b), py(b));
      ctx.stroke();
    };

    drawPoint(landmarks[6], "#FF6B6B", 2);
    drawPoint(landmarks[4], "#FF6B6B", 2);
    drawPoint(landmarks[168], "#FF6B6B", 2);

    const eyeContours = [
      [159, 160, 161],
      [163, 144, 145],
      [386, 387, 388],
      [390, 373, 374],
    ];
    eyeContours.forEach((points) => {
      for (let i = 0; i < points.length - 1; i += 1) {
        drawSegment(landmarks[points[i]], landmarks[points[i + 1]], "#4CAF50");
      }
    });

    const leftIris = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS;
    const rightIris = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS;
    const leftCenter = {
      x: (landmarks[leftIris[0].start].x + landmarks[leftIris[2].start].x) / 2,
      y: (landmarks[leftIris[0].start].y + landmarks[leftIris[2].start].y) / 2,
    };
    const rightCenter = {
      x: (landmarks[rightIris[0].start].x + landmarks[rightIris[2].start].x) / 2,
      y: (landmarks[rightIris[0].start].y + landmarks[rightIris[2].start].y) / 2,
    };

    drawPoint(leftCenter, "#FFD700", 4);
    drawPoint(rightCenter, "#FFD700", 4);
    drawSegment(leftCenter, rightCenter, "#00BCD4");
  }, []);

  const readPd = useCallback((landmarks, aspect) => {
    const leftIris = FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS;
    const rightIris = FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS;
    const leftA = landmarks[leftIris[0].start];
    const leftB = landmarks[leftIris[2].start];
    const rightA = landmarks[rightIris[0].start];
    const rightB = landmarks[rightIris[2].start];
    const leftCenter = { x: (leftA.x + leftB.x) / 2, y: (leftA.y + leftB.y) / 2 };
    const rightCenter = { x: (rightA.x + rightB.x) / 2, y: (rightA.y + rightB.y) / 2 };
    const irisWidth = normDistance(leftA, leftB, aspect);
    const pupilDistance = normDistance(leftCenter, rightCenter, aspect);
    if (!irisWidth || !pupilDistance) return null;
    return (IRIS_WIDTH_IN_MM / irisWidth) * pupilDistance;
  }, []);

  const predictWebcam = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;

    if (video && canvas && landmarker && video.readyState >= 2 && video.videoWidth) {
      if (lastVideoTimeRef.current !== video.currentTime) {
        lastVideoTimeRef.current = video.currentTime;
        let results;
        try {
          results = landmarker.detectForVideo(video, performance.now());
        } catch (err) {
          console.error("Face detection error:", err);
        }
        const landmarks = results?.faceLandmarks?.[0];
        const detected = Boolean(landmarks);
        setIsFaceDetected((prev) => (prev === detected ? prev : detected));

        if (landmarks) {
          const aspect = video.videoWidth / video.videoHeight;
          const value = readPd(landmarks, aspect);
          if (value && value >= PD_MIN && value <= PD_MAX) {
            samplesRef.current.push(value);
            if (samplesRef.current.length > SAMPLE_SIZE) {
              samplesRef.current.shift();
            }
            // Wait for a few samples so the number does not jump while the
            // face settles in front of the camera.
            if (samplesRef.current.length >= 6) {
              const stable = roundHalf(median(samplesRef.current));
              if (stable && stable !== lastSavedRef.current.value) {
                lastSavedRef.current = { at: Date.now(), value: stable };
                publish(stable);
              }
            }
          }
          drawOverlay(landmarks, canvas);
        } else {
          samplesRef.current = [];
          const ctx = canvas.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    rafRef.current = requestAnimationFrame(predictWebcam);
  }, [drawOverlay, publish, readPd]);

  const startMeasure = useCallback(async () => {
    if (runningRef.current) return;
    setError("");
    setStatus("loading");
    try {
      const landmarker = await loadLandmarker();
      if (!landmarker) throw new Error("Measurement engine unavailable");
      setStatus("starting");
      const stream = await requestStream();
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video element unavailable");
      video.srcObject = stream;
      try {
        await video.play();
      } catch (_) {}
      samplesRef.current = [];
      lastSavedRef.current = { at: 0, value: 0 };
      setStatus("running");
      runningRef.current = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(predictWebcam);
    } catch (err) {
      console.error("PD measurement could not start:", err);
      stopMeasure();
      setStatus("error");
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        setError(
          "Camera access was blocked. Allow the camera for this site (HTTPS or localhost) and try again."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        setError("No usable camera was found on this device.");
      } else if (err?.name === "NotSupportedError") {
        setError("This browser does not expose a camera. Open the page over HTTPS or localhost.");
      } else {
        setError(
          "The measurement engine could not start. Check your connection and retry."
        );
      }
      setIsAutomaticMeasurePd(false);
    }
  }, [
    loadLandmarker,
    predictWebcam,
    requestStream,
    setIsAutomaticMeasurePd,
    stopMeasure,
  ]);

  // Warm up the model as soon as the tool is opened so pressing "Start" only
  // has to open the camera.
  useEffect(() => {
    if (!openModal) return;
    loadLandmarker().catch(() => {});
  }, [openModal, loadLandmarker]);

  // Start/stop with the modal and the measurement toggle. Keeping openModal in
  // the dependency list fixes the "reopen the tool and get a black frame" bug.
  useEffect(() => {
    if (openModal && isAutomaticMeasurePd) {
      startMeasure();
    } else {
      stopMeasure();
      if (!openModal) {
        setStatus("idle");
        setError("");
      }
    }
  }, [openModal, isAutomaticMeasurePd, startMeasure, stopMeasure]);

  useEffect(() => () => stopMeasure(), [stopMeasure]);

  const handleClose = () => {
    stopMeasure();
    setOpenModal(false);
  };

  if (!openModal) {
    return null;
  }

  const statusText =
    status === "loading"
      ? "Loading the measurement engine…"
      : status === "starting"
      ? "Starting the camera…"
      : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className={clsx(
          "w-full md:w-1/2 glass-strong rounded-t-[1.8rem] py-10 shadow-2xl transform transition-transform duration-300 pointer-events-auto",
          openModal ? "translate-y-0" : "translate-y-full",
          isAutomaticMeasurePd ? "h-full" : ""
        )}
        style={{ overflowY: "auto" }}
      >
        <div className="relative">
          <button
            type="button"
            aria-label="Close PD measurement"
            className="absolute h-10 w-10 right-4 top-0 bottom-0 my-auto cursor-pointer flex items-center justify-center rounded-full bg-neutral-300 hover:bg-neutral-400 transition-all duration-300 z-10"
            onClick={handleClose}
          >
            <svg
              width="15"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 320 512"
              fill="currentColor"
            >
              <path d="M312.1 375c9.369 9.369 9.369 24.57 0 33.94s-24.57 9.369-33.94 0L160 289.9l-119 119c-9.369 9.369-24.57 9.369-33.94 0s-9.369-24.57 0-33.94L126.1 256L7.027 136.1c-9.369-9.369-9.369-24.57 0-33.94s24.57-9.369 33.94 0L160 222.1l119-119c9.369-9.369 24.57-9.369 33.94 0s9.369 24.57 0 33.94L193.9 256L312.1 375z" />
            </svg>
          </button>
        </div>
        <div className="p-4 pt-0">
          {isAutomaticMeasurePd && (
            <>
              <div className="flex justify-between items-center mt-4 mb-2 px-2">
                <div className="text-text-secondary text-sm font-medium">
                  Measured PD:
                </div>
                <div className="flex items-center gap-2 bg-sky-100 text-sky-800 px-4 py-1 rounded-full font-bold">
                  <span
                    className={clsx("w-2 h-2 rounded-full", isFaceDetected ? "bg-green-500" : "bg-amber-400")}
                    aria-hidden="true"
                  />
                  {pd ? `${pd} mm` : "—"}
                </div>
              </div>
              <div className="relative rounded-lg overflow-hidden aspect-video bg-black shadow-lg">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain"
                  autoPlay
                  playsInline
                  muted
                  style={{
                    transform: "scaleX(-1)",
                    WebkitTransform: "scaleX(-1)",
                    MozTransform: "scaleX(-1)",
                    msTransform: "scaleX(-1)",
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{
                    transform: "scaleX(-1)",
                    WebkitTransform: "scaleX(-1)",
                    MozTransform: "scaleX(-1)",
                    msTransform: "scaleX(-1)",
                    mixBlendMode: "screen",
                  }}
                />
                <div className="absolute right-2 top-2 flex flex-col items-center gap-2">
                  {!isFaceDetected && (
                    <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm animate-pulse">
                      Look straight at the camera and keep your head still
                    </div>
                  )}
                  {isFaceDetected && (
                    <div className="bg-green-500/80 text-white px-2 py-2 rounded-full text-xs backdrop-blur-sm flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Face detected
                    </div>
                  )}
                </div>
                {(status === "loading" || status === "starting") && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white text-sm">
                    <span className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>{statusText}</span>
                  </div>
                )}
              </div>
              {pd ? (
                <p className="mt-3 text-center text-xs text-text-secondary">
                  Applied to your prescription automatically. Keep your head still
                  for a few seconds to refine it.
                </p>
              ) : null}
            </>
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="my-8 flex flex-col gap-2">
            <button
              type="button"
              className={clsx(
                "rounded-full cursor-pointer w-full px-4 py-3 text-white transition-all duration-300 font-medium flex items-center justify-center gap-2",
                isAutomaticMeasurePd
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-sky-600 hover:bg-sky-700"
              )}
              onClick={() => setIsAutomaticMeasurePd((prev) => !prev)}
            >
              {isAutomaticMeasurePd ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Stop Measurement
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Start Automatic Measurement
                </>
              )}
            </button>
            {isAutomaticMeasurePd && (
              <p className="text-center text-sm text-text-muted">
                Your PD will be automatically calculated when your face is
                detected
              </p>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden mt-3">
            <div
              className="cursor-pointer bg-green-500 text-center font-bold px-12 py-3 relative"
              onClick={() => setCollapsed((prev) => !prev)}
            >
              How to measure PD yourself?
              <div className="absolute flex items-center justify-center left-6 top-0 bottom-0">
                <svg
                  fill="currentColor"
                  width="15"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 448 512"
                  className={clsx("transition-all duration-300", {
                    "rotate-180": !collapsed,
                  })}
                >
                  <path d="M4.251 181.1C7.392 177.7 11.69 175.1 16 175.1c3.891 0 7.781 1.406 10.86 4.25l197.1 181.1l197.1-181.1c6.5-6 16.64-5.625 22.61 .9062c6 6.5 5.594 16.59-.8906 22.59l-208 192c-6.156 5.688-15.56 5.688-21.72 0l-208-192C-1.343 197.7-1.749 187.6 4.251 181.1z" />
                </svg>
              </div>
            </div>
            <div
              className={clsx(
                "text-left leading-4.5 transition-all duration-300 overflow-hidden",
                collapsed ? "max-h-0 p-0" : "px-3 py-2 max-h-96"
              )}
            >
              If you don't know the distance, stand 20 cm in front of the mirror
              and measure the distance between the center of your pupils in
              millimeters with a ruler.
              <img src={"/pdMeasure.svg"} alt="" className="w-full mt-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdModal;