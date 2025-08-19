import React, { useEffect, useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";

import JeelizThreeGlassesCreatorGLB from "./JeelizThreeGlassesCreatorGLB";
import JeelizThreeGlassesCreator from "./JeelizThreeGlassesCreator";

const TryOnModal = ({ open, onClose, modelUrl }) => {
  const containerRef = useRef(null);
  let THREECAMERA = null;
  const mediaStreamRef = useRef(null);

  // Set flags
  const useCamera = true; // Changed to true to use webcam
  const useGLB = true; // toggle GLB vs. JSON models

  // Add state for model controls
  const [modelScale, setModelScale] = useState(1.0);
  const [modelPositionX, setModelPositionX] = useState(0);
  const [modelPositionY, setModelPositionY] = useState(0);
  const [modelPositionZ, setModelPositionZ] = useState(0);
  const [showControls, setShowControls] = useState(false);

  // Responsive/mobile state
  const [isSmall, setIsSmall] = useState(false);
  const [aspect, setAspect] = useState("16 / 9");

  // Reference to the glasses model for updates
  const glassesModelRef = useRef(null);

  // Function to update model with user controls
  const updateModelControls = () => {
    if (glassesModelRef.current) {
      const model = glassesModelRef.current;
      const baseScale = model.userData.baseScale || 0.006;

      // Apply scale to the model
      model.scale.setScalar(baseScale * modelScale);

      // Apply position changes directly to the model
      const basePosition = model.userData.basePosition || {
        x: 0,
        y: 0.07,
        z: 0.4,
      };
      model.position.set(
        basePosition.x + modelPositionX * 0.1,
        basePosition.y + modelPositionY * 0.1,
        basePosition.z + modelPositionZ * 0.1
      );
    }
  };

  // Update model when controls change
  useEffect(() => {
    updateModelControls();
  }, [modelScale, modelPositionX, modelPositionY, modelPositionZ]);

  // Handle responsive behavior (mobile-friendly aspect & full-screen)
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsSmall(w <= 600);
      // Portrait: prefer 9/16 to reduce zoom/crop; Landscape: 16/9
      setAspect(h > w ? "9 / 16" : "16 / 9");
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Cleanup camera when modal closes
  useEffect(() => {
    if (!open) {
      // Stop camera stream when modal closes
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        mediaStreamRef.current = null;
        console.log("📹 Camera stream stopped (modal closed)");
      }

      // Destroy Jeeliz face filter when modal closes
      if (window.JEELIZFACEFILTER && window.JEELIZFACEFILTER.destroy) {
        window.JEELIZFACEFILTER.destroy();
        console.log("🎭 Jeeliz face filter destroyed (modal closed)");
      }
    }
  }, [open]);

  useEffect(() => {
    console.log("useEffect", modelUrl);
    if (!open) return; // Don't initialize if modal is not open

    // Load Jeeliz scripts dynamically
    const loadJeelizScripts = () => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.JEELIZFACEFILTER && window.JeelizThreeHelper) {
          resolve();
          return;
        }

        const script1 = document.createElement("script");
        script1.src = "/helpers/JeelizThreeHelper.js";
        script1.onload = () => {
          const script2 = document.createElement("script");
          script2.src = "/dist/jeelizFaceFilter.js";
          script2.onload = () => {
            if (window.JEELIZFACEFILTER && window.JeelizThreeHelper) {
              resolve();
            } else {
              reject(new Error("Jeeliz libraries not loaded properly"));
            }
          };
          script2.onerror = () =>
            reject(new Error("Failed to load jeelizFaceFilter.js"));
          document.head.appendChild(script2);
        };
        script1.onerror = () =>
          reject(new Error("Failed to load JeelizThreeHelper.js"));
        document.head.appendChild(script1);
      });
    };

    // Detection callback
    function detect_callback(faceIndex, isDetected) {
      console.log(
        `INFO in detect_callback(): ${isDetected ? "DETECTED" : "LOST"}`
      );
    }

    // === THREE SCENE SETUP ===
    async function init_threeScene(spec) {
      const modelLoader = useGLB
        ? JeelizThreeGlassesCreatorGLB
        : JeelizThreeGlassesCreator;

      let glassesResources;
      try {
        if (useGLB) {
          glassesResources = await modelLoader({
            envMapURL: "/envMap.jpg",
            glassesURL: modelUrl, 
            occluderURL: "/models3D/face.glb",
          });
        } else {
          glassesResources = modelLoader({
            envMapURL: "envMap.jpg",
            frameMeshURL: "models3D/glassesFramesBranchesBent.json",
            lensesMeshURL: "models3D/glassesLenses.json",
            occluderURL: "models3D/face.json",
          });
        }
      } catch (e) {
        console.error("❌ Model loading failed:", e);
        return;
      }

      // Setup occluder and glasses, no change here...
      const dy = 0.07;
      const occluder = glassesResources.occluder;
      occluder.rotation.set(0.3, 0, 0);
      occluder.position.set(0, 0.03 + dy, -0.04);
      occluder.scale.multiplyScalar(0.0084);
      occluder.visible = true;
      spec.threeStuffs.faceObject.add(occluder);

      const threeGlasses = glassesResources.glasses;
      threeGlasses.position.set(0, dy, 0.4);
      threeGlasses.scale.multiplyScalar(0.006);

      // Store reference to glasses model for user adjustments
      threeGlasses.userData.baseScale = 0.006;
      threeGlasses.userData.basePosition = { x: 0, y: dy, z: 0.4 };
      glassesModelRef.current = threeGlasses;

      spec.threeStuffs.faceObject.add(threeGlasses);

      THREECAMERA = window.JeelizThreeHelper.create_camera();
    }

    // === FACE FILTER INIT ===
    async function startFaceFilter() {
      try {
       
        await loadJeelizScripts();
       
        let videoSettings;

        if (useCamera) {
         
          try {
            const constraints = {
              video: {
                facingMode: { ideal: "user" }, 
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                aspectRatio: 16 / 9,
                frameRate: { ideal: 30 },
                advanced: [{ focusMode: "continuous" }],
              },
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            // Try to sharpen further via track constraints
            const track = stream.getVideoTracks && stream.getVideoTracks()[0];
            if (track) {
              try {
                if ("contentHint" in track) track.contentHint = "detail";
                if (track.applyConstraints) {
                  await track.applyConstraints({
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: 16 / 9,
                    frameRate: { ideal: 30 },
                    advanced: [{ focusMode: "continuous" }],
                  });
                }
              } catch (e) {
                console.warn("⚠️ Could not apply extra video constraints:", e);
              }
            }
            mediaStreamRef.current = stream; // Store reference to stop later

            // Create a controlled video element and wait for metadata for exact sizing
            const videoElement = document.createElement("video");
            videoElement.autoplay = true;
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.srcObject = stream;
            await new Promise((resolve) => {
              const done = () => resolve();
              videoElement.onloadedmetadata = done;
              // Fallback if onloadedmetadata doesn't fire quickly
              setTimeout(done, 500);
            });
            try { await videoElement.play(); } catch (_) {}

            // Set video settings to use this element so Jeeliz does not re-open camera with different constraints
            videoSettings = { videoElement };
          } catch (err) {
            console.error("❌ Error accessing webcam:", err);
            return;
          }
        } else {
          // Use pre-recorded video
          const liveCamera = navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (liveCamera) {
            liveCamera
              .then((stream) => {
                const videoElement = document.createElement("video");
                videoElement.srcObject = stream;
                videoElement.autoplay = true;
                videoElement.muted = true; // Mute to avoid feedback
                videoElement.playsInline = true; // Required for iOS
                videoElement.onloadedmetadata = () => {
                  videoElement.play(); // Start playing the video
                };
                videoSettings = { videoElement };
              })
              .catch((err) => {
                console.error("❌ Error accessing webcam:", err);
                return; // Exit if webcam access fails
              });
          } else {
            console.error("❌ Webcam not supported or permission denied.");
            return; // Exit if webcam is not available
          }
        }

        // Wait for canvas to be available
        const canvas = document.getElementById("jeeFaceFilterCanvas");
        if (!canvas) {
          console.error("❌ Canvas not found");
          return;
        }

        // Fit canvas to the actual video resolution to avoid scaling blur
        try {
          if (videoSettings && videoSettings.videoElement) {
            const vw = videoSettings.videoElement.videoWidth || 1280;
            const vh = videoSettings.videoElement.videoHeight || 720;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(vw * dpr);
            canvas.height = Math.floor(vh * dpr);
            // Let CSS control display size; maintain 16:9
            canvas.style.width = "100%";
            canvas.style.height = "100%";
          }
        } catch (e) {
          console.warn("⚠️ Could not size canvas from video element:", e);
        }

        // Mirror the canvas for selfie mode without distorting
        canvas.style.transform = "scaleX(-1)";

        window.JEELIZFACEFILTER.init({
          canvasId: "jeeFaceFilterCanvas",
          NNCPath: "/neuralNets/",
          videoSettings: videoSettings,
          maxFacesDetected: 1,
          callbackReady: async function (errCode, spec) {
            if (errCode) {
              console.error("❌ JEELIZ init error:", errCode);
              return;
            }
          

            // Initialize Three.js helper first and save to spec
            spec.threeStuffs = window.JeelizThreeHelper.init(
              spec,
              detect_callback
            );

            // Now you can safely call init_threeScene, which needs spec.threeStuffs
            await init_threeScene(spec);
          },
          callbackTrack: function (detectState) {
            window.JeelizThreeHelper.render(detectState, THREECAMERA);
          },
        });
      } catch (error) {
        console.error("❌ Failed to initialize Jeeliz:", error);
      }
    }

    // Start initialization
    startFaceFilter();

    // Cleanup function
    return () => {
      // Stop camera stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        mediaStreamRef.current = null;
        
      }

      // Destroy Jeeliz face filter
      if (window.JEELIZFACEFILTER && window.JEELIZFACEFILTER.destroy) {
        window.JEELIZFACEFILTER.destroy();
       
      }
    };
  }, [open, modelUrl]); // Add dependencies

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isSmall}
      BackdropProps={{
        sx: {
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(0,0,0,0.6)",
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isSmall ? 0 : 3,
          overflow: "hidden",
          backgroundColor: "#000",
          boxShadow: isSmall ? "none" : "0 20px 60px rgba(0,0,0,0.45)",
        },
      }}
    >
      <DialogContent
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "black",
          position: "relative",
          p: 0,
          pt: isSmall ? "env(safe-area-inset-top)" : 0,
          pb: isSmall ? "env(safe-area-inset-bottom)" : 0,
        }}
      >
        <div
          ref={containerRef}
          style={{
            width: "100%",
            maxWidth: isSmall ? "100%" : 720,
            aspectRatio: aspect,
            height: "auto",
            position: "relative",
            overflow: "hidden",
            borderRadius: isSmall ? 0 : 12,
            boxShadow: isSmall ? "none" : "0 12px 32px rgba(0,0,0,0.35)",
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.0))",
              color: "#fff",
              zIndex: 1002,
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0.4 }}>
              Virtual Try-On
            </div>
          </div>
          {/* Model Controls Panel */}
          {showControls && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0, 0, 0, 0.9)",
                padding: "20px",
                borderRadius: "12px",
                color: "white",
                minWidth: "250px",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <h4
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                🎯 Adjust Glasses Fit
              </h4>

              {/* Size Control */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  📏 Size: {modelScale.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={modelScale}
                  onChange={(e) => setModelScale(parseFloat(e.target.value))}
                  style={{ width: "100%", height: "6px", borderRadius: "3px" }}
                />
                <div
                  style={{ fontSize: "11px", color: "#ccc", marginTop: "4px" }}
                >
                  Make glasses bigger or smaller
                </div>
              </div>

              {/* Horizontal Position */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  ↔️ Left/Right:{" "}
                  {modelPositionX > 0
                    ? `+${modelPositionX.toFixed(1)}`
                    : modelPositionX.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="-1.5"
                  max="1.5"
                  step="0.1"
                  value={modelPositionX}
                  onChange={(e) =>
                    setModelPositionX(parseFloat(e.target.value))
                  }
                  style={{ width: "100%", height: "6px", borderRadius: "3px" }}
                />
                <div
                  style={{ fontSize: "11px", color: "#ccc", marginTop: "4px" }}
                >
                  Move glasses left or right
                </div>
              </div>

              {/* Vertical Position */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  ↕️ Up/Down:{" "}
                  {modelPositionY > 0
                    ? `+${modelPositionY.toFixed(1)}`
                    : modelPositionY.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="-1.5"
                  max="1.5"
                  step="0.1"
                  value={modelPositionY}
                  onChange={(e) =>
                    setModelPositionY(parseFloat(e.target.value))
                  }
                  style={{ width: "100%", height: "6px", borderRadius: "3px" }}
                />
                <div
                  style={{ fontSize: "11px", color: "#ccc", marginTop: "4px" }}
                >
                  Move glasses up or down
                </div>
              </div>

              {/* Depth Position */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    fontSize: "13px",
                    display: "block",
                    marginBottom: "8px",
                    fontWeight: "500",
                  }}
                >
                  🔍 Forward/Back:{" "}
                  {modelPositionZ > 0
                    ? `+${modelPositionZ.toFixed(1)}`
                    : modelPositionZ.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="-1.5"
                  max="1.5"
                  step="0.1"
                  value={modelPositionZ}
                  onChange={(e) =>
                    setModelPositionZ(parseFloat(e.target.value))
                  }
                  style={{ width: "100%", height: "6px", borderRadius: "3px" }}
                />
                <div
                  style={{ fontSize: "11px", color: "#ccc", marginTop: "4px" }}
                >
                  Move glasses closer or further
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setModelScale(1.0);
                  setModelPositionX(0);
                  setModelPositionY(0);
                  setModelPositionZ(0);
                }}
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  width: "100%",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = "translateY(-1px)";
                  e.target.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = "none";
                }}
              >
                🔄 Reset to Default
              </button>
            </div>
          )}

          <canvas
            id="jeeFaceFilterCanvas"
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          ></canvas>
          <video
            id="myVideo"
            className="hidden w-full h-full rotate-180"
            playsInline
            preload="auto"
            autoPlay
            loop
            muted
          >
           
          </video>
        </div>

        {/* Toggle Controls Button */}
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            background:
              "linear-gradient(135deg, rgba(102,126,234,0.95), rgba(118,75,162,0.95))",
            color: "white",
            border: "none",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            zIndex: 1001,
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 10px 20px rgba(0,0,0,0.25)",
          }}
          onMouseOver={(e) => {
            e.target.style.transform = "translateY(-1px)";
            e.target.style.boxShadow = "0 14px 26px rgba(0,0,0,0.3)";
          }}
          onMouseOut={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 10px 20px rgba(0,0,0,0.25)";
          }}
        >
          {showControls ? "🔧 Hide Adjustments" : "⚙️ Adjust Fit"}
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(255, 255, 255, 0.1)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: 10,
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            zIndex: 1003,
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            backdropFilter: "blur(4px)",
            boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          }}
          onMouseOver={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.18)";
            e.target.style.transform = "scale(1.03)";
          }}
          onMouseOut={(e) => {
            e.target.style.background = "rgba(255, 255, 255, 0.1)";
            e.target.style.transform = "scale(1)";
          }}
          title="Close Try-On"
        >
          ✕
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default TryOnModal;
