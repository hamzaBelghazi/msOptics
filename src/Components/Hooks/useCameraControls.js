import { useThree } from "@react-three/fiber";
import { useRef } from "react";

function useCameraControls() {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  const rotateLeft = () => {
    if (controlsRef.current) {
      controlsRef.current.rotateLeft(Math.PI / 8); // Rotate left by 45 degrees
    }
  };

  const rotateRight = () => {
    if (controlsRef.current) {
      controlsRef.current.rotateRight(Math.PI / 8); // Rotate right by 45 degrees
    }
  };

  const zoomIn = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyIn(0.9); // Zoom in
    }
  };

  const zoomOut = () => {
    if (controlsRef.current) {
      controlsRef.current.dollyOut(0.9); // Zoom out
    }
  };

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset(); // Reset to default view
    }
  };

  return { controlsRef, rotateLeft, rotateRight, zoomIn, zoomOut, resetView };
}

export default useCameraControls;
