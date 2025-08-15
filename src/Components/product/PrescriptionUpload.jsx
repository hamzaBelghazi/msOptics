import { useEffect, useRef, useState } from "react";

/**
 * PrescriptionUpload
 * - Stores selected file in browser storage (localStorage) as Data URL
 * - Returns a storage key via onChange so the parent can reference it in customizations
 * - Note: localStorage is limited (~5MB). We warn if file is too large.
 */
export default function PrescriptionUpload({ productId, onChange }) {
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Initialize from existing storage (if any)
    const key = `rx:${productId}`;
    const existing = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (existing) {
      setFileName("Stored prescription");
      onChange && onChange(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const handleFile = async (file) => {
    setError("");
    if (!file) return;

    // Basic size guard: ~2.5MB max for safety
    const maxBytes = 2.5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("File too large. Please upload an image/PDF under 2.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result;
        const key = `rx:${productId}`;
        localStorage.setItem(key, dataUrl);
        setFileName(file.name);
        onChange && onChange(key);
      } catch (e) {
        setError("Failed to store file in browser storage.");
      }
    };
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      reader.readAsDataURL(file);
    } else {
      setError("Unsupported file type. Please upload an image or PDF.");
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        Upload Prescription (image or PDF)
      </label>
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
      </div>
      {fileName && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Saved: {fileName}</p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
        Your file is stored locally in your browser for checkout and will not be uploaded until you place the order.
      </p>
    </div>
  );
}
