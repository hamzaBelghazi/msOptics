// Face geometry for the "Face photo" tool.
//
// Everything here is pure maths on MediaPipe face landmarks (478 points, the
// iris refinement). No DOM, no model, so it can be unit tested on its own.
//
// Landmark indices used below come from the standard 478-point mesh:
//   468-472  right iris ring (the subject's right eye = image left)
//   473-477  left iris ring
//   6        nasion (nose bridge at eye level, the frame centre line)
//   4        nose tip      234 / 454  outer face contour at the cheekbones
//   10       forehead top  152        chin
export const RIGHT_IRIS = [468, 469, 470, 471, 472];
export const LEFT_IRIS = [473, 474, 475, 476, 477];

// 6 sits on the bridge of the nose at eye level — the line opticians measure
// monocular PDs from. (168 is the same ridge, a little higher.)
export const NASION = 6;
export const NOSE_TIP = 4;
export const FACE_LEFT = 234;
export const FACE_RIGHT = 454;
export const FOREHEAD = 10;
export const CHIN = 152;

// Mean horizontal visible iris diameter of an adult eye. Used as the scale
// reference when the shopper does not know their PD; individual irises vary
// by roughly ±5%, which is why a known PD is always preferred.
export const IRIS_DIAMETER_MM = 11.7;

export const PD_MIN = 40;
export const PD_MAX = 85;
export const FACE_WIDTH_MIN = 95;
export const FACE_WIDTH_MAX = 200;

// A4 print box for the true-size face image, in millimetres.
export const SHEET_FACE_BOX_MM = { width: 178, height: 186 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round1 = (value) => Math.round(value * 10) / 10;

const pointAt = (landmarks, index, width, height) => ({
  x: landmarks[index].x * width,
  y: landmarks[index].y * height,
});

const boxOf = (landmarks, indices, width, height) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  indices.forEach((index) => {
    const p = pointAt(landmarks, index, width, height);
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  });
  return {
    x0, x1, y0, y1,
    width: x1 - x0,
    height: y1 - y0,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
  };
};

// Iris rings are small circles in the image, so the bounding box gives both
// the diameter and the centre. Using the whole ring is far steadier than
// picking two ring vertices, and the box aspect ratio flags a turned head.
export function readIrises(landmarks, width, height) {
  if (!landmarks || landmarks.length < 478) return null;
  const right = boxOf(landmarks, RIGHT_IRIS, width, height);
  const left = boxOf(landmarks, LEFT_IRIS, width, height);
  if (!right.width || !left.width) return null;

  const rightDiameter = (right.width + right.height) / 2;
  const leftDiameter = (left.width + left.height) / 2;
  // A turned head squashes one iris; the wider one is closer to the true
  // diameter, so use the larger of the two.
  const irisPx = Math.max(rightDiameter, leftDiameter);
  const pupilPx = Math.hypot(right.cx - left.cx, right.cy - left.cy);
  if (!(irisPx > 0) || !(pupilPx > 0)) return null;

  return {
    right,
    left,
    rightDiameter,
    leftDiameter,
    irisPx,
    pupilPx,
    // 1.0 when both eyes are equally foreshortened (head straight)
    irisBalance: Math.min(rightDiameter, leftDiameter) / irisPx,
  };
}

