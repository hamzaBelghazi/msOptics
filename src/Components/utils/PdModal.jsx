import clsx from "clsx";
import React, { useState, useEffect, useRef } from "react";
import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const VISION_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const IRIS_WIDTH_IN_MM = 12;

const PdModal = ({
  openModal,
  setOpenModal,
  isAutomaticMeasurePd,
  setIsAutomaticMeasurePd,
}) => {
  const [collapsed, setCollapsed] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [lastVideoTime, setLastVideoTime] = useState(-1);
  const [videoWidth, setVideoWidth] = useState(1920);
  const [videoHeight, setVideoHeight] = useState(840);
  const [pd, setPd] = useState(45); // Default PD value
  const [eyeDist, setEyeDist] = useState(45); // Default eye distance
  const [isInitialValue, setIsInitialValue] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);

  const enableCamera = async () => {
    if (!faceLandmarker || !videoRef.current) return;

    try {
      // Request video with explicit selfie mode constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log("Camera settings:", settings);

      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const getDistance = (p1, p2) => {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
  };

  const getDistanceInScreenCoordinates = (p1, p2) => {
    return Math.sqrt(
      Math.pow(p1.x * videoWidth - p2.x * videoWidth, 2) +
        Math.pow(p1.y * videoHeight - p2.y * videoHeight, 2)
    );
  };

  const drawPoint = (ctx, x, y, color = "chartreuse", size = 3) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      x * videoRef.current.videoWidth,
      y * videoRef.current.videoHeight,
      size,
      0,
      2 * Math.PI
    );
    ctx.fill();
  };

  const drawLine = (ctx, x1, y1, x2, y2, color = "chartreuse") => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      x1 * videoRef.current.videoWidth,
      y1 * videoRef.current.videoHeight
    );
    ctx.lineTo(
      x2 * videoRef.current.videoWidth,
      y2 * videoRef.current.videoHeight
    );
    ctx.stroke();
  };

  const getPupils = (landmarks) => {
    return {
      left: {
        x:
          (landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[0].start].x +
            landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[2].start].x) /
          2.0,
        y:
          (landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[0].start].y +
            landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[2].start].y) /
          2.0,
        z:
          (landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[0].start].z +
            landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[2].start].z) /
          2.0,
        widthPx: getDistanceInScreenCoordinates(
          landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[0].start],
          landmarks[FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS[2].start]
        ),
      },
      right: {
        x:
          (landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[0].start].x +
            landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[2].start].x) /
          2.0,
        y:
          (landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[0].start].y +
            landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[2].start].y) /
          2.0,
        z:
          (landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[0].start].z +
            landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[2].start].z) /
          2.0,
        widthPx: getDistanceInScreenCoordinates(
          landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[0].start],
          landmarks[FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS[2].start]
        ),
      },
    };
  };

  const predictWebcam = async () => {
    if (!videoRef.current || !canvasRef.current || !faceLandmarker) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");

    // Get the actual container size
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set canvas size to match container
    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Calculate scale to maintain aspect ratio
    const scaleX = containerWidth / video.videoWidth;
    const scaleY = containerHeight / video.videoHeight;
    const scale = Math.min(scaleX, scaleY);

    // Calculate translation to center the image
    const translateX = (containerWidth - video.videoWidth * scale) / 2;
    const translateY = (containerHeight - video.videoHeight * scale) / 2;

    // Update state with container dimensions
    setVideoWidth(containerWidth);
    setVideoHeight(containerHeight);

    // Set up the canvas transform for proper scaling and centering
    canvasCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    canvasCtx.scale(scale, scale); // Scale to fit
    canvasCtx.translate(translateX / scale, translateY / scale); // Center
    if (lastVideoTime !== video.currentTime) {
      setLastVideoTime(video.currentTime);
      const startTimeMs = performance.now();
      const results = faceLandmarker.detectForVideo(video, startTimeMs);

      // Update face detection status
      setIsFaceDetected(
        Boolean(results.faceLandmarks && results.faceLandmarks[0])
      );

      if (results.faceLandmarks && results.faceLandmarks[0]) {
        const landmarks = results.faceLandmarks[0];
        const pupils = getPupils(landmarks);
        const pupilsDistance = getDistanceInScreenCoordinates(
          pupils.left,
          pupils.right
        );
        const pdLeft =
          (IRIS_WIDTH_IN_MM / pupils.left.widthPx) * pupilsDistance;

        if (isAutomaticMeasurePd) {
          setPd(Math.round(pdLeft));
          setEyeDist(Math.round(pdLeft));
          setIsInitialValue(true);
        }

        // Clear canvas and draw visualization
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw nose points
        const noseTop = landmarks[6];
        const noseTip = landmarks[4];
        const noseBottom = landmarks[168];
        drawPoint(canvasCtx, noseTop.x, noseTop.y, "#FF6B6B", 2);
        drawPoint(canvasCtx, noseTip.x, noseTip.y, "#FF6B6B", 2);
        drawPoint(canvasCtx, noseBottom.x, noseBottom.y, "#FF6B6B", 2);

        // Draw eye contours
        const leftEyeUpper = [landmarks[159], landmarks[160], landmarks[161]];
        const leftEyeLower = [landmarks[163], landmarks[144], landmarks[145]];
        const rightEyeUpper = [landmarks[386], landmarks[387], landmarks[388]];
        const rightEyeLower = [landmarks[390], landmarks[373], landmarks[374]];

        // Draw eye contours
        leftEyeUpper.forEach((p, i) => {
          if (i < leftEyeUpper.length - 1) {
            drawLine(
              canvasCtx,
              p.x,
              p.y,
              leftEyeUpper[i + 1].x,
              leftEyeUpper[i + 1].y,
              "#4CAF50"
            );
          }
        });
        leftEyeLower.forEach((p, i) => {
          if (i < leftEyeLower.length - 1) {
            drawLine(
              canvasCtx,
              p.x,
              p.y,
              leftEyeLower[i + 1].x,
              leftEyeLower[i + 1].y,
              "#4CAF50"
            );
          }
        });
        rightEyeUpper.forEach((p, i) => {
          if (i < rightEyeUpper.length - 1) {
            drawLine(
              canvasCtx,
              p.x,
              p.y,
              rightEyeUpper[i + 1].x,
              rightEyeUpper[i + 1].y,
              "#4CAF50"
            );
          }
        });
        rightEyeLower.forEach((p, i) => {
          if (i < rightEyeLower.length - 1) {
            drawLine(
              canvasCtx,
              p.x,
              p.y,
              rightEyeLower[i + 1].x,
              rightEyeLower[i + 1].y,
              "#4CAF50"
            );
          }
        });

        // Draw pupils
        drawPoint(canvasCtx, pupils.left.x, pupils.left.y, "#FFD700", 4);
        drawPoint(canvasCtx, pupils.right.x, pupils.right.y, "#FFD700", 4);

        // Draw PD measurement line
        drawLine(
          canvasCtx,
          pupils.left.x,
          pupils.left.y,
          pupils.right.x,
          pupils.right.y,
          "#00BCD4"
        );
      }
    }

    if (isAutomaticMeasurePd) {
      requestAnimationFrame(predictWebcam);
    }
  };
  useEffect(() => {
    const initializeFaceLandmarker = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(VISION_PATH);
      const landmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        }
      );
      setFaceLandmarker(landmarker);
    };

    initializeFaceLandmarker();
  }, []);

  useEffect(() => {
    if (isAutomaticMeasurePd) {
      enableCamera();
    } else if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [isAutomaticMeasurePd]);
  // Don't render if modal is not open
  if (!openModal) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center  pointer-events-none"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
    >
      <div
        className={clsx(
          "w-full md:w-1/2 bg-white rounded-t-2xl py-10  shadow-lg transform transition-transform duration-300 pointer-events-auto",
          openModal ? "translate-y-0" : "translate-y-full",
          isAutomaticMeasurePd ? "h-full" : ""
        )}
        style={{ overflowY: "auto" }}
      >
        <div className="relative">
          <button
            className="absolute h-10 w-10 right-4 top-0 bottom-0 my-auto cursor-pointer flex items-center justify-center rounded-full bg-neutral-300 hover:bg-neutral-400 transition-all duration-300 z-10"
            onClick={() => setOpenModal(false)}
          >
            <svg
              width="15"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 320 512"
              fill="currentColor"
            >
              <path d="M312.1 375c9.369 9.369 9.369 24.57 0 33.94s-24.57 9.369-33.94 0L160 289.9l-119 119c-9.369 9.369-24.57 9.369-33.94 0s-9.369-24.57 0-33.94L126.1 256L7.027 136.1c-9.369-9.369-9.369-24.57 0-33.94s24.57-9.369 33.94 0L160 222.1l119-119c9.369-9.369 24.57-9.369 33.94 0s9.369 24.57 0 33.94L193.9 256L312.1 375z"></path>
            </svg>
          </button>
        </div>
        <div className="p-4 pt-0">
          {isAutomaticMeasurePd && (
            <>
              <div className="flex justify-between items-center mt-4 mb-2 px-2">
                <div className="text-gray-600 text-sm font-medium">
                  Measured PD:
                </div>
                <div className="bg-sky-100 text-sky-800 px-4 py-1 rounded-full font-bold">
                  {pd} mm
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
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
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
              </div>
            </>
          )}

          <div className="my-8 flex flex-col gap-2 ">
            <button
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
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
              <p className="text-center text-sm text-gray-500">
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
                  data-v-6e021274=""
                  fill="currentColor"
                  width="15"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 448 512"
                  className={clsx("transition-all duration-300", {
                    "rotate-180": !collapsed,
                  })}
                >
                  <path d="M4.251 181.1C7.392 177.7 11.69 175.1 16 175.1c3.891 0 7.781 1.406 10.86 4.25l197.1 181.1l197.1-181.1c6.5-6 16.64-5.625 22.61 .9062c6 6.5 5.594 16.59-.8906 22.59l-208 192c-6.156 5.688-15.56 5.688-21.72 0l-208-192C-1.343 197.7-1.749 187.6 4.251 181.1z"></path>
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
