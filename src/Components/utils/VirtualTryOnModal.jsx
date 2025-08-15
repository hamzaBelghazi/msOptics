"use client";
import React, { useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

export default function VirtualTryOnModal({
  open,
  onClose,
  modelUrl, // expects a .glb or .json model file URL
  glassesImage, // fallback image if no modelUrl
  productTitle,
}) {
  const widgetContainerRef = useRef(null);
  const widgetStartedRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scriptRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    widgetStartedRef.current = false;

    // Dynamically load the Jeeliz widget script
    const script = document.createElement("script");
    script.src = "/dist/JeelizVTOWidget.js";
    script.async = true;
    script.onload = () => {
      console.log("Jeeliz script loaded");
      if (!window.JEELIZVTOWIDGET) {
        setLoading(false);
        setError(
          "Jeeliz widget did not load correctly - window.JEELIZVTOWIDGET is undefined"
        );
        return;
      }

      console.log("JEELIZVTOWIDGET found:", window.JEELIZVTOWIDGET);

      // Wait a bit for the widget to be fully initialized
      setTimeout(() => {
        // Wait for the container and canvas to be in the DOM
        let raf;
        const checkAndStart = () => {
          if (
            widgetContainerRef.current &&
            document.getElementById("JeelizVTOWidgetCanvas") &&
            !widgetStartedRef.current
          ) {
            console.log("Starting JEELIZVTOWIDGET");
            widgetStartedRef.current = true;
            try {
              // Ensure the widget is properly initialized
              if (
                !window.JEELIZVTOWIDGET ||
                typeof window.JEELIZVTOWIDGET.start !== "function"
              ) {
                setError("JEELIZVTOWIDGET is not properly initialized");
                setLoading(false);
                return;
              }

              window.JEELIZVTOWIDGET.start({
                searchImageMask: "/images/loading.png",
                searchImageColor: 0xeeeeee,
                sku: "rayban_wayfarer_havane_marron", // Use default SKU
                callbackReady: function () {
                  setLoading(false);
                  console.log("callbackReady fired");

                  async function convertGLBtoJeelizJSON(glbPath) {
                    // Setup a fake Three.js scene (no rendering needed)
                    const loader = new GLTFLoader();

                    loader.load(glbPath, (gltf) => {
                      const model = gltf.scene;
                      let vertices = [];
                      let faces = [];
                      let uvs = [];

                      let vertexCount = 0;
                      let faceCount = 0;

                      // Only one UV channel expected, so push into a single array inside uvs
                      let uvArray = [];

                      model.traverse((child) => {
                        if (child.isMesh) {
                          const geom = child.geometry;

                          // Positions (flattened)
                          const pos = geom.attributes.position.array;
                          vertices.push(...pos);

                          // UVs (flattened)
                          if (geom.attributes.uv) {
                            uvArray.push(...geom.attributes.uv.array);
                          } else {
                            // If no UVs, fill with zeros (u,v) for each vertex
                            for (let i = 0; i < pos.length / 3; i++) {
                              uvArray.push(0, 0);
                            }
                          }

                          // Indices (faces)
                          if (geom.index) {
                            // Need to offset face indices by current vertex count
                            const idx = geom.index.array;
                            for (let i = 0; i < idx.length; i++) {
                              faces.push(idx[i] + vertexCount);
                            }
                            faceCount += idx.length / 3;
                          } else {
                            // If no indices, assume triangles in order
                            const count = pos.length / 3;
                            for (let i = 0; i < count; i += 3) {
                              faces.push(
                                vertexCount + i,
                                vertexCount + i + 1,
                                vertexCount + i + 2
                              );
                              faceCount++;
                            }
                          }

                          vertexCount += pos.length / 3;
                        }
                      });

                      // Prepare final JSON
                      const outputJSON = {
                        model: {
                          vertices: vertices,
                          uvs: [uvArray],
                          faces: faces,
                          metadata: {
                            vertices: vertexCount,
                            faces: faceCount,
                          },
                        },
                        materials: [],
                      };

                      // Add material info from gltf materials if any
                      if (gltf.materials) {
                        gltf.materials.forEach((mat) => {
                          outputJSON.materials.push({
                            name: mat.name || "material",
                            metalness:
                              mat.metalness !== undefined ? mat.metalness : 0,
                            roughness:
                              mat.roughness !== undefined ? mat.roughness : 1,
                            alpha:
                              mat.opacity !== undefined
                                ? [mat.opacity, 1, -75, -15]
                                : [1, 1, -75, -15],
                            diffuseColor: mat.color
                              ? [
                                  mat.color.r * 255,
                                  mat.color.g * 255,
                                  mat.color.b * 255,
                                ]
                              : [16, 16, 16],
                            diffuseTexture: "",
                            colorTextureUsage: 0,
                            paramsTexture: "",
                            paramsMapMask: [0, 0, 0, 0],
                            normalTexture: "",
                            fresnelMin: 0,
                            fresnelMax: 1,
                            fresnelPow: 3,
                          });
                        });
                      } else {
                        // If no materials info, add a default one like your example
                        outputJSON.materials.push({
                          name: "default",
                          metalness: 0,
                          roughness: 1,
                          alpha: [1, 1, -75, -15],
                          diffuseColor: [16, 16, 16],
                          diffuseTexture: "",
                          colorTextureUsage: 0,
                          paramsTexture: "",
                          paramsMapMask: [0, 0, 0, 0],
                          normalTexture: "",
                          fresnelMin: 0,
                          fresnelMax: 1,
                          fresnelPow: 3,
                        });
                      }

                      console.log(outputJSON);
                    });
                  }

                  // Usage example:
                  convertGLBtoJeelizJSON(modelUrl);

                  // Load the custom model using SKU or fallback to default
                  if (modelUrl) {
                    if (modelUrl.endsWith(".glb")) {
                      const loader = new GLTFLoader();
                      fetch(modelUrl)
                        .then((response) => response.arrayBuffer())
                        .then((data) => {
                          loader.parse(data, "", (gltf) => {
                            // Find the first mesh in the scene
                            let mesh = null;
                            gltf.scene.traverse((child) => {
                              if (child.isMesh && !mesh) mesh = child;
                            });
                            if (!mesh) {
                              setError("No mesh found in .glb file");
                              return;
                            }
                            const geometry = mesh.geometry;
                            const vertices = Array.from(
                              geometry.attributes.position.array
                            );
                            const normals = geometry.attributes.normal
                              ? Array.from(geometry.attributes.normal.array)
                              : [];
                            const uvs = geometry.attributes.uv
                              ? [Array.from(geometry.attributes.uv.array)]
                              : [];
                            const faces = geometry.index
                              ? Array.from(geometry.index.array)
                              : [];

                            const numVertices = vertices.length / 3;
                            const numFaces = faces.length / 3;
                            const defaultMaterials = [
                              {
                                name: "frame",
                                metalness: 0,
                                roughness: 1,
                                alpha: [1, 1, -75, -15],
                                diffuseColor: [16, 16, 16],
                                diffuseTexture: "",
                                colorTextureUsage: 0,
                                paramsTexture: "",
                                paramsMapMask: [0, 0, 0, 0],
                                normalTexture: "",
                                fresnelMin: 0.5,
                                fresnelMax: 1,
                                fresnelPow: 3,
                              },
                              {
                                name: "glass",
                                metalness: 0,
                                roughness: 1,
                                alpha: [0.4, 1, -75, -15],
                                diffuseColor: [4, 0, 163],
                                diffuseTexture: "",
                                colorTextureUsage: 0,
                                paramsTexture: "",
                                paramsMapMask: [0, 0, 0, 0],
                                normalTexture: "",
                                fresnelMin: 0,
                                fresnelMax: 1,
                                fresnelPow: 3,
                              },
                            ];
                            const jeelizJson = {
                              model: {
                                vertices,
                                normals,
                                uvs,
                                faces,
                                metadata: {
                                  vertices: numVertices,
                                  faces: numFaces,
                                },
                                center: { x: 0, y: 0, z: 0 },
                                pivot: { x: 0, y: 0, z: 0 },
                              },
                              materials: defaultMaterials,
                            };

                            console.log("Loading GLB model as JSON");
                            window.JEELIZVTOWIDGET.load_modelStandalone(
                              "http://127.0.0.1:4000/img/tryon/hope.json"
                            );
                          });
                        })
                        .catch((err) => {
                          setError("Failed to load or parse .glb: " + err);
                        });
                    } else if (
                      typeof modelUrl === "string" &&
                      !modelUrl.includes(".")
                    ) {
                      // It's a SKU
                      console.log("Loading SKU model:", modelUrl);
                      window.JEELIZVTOWIDGET.load(modelUrl);
                    } else {
                      // It's a URL to a JSON file
                      console.log("Loading JSON model:", modelUrl);
                      window.JEELIZVTOWIDGET.load_modelStandalone(modelUrl);
                    }
                  } else {
                    console.log(
                      "No modelUrl provided, using default SKU model"
                    );
                  }
                },
                onError: function (err) {
                  setLoading(false);
                  setError("Camera or widget error: " + err);
                },
              });
            } catch (error) {
              console.error("Error starting JEELIZVTOWIDGET:", error);
              setLoading(false);
              setError("Failed to start widget: " + error.message);
            }
          } else if (!widgetStartedRef.current) {
            raf = requestAnimationFrame(checkAndStart);
          }
        };
        checkAndStart();
      }, 500); // Increased delay to ensure DOM is ready
    };
    script.onerror = () => {
      setLoading(false);
      setError("Failed to load Jeeliz widget script");
    };
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
      if (window.JEELIZVTOWIDGET && window.JEELIZVTOWIDGET.destroy) {
        try {
          window.JEELIZVTOWIDGET.destroy();
        } catch (e) {}
      }
      widgetStartedRef.current = false;
      setLoading(false);
      setError(null);
    };
  }, [open, modelUrl]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-card-background rounded-2xl shadow-2xl p-0 md:p-6 flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-red-100 text-gray-700 dark:bg-card-background dark:text-gray-300 z-50  shadow transition"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <div
          className="relative w-full flex items-center justify-center"
          style={{ minHeight: 480 }}
        >
          {/* Widget container must have this ID and fixed size */}
          <div
            ref={widgetContainerRef}
            id="JeelizVTOWidget"
            style={{
              width: 480,
              height: 480,
              background: "#000",
              position: "relative",
            }}
          >
            <canvas
              id="JeelizVTOWidgetCanvas"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-lg font-bold z-20">
              Loading virtual try-on...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-600/80 text-white text-lg font-bold z-20">
              {error}
            </div>
          )}
        </div>
        <div className="text-center mt-4 text-lg font-semibold text-text-primary">
          {productTitle}
        </div>
      </div>
    </div>
  );
}