// Cheap, stable head-pose proxies. No degrees are claimed for pitch: the
// vertical face ratio changes with hair, brows and camera height.
export function readPose(landmarks, width, height, irises) {
  const nose = pointAt(landmarks, NOSE_TIP, width, height);
  const edgeA = pointAt(landmarks, FACE_LEFT, width, height);
  const edgeB = pointAt(landmarks, FACE_RIGHT, width, height);
  const faceWidthPx = Math.abs(edgeB.x - edgeA.x) || 1;
  const yawScore = Math.abs((nose.x - Math.min(edgeA.x, edgeB.x)) / faceWidthPx - 0.5);

  const eyeDx = irises.left.cx - irises.right.cx;
  const eyeDy = irises.left.cy - irises.right.cy;
  const rollDeg = (Math.atan2(eyeDy, eyeDx) * 180) / Math.PI;

  const forehead = pointAt(landmarks, FOREHEAD, width, height);
  const chin = pointAt(landmarks, CHIN, width, height);
  const faceHeightPx = Math.abs(chin.y - forehead.y) || 1;

  return {
    yawScore,
    yawDeg: clamp(yawScore * 120, 0, 60) * Math.sign(nose.x - (edgeA.x + edgeB.x) / 2 || 1),
    rollDeg,
    faceWidthPx,
    faceHeightPx,
    faceRatio: faceHeightPx / faceWidthPx,
    faceWidthPercent: faceWidthPx / width,
  };
}

// Full measurement for one frame. `knownPd` (from a prescription or a ruler)
// turns the iris estimate into an exact scale, which is what the A4 print
// needs to be true size.
export function measureFace(landmarks, { width, height, knownPd } = {}) {
  if (!landmarks || !width || !height) return null;
  const irises = readIrises(landmarks, width, height);
  if (!irises) return null;
  const pose = readPose(landmarks, width, height, irises);

  const known = Number(knownPd);
  const useKnown = Number.isFinite(known) && known >= PD_MIN && known <= PD_MAX;
  const irisPd = (IRIS_DIAMETER_MM / irises.irisPx) * irises.pupilPx;
  const pdMm = useKnown ? known : irisPd;
  const mmPerPx = useKnown ? known / irises.pupilPx : IRIS_DIAMETER_MM / irises.irisPx;

  const nasion = pointAt(landmarks, NASION, width, height);
  // The subject's right eye is the one on the left of an unmirrored frame.
  const rightIsLeft = irises.right.cx <= irises.left.cx;
  const rightEye = rightIsLeft ? irises.right : irises.left;
  const leftEye = rightIsLeft ? irises.left : irises.right;

  const faceWidthMm = pose.faceWidthPx * mmPerPx;
  const faceHeightMm = pose.faceHeightPx * mmPerPx;

  const metrics = {
    width,
    height,
    pdMm: round1(pdMm),
    irisPdMm: round1(irisPd),
    rightPdMm: round1(Math.abs(nasion.x - rightEye.cx) * mmPerPx),
    leftPdMm: round1(Math.abs(leftEye.cx - nasion.x) * mmPerPx),
    faceWidthMm: Math.round(faceWidthMm),
    faceHeightMm: Math.round(faceHeightMm),
    irisPx: round1(irises.irisPx),
    pupilPx: round1(irises.pupilPx),
    irisBalance: round1(irises.irisBalance * 100) / 100,
    mmPerPx: Math.round(mmPerPx * 10000) / 10000,
    calibration: useKnown ? "known-pd" : "iris",
    pose: {
      yawScore: Math.round(pose.yawScore * 10000) / 10000,
      yawDeg: round1(pose.yawDeg),
      rollDeg: round1(pose.rollDeg),
      faceRatio: Math.round(pose.faceRatio * 100) / 100,
      faceWidthPercent: Math.round(pose.faceWidthPercent * 100) / 100,
    },
    // pixel anchors used to draw the printout and the preview overlay
    anchors: {
      rightEye: { x: rightEye.cx, y: rightEye.cy },
      leftEye: { x: leftEye.cx, y: leftEye.cy },
      nasion: { x: nasion.x, y: nasion.y },
      faceLeft: pointAt(landmarks, FACE_LEFT, width, height),
      faceRight: pointAt(landmarks, FACE_RIGHT, width, height),
    },
  };

  return { ...metrics, ...assessFace(metrics) };
}

