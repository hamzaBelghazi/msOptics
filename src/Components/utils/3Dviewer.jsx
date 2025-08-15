import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";

// Custom hook to handle camera controls
function useCameraControls(controlsRef, action) {
  const { camera } = useThree();

  useFrame(() => {
    if (!action.current) return;

    switch (action.current) {
      case "rotateLeft":
        // Rotate the camera around the Y-axis (left)
        const angleLeft = Math.PI / 8; // 45 degrees in radians
        rotateCamera(angleLeft);
        break;

      case "rotateRight":
        // Rotate the camera around the Y-axis (right)
        const angleRight = -Math.PI / 8; // -45 degrees in radians
        rotateCamera(angleRight);
        break;

      case "zoomIn":
        if (controlsRef.current) {
          controlsRef.current.dollyIn(0.9); // Zoom in
        }
        break;

      case "zoomOut":
        if (controlsRef.current) {
          controlsRef.current.dollyOut(0.9); // Zoom out
        }
        break;

      case "resetView":
        if (controlsRef.current) {
          controlsRef.current.reset(); // Reset to default view
        }
        break;

      default:
        break;
    }

    // Clear the action after execution
    action.current = null;
  });

  const rotateCamera = (angle) => {
    if (controlsRef.current) {
      const currentPosition = new THREE.Vector3();
      camera.getWorldPosition(currentPosition);

      const radius = Math.sqrt(currentPosition.x ** 2 + currentPosition.z ** 2);
      const currentAngle = Math.atan2(currentPosition.z, currentPosition.x);
      const newAngle = currentAngle + angle;

      camera.position.set(
        radius * Math.cos(newAngle),
        camera.position.y,
        radius * Math.sin(newAngle)
      );

      controlsRef.current.update(); // Update the controls
    }
  };
}

// Component to load and render the 3D model
const Model = ({ modelUrl }) => {
  const [model, setModel] = useState(null);

  useEffect(() => {
    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        setModel(gltf.scene); // Set the loaded model
      },
      undefined,
      (error) => {
        console.error("Error loading 3D model:", error);
      }
    );
  }, [modelUrl]);

  return model ? <primitive object={model} scale={0.01} /> : null;
};

// Component to handle camera controls
const CameraController = ({ controlsRef, action }) => {
  useCameraControls(controlsRef, action);
  return null; // This component doesn't render anything
};

// Main 3D Viewer Component
export const CustomizeLens = ({ modelUrl }) => {
  const controlsRef = useRef();
  const action = useRef(null); // Ref to store the current action

  return (
    <div className="w-full aspect-square relative shadow-lg shadow-indigo-500/50 ">
      {/* Canvas for rendering the 3D model */}
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        {/* Add lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.3} />

        {/* Render the 3D model */}
        <Suspense fallback={<div>Loading 3D model...</div>}>
          <Model modelUrl={modelUrl} />
        </Suspense>

        {/* Add controls for rotation and zoom */}
        <OrbitControls
          ref={controlsRef}
          enableZoom={false}
          maxZoom={3}
          maxDistance={4}
          enablePan={true}
          enableRotate={true}
        />

        {/* Add environment for realistic lighting */}
        <Environment preset="studio" />

        {/* Handle camera actions */}
        <CameraController controlsRef={controlsRef} action={action} />
      </Canvas>

      {/* Custom Controller Buttons (Outside the Canvas) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button
          className="w-9 h-9 bg-gray-200 text-black rounded-full"
          onClick={() => (action.current = "rotateLeft")}
        >
          L
        </button>
        <button
          className="w-9 h-9 bg-gray-200 text-black rounded-full flex justify-center items-center"
          onClick={() => (action.current = "rotateRight")}
        >
          R
        </button>
        <button
          className="w-9 h-9 bg-gray-200 text-black rounded-full flex justify-center items-center"
          onClick={() => (action.current = "zoomIn")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
          </svg>
        </button>
        <button
          className="w-9 h-9 bg-gray-200 text-black rounded-full flex justify-center items-center"
          onClick={() => (action.current = "zoomOut")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            <path d="M12 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
          </svg>
        </button>
        <button
          className="w-9 h-9 bg-gray-200 text-black rounded-full flex justify-center items-center"
          onClick={() => (action.current = "resetView")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
            <path d="M12 6c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2c-1.1 0-2-.9-2-2H8c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
