"use client";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

// Selfie multiclass segmentation. Category ids:
//   0 background · 1 hair · 2 body-skin · 3 face-skin · 4 clothes · 5 others
const VISION_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
// served from /public/models: the CDN copy is 16 MB and stalls a cold try-on
const MODEL_PATH = "/models/selfie_multiclass_256x256.tflite";

const HAIR = 1;
const BACKGROUND = 0;

let cached = null;

async function getSegmenter() {
  if (!cached) {
    cached = (async () => {
      const vision = await FilesetResolver.forVisionTasks(VISION_PATH);
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
        runningMode: "IMAGE",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    })();
  }
  return cached;
}

// Cut the photo down to the pixels a category accepts, so the renderer can
// paint it straight back over anything that should sit behind the head.
function overlayFrom(photo, data, mw, mh, keep, maxW = 900) {
  const pw = photo.naturalWidth || photo.width;
  const ph = photo.naturalHeight || photo.height;
  if (!pw || !ph || !mw || !mh || !data) return null;
  const scale = Math.min(1, maxW / pw);
  const ow = Math.max(1, Math.round(pw * scale));
  const oh = Math.max(1, Math.round(ph * scale));

  // 1-channel mask → alpha canvas at model resolution
  const mask = document.createElement("canvas");
  mask.width = mw;
  mask.height = mh;
  const mctx = mask.getContext("2d");
  const img = mctx.createImageData(mw, mh);
  for (let i = 0; i < mw * mh; i++) {
    img.data[i * 4 + 3] = keep(data[i]) ? 255 : 0;
  }
  mctx.putImageData(img, 0, 0);

  // photo × mask, at a sane resolution
  const out = document.createElement("canvas");
  out.width = ow;
  out.height = oh;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(photo, 0, 0, ow, oh);
  octx.globalCompositeOperation = "destination-in";
  octx.drawImage(mask, 0, 0, ow, oh);
  return out;
}

/**
 * Build the two occlusion layers the try-on renderer needs:
 *   far  – the whole person, so a far-side temple disappears behind the head
 *   near – hair only, so an arm crossing the sideburn/hairline is hidden
 * Returns null when segmentation is unavailable (the renderer then falls back
 * to its yaw-based fade).
 */
export async function segmentOccluders(photo) {

  try {
    const seg = await getSegmenter();
    const res = seg.segment(photo);
    const m = res.categoryMask;
    const data = m.getAsUint8Array();
    const mw = m.width;
    const mh = m.height;
    const far = overlayFrom(photo, data, mw, mh, (c) => c !== BACKGROUND);
    const near = overlayFrom(photo, data, mw, mh, (c) => c === HAIR);
    m.close();
    res.close();
    if (!far) return null;
    return { far, near };
  } catch {
    return null;
  }
}

export function useFaceSegmenter() {
  return { segmentOccluders };
}