// Quality gate. "level" drives the auto-capture and the review warnings;
// "issues" are codes the UI turns into sentences.
export function assessFace(metrics) {
  const issues = [];
  const { pdMm, faceWidthMm, irisPx, pose } = metrics;

  if (Math.abs(pose.yawDeg) > 9 || pose.yawScore > 0.075) issues.push("turned");
  else if (Math.abs(pose.yawDeg) > 4 || pose.yawScore > 0.035) issues.push("slightly-turned");

  if (Math.abs(pose.rollDeg) > 10) issues.push("tilted");
  else if (Math.abs(pose.rollDeg) > 5) issues.push("slightly-tilted");

  if (irisPx < 10) issues.push("too-far");
  else if (irisPx < 15) issues.push("far");

  if (pose.faceWidthPercent < 0.28) issues.push("small-in-frame");

  if (pose.faceRatio < 0.98 || pose.faceRatio > 1.8) issues.push("odd-framing");

  if (pdMm < PD_MIN || pdMm > PD_MAX) issues.push("implausible-pd");
  if (faceWidthMm < FACE_WIDTH_MIN || faceWidthMm > FACE_WIDTH_MAX) issues.push("implausible-width");

  const blocking = [
    "turned",
    "tilted",
    "too-far",
    "odd-framing",
    "implausible-pd",
    "implausible-width",
  ];
  const level = issues.some((code) => blocking.includes(code))
    ? "poor"
    : issues.length
    ? "fair"
    : "good";

  return { level, issues };
}

export const isPrintable = (metrics) =>
  Boolean(metrics) && metrics.level !== "poor";

// Crop box (source pixels) that the A4 sheet prints at 1:1. The box is capped
// by both the requested millimetres and the frame itself, so the printed face
// is never scaled — only cropped.
export function cropForSheet(landmarks, options = {}) {
  const {
    width,
    height,
    mmPerPx,
    boxWidthMm = SHEET_FACE_BOX_MM.width,
    boxHeightMm = SHEET_FACE_BOX_MM.height,
  } = options;
  if (!landmarks || !mmPerPx || !width || !height) return null;

  const irises = readIrises(landmarks, width, height);
  if (!irises) return null;

  const boxW = Math.round(Math.min(boxWidthMm / mmPerPx, width));
  const boxH = Math.round(Math.min(boxHeightMm / mmPerPx, height));
  if (boxW < 16 || boxH < 16) return null;

  const eyeX = (irises.left.cx + irises.right.cx) / 2;
  const eyeY = (irises.left.cy + irises.right.cy) / 2;
  const forehead = pointAt(landmarks, FOREHEAD, width, height);
  const chin = pointAt(landmarks, CHIN, width, height);
  const faceMidY = (forehead.y + chin.y) / 2;
  const faceH = Math.abs(chin.y - forehead.y);

  // Portrait framing: eyes slightly above the middle. When the head is taller
  // than the box only the face itself can be kept, so centre on it.
  const eyeOffset = faceH > boxH * 0.82 ? (eyeY - faceMidY) + boxH / 2 : boxH * 0.45;
  let x = Math.round(eyeX - boxW / 2);
  let y = Math.round(eyeY - eyeOffset);
  x = clamp(x, 0, Math.max(0, width - boxW));
  y = clamp(y, 0, Math.max(0, height - boxH));

  return {
    x,
    y,
    width: boxW,
    height: boxH,
    mmWidth: Math.round(boxW * mmPerPx * 10) / 10,
    mmHeight: Math.round(boxH * mmPerPx * 10) / 10,
    scale: 1,
  };
}

// Median of a sample window: the number shown to the shopper.
export function median(values) {
  if (!values || !values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function medianMetrics(list) {
  if (!list || !list.length) return null;
  const base = list[list.length - 1];
  return {
    ...base,
    pdMm: round1(median(list.map((m) => m.pdMm))),
    rightPdMm: round1(median(list.map((m) => m.rightPdMm))),
    leftPdMm: round1(median(list.map((m) => m.leftPdMm))),
    faceWidthMm: Math.round(median(list.map((m) => m.faceWidthMm))),
    irisPx: round1(median(list.map((m) => m.irisPx))),
    mmPerPx: Math.round(median(list.map((m) => m.mmPerPx)) * 10000) / 10000,
  };
}