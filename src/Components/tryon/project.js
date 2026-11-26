"use client";

// Pose-space projection for try-on parts.
// Local frame (units of IPD at rest, origin at eye midpoint):
//   +x screen-right, +y screen-DOWN, +z toward the viewer.
// Head pose { roll, yaw, pitch } is in display space (mirrored selfie view).
// Rotation order R = Rz(roll) * Rx(pitch) * Ry(yaw), then weak-perspective
// divide with focal length f. Returns screen-space affine pieces that canvas
// can apply directly via setTransform — this shear/perspective is what sells
// the 3D look on head turns.

export function makeProjector(pose = {}, focal = 4.2) {
  const roll = pose.roll || 0;
  const yaw = Math.max(-1.1, Math.min(1.1, pose.yaw || 0));
  const pitch = Math.max(-0.6, Math.min(0.6, pose.pitch || 0));
  const f = focal;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  // Combined R = Rz * Ry * Rx: pitch in the HEAD frame, then yaw, then roll.
  // Pitch must come first. Applied after yaw it rotates the yaw-induced depth
  // of each lens into height, so one lens of a turned head drops by up to 0.2 U
  // while the other rises — the frame then sits crooked on the face.
  // Rx(pitch): y1 = y*cx - z*sx ; z1 = y*sx + z*cx     (look up = +)
  // Ry(yaw):   x2 = x*cy + z1*sy ; z2 = -x*sy + z1*cy  (turn screen-left = +)
  // Rz(roll):  X = x2*cr - y1*sr ; Y = x2*sr + y1*cr
  const rot = (x, y, z) => {
    const y1 = y * cx - z * sx;
    const z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    return { x: x2 * cr - y1 * sr, y: x2 * sr + y1 * cr, z: z2 };
  };

  return {
    // project a local point → { x, y, s } in IPD units (multiply by pxPerUnit)
    point: (x, y, z = 0) => {
      const p = rot(x, y, z);
      const s = f / Math.max(0.6, f - p.z);
      return { x: p.x * s, y: p.y * s, s };
    },
    // affine basis for drawing an image centered at anchor with size (w,h) units:
    // project anchor, local +X and +Y tips → canvas setTransform(a,b,c,d,e,f)
    frame: (ax, ay, az, wu, hu, cxPx, cyPx, pxPerUnit) => {
      const a = rot(1, 0, 0);
      const b = rot(0, 1, 0);
      const c = rot(ax, ay, az);
      const s = f / Math.max(0.6, f - c.z);
      const k = pxPerUnit * s;
      return {
        a: a.x * k,
        b: a.y * k,
        c: b.x * k,
        d: b.y * k,
        e: cxPx + c.x * k,
        f: cyPx + c.y * k,
        scale: s,
        wPx: wu * k,
        hPx: hu * k,
        wu,
        hu,
      };
    },
  };
}

// Default part layout (IPD units, origin at eye midpoint).
// Anchors + sizes tuned for real frame proportions; per-product calibration
// can override via tryOnParts.calibration.
// Real frame proportions, in IPD units (1 u = 63 mm interpupillary distance):
//   lens 53 mm wide · bridge 20 mm · lens centre 36 mm off the midline
//   total front 125 mm, hinge lugs land on the ear line, as on a real frame.
export const DEFAULT_LAYOUT = {
  // dy is measured from the pupil; 0.06 is what sceneLayout() bakes into the
  // single PNG (eye line at 47.4% of that canvas), so both paths agree
  lensC: { dx: 0.57, dy: 0.06, w: 0.84, h: 0.62 },
  bridge: { dx: 0, dy: -0.02, w: 0.30, h: 0.1, z: 0.06 },
  temple: { len: 0.7, droop: 0.14, z0: 0, z1: -0.55 },
  // hinge position as a fraction of the single-frame art / half-frame width.
  armY: 0.474,
  templeX: 1,
};
