// A4 "face measurement sheet": the captured face printed at true size, with
// the measured landmark lines drawn on top and a 100 mm ruler so anyone can
// check the print with a real ruler before trusting it.
import { jsPDF } from "jspdf";

const A4 = { width: 210, height: 297 };
const MARGIN = 12;
const CONTENT_W = A4.width - MARGIN * 2;

const INK = [27, 24, 21];
const MUTED = [107, 100, 89];
const RULE = [214, 208, 197];
const ACCENT = [15, 118, 110];
const WARN = [180, 83, 9];

const GRID_1MM = [233, 229, 222];
const GRID_5MM = [217, 211, 200];
const GRID_10MM = [193, 185, 171];

const pad = (n) => String(n).padStart(2, "0");

const GRID_COLORS = { minor: GRID_1MM, mid: GRID_5MM, major: GRID_10MM };
// White lines read as a pale lattice on any skin tone, where a grey line would
// vanish on a light face.
const WHITE_GRID = { minor: [255, 255, 255], mid: [255, 255, 255], major: [255, 255, 255] };

// Graph-paper body: 1 mm squares, a heavier line every 5 mm and the heaviest
// every 10 mm, so a lens, a sticker or a cut-out can be placed with a ruler.
function drawGrid(doc, { x0, y0, x1, y1, opacity = 1, colors = GRID_COLORS }) {
  const applyOpacity = (value) => {
    try {
      doc.setGState(new doc.GState({ opacity: value }));
      return true;
    } catch (error) {
      return false;
    }
  };
  if (opacity < 1 && !applyOpacity(opacity)) return false;
  const restore = opacity < 1;

  doc.setLineWidth(0.12);
  doc.setDrawColor(...colors.minor);
  for (let x = x0; x <= x1 + 0.01; x += 1) {
    if (x % 5 === 0) continue;
    doc.line(x, y0, x, y1);
  }
  for (let y = y0; y <= y1 + 0.01; y += 1) {
    if (y % 5 === 0) continue;
    doc.line(x0, y, x1, y);
  }

  doc.setLineWidth(0.16);
  doc.setDrawColor(...colors.mid);
  for (let x = x0; x <= x1 + 0.01; x += 1) {
    if (x % 5 !== 0 || x % 10 === 0) continue;
    doc.line(x, y0, x, y1);
  }
  for (let y = y0; y <= y1 + 0.01; y += 1) {
    if (y % 5 !== 0 || y % 10 === 0) continue;
    doc.line(x0, y, x1, y);
  }

  doc.setLineWidth(0.22);
  doc.setDrawColor(...colors.major);
  for (let x = Math.ceil(x0 / 10) * 10; x <= x1 + 0.01; x += 10) {
    doc.line(x, y0, x, y1);
  }
  for (let y = Math.ceil(y0 / 10) * 10; y <= y1 + 0.01; y += 10) {
    doc.line(x0, y, x1, y);
  }

  if (restore) applyOpacity(1);
  return true;
}

// Grid drawn over the printed face: same 1 mm geometry as the page, but a
// pale overlay so a lens or a sticker can be placed on the eyes by eye.
function drawFaceGrid(doc, { x, y, width, height }) {
  const left = Math.ceil(x);
  const right = Math.floor(x + width);
  const top = Math.ceil(y);
  const bottom = Math.floor(y + height);
  if (right <= left || bottom <= top) return;
  drawGrid(doc, {
    x0: left,
    y0: top,
    x1: right,
    y1: bottom,
    opacity: 0.34,
    colors: WHITE_GRID,
  });
}
export const formatStamp = (date = new Date()) =>
  date.getFullYear() +
  "-" +
  pad(date.getMonth() + 1) +
  "-" +
  pad(date.getDate()) +
  " " +
  pad(date.getHours()) +
  ":" +
  pad(date.getMinutes());

const mm = (value) => Math.round(value * 10) / 10;

export function buildFaceSheet({
  image,
  imageWidthMm,
  imageHeightMm,
  imageAspect,
  metrics,
  crop,
  productName = "",
  takenAt = new Date(),
  shopName = "msOptics",
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const calibrated = Boolean(metrics && metrics.mmPerPx && crop && imageWidthMm);
  const pageW = A4.width;

  // ------------------------------------------------------------ header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(shopName, MARGIN, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...MUTED);
  doc.text("FACE MEASUREMENT SHEET", MARGIN, 24, { charSpace: 0.9 });
  doc.text("A4  ·  210 × 297 mm", pageW - MARGIN, 17, { align: "right" });
  doc.text(formatStamp(takenAt), pageW - MARGIN, 22, { align: "right" });
  if (productName) {
    doc.text(String(productName).slice(0, 62), pageW - MARGIN, 27, { align: "right" });
  }

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, 30, pageW - MARGIN, 30);

  // -------------------------------------------------------- face image ---
  const boxTop = 34;
  const aspect = imageAspect > 0 ? imageAspect : 0.75;
  const frameW = calibrated
    ? Math.min(imageWidthMm, CONTENT_W)
    : Math.min(CONTENT_W, 186 * aspect);
  const frameH = calibrated ? Math.min(imageHeightMm, 186) : frameW / aspect;
  const frameX = MARGIN + (CONTENT_W - frameW) / 2;

  // Graph-paper body: every square is exactly 1 mm, so a frame, a lens or a
  // sticker can be placed against the printed face with a ruler. The data block
  // below is printed on a white card, so its numbers stay easy to read.
  drawGrid(doc, { x0: 8, y0: 32, x1: 202, y1: 286 });

  doc.setFillColor(246, 243, 238);
  doc.rect(frameX, boxTop, frameW, frameH, "F");

  if (image) {
    try {
      doc.addImage(image, "JPEG", frameX, boxTop, frameW, frameH, undefined, "FAST");
      drawFaceGrid(doc, { x: frameX, y: boxTop, width: frameW, height: frameH });
    } catch (error) {
      // a broken image must not lose the whole sheet
    }
  }

  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.rect(frameX, boxTop, frameW, frameH);

  // corner ticks
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.4);
  const tick = 5;
  const corners = [
    [frameX, boxTop, 1, 1],
    [frameX + frameW, boxTop, -1, 1],
    [frameX, boxTop + frameH, 1, -1],
    [frameX + frameW, boxTop + frameH, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    doc.line(x, y, x + tick * dx, y);
    doc.line(x, y, x, y + tick * dy);
  });

  // badge inside the frame
  const badge = calibrated ? "TRUE SIZE  1:1" : "NOT TO SCALE";
  doc.setFontSize(6.4);
  doc.setFont("helvetica", "bold");
  const badgeW = doc.getTextWidth(badge) + 3.4;
  doc.setFillColor(...(calibrated ? ACCENT : WARN));
  doc.roundedRect(frameX + 3, boxTop + 3, badgeW, 4.6, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(badge, frameX + 3 + badgeW / 2, boxTop + 6.3, { align: "center" });

  // ------------------------------------------------------- annotations ---
  const toSheet = (point) => ({
    x: frameX + (point.x - crop.x) * metrics.mmPerPx,
    y: boxTop + (point.y - crop.y) * metrics.mmPerPx,
  });
  const inside = (p) =>
    p.x > frameX + 2 && p.x < frameX + frameW - 2 && p.y > boxTop + 2 && p.y < boxTop + frameH - 2;

  const pill = (text, x, y, color) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const w = doc.getTextWidth(text) + 3;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.2);
    doc.roundedRect(x - w / 2, y - 3.2, w, 4.4, 1, 1, "FD");
    doc.setTextColor(...color);
    doc.text(text, x, y - 0.1, { align: "center" });
  };

  if (calibrated && metrics.anchors) {
    const right = toSheet(metrics.anchors.rightEye);
    const left = toSheet(metrics.anchors.leftEye);
    const nasion = toSheet(metrics.anchors.nasion);
    const faceL = toSheet(metrics.anchors.faceLeft);
    const faceR = toSheet(metrics.anchors.faceRight);

    if (inside(right) && inside(left)) {
      // pupillary distance line, with end ticks
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.35);
      doc.line(left.x, left.y, right.x, right.y);
      [left, right].forEach((p) => {
        doc.line(p.x, p.y - 2, p.x, p.y + 2);
      });
      doc.setLineWidth(0.2);
      doc.setFillColor(...ACCENT);
      [left, right].forEach((p) => doc.circle(p.x, p.y, 0.55, "F"));

      const midX = (left.x + right.x) / 2;
      const midY = (left.y + right.y) / 2;
      pill(
        "PD " + metrics.pdMm.toFixed(1) + " mm",
        midX,
        midY - 4,
        ACCENT
      );

      // monocular labels just under each pupil
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(...ACCENT);
      if (inside(nasion)) {
        doc.text("R " + metrics.rightPdMm.toFixed(1), right.x, right.y + 5.6, { align: "center" });
        doc.text("L " + metrics.leftPdMm.toFixed(1), left.x, left.y + 5.6, { align: "center" });
        doc.setDrawColor(...ACCENT);
        doc.setLineWidth(0.18);
        doc.setLineDashPattern([0.7, 0.7], 0);
        doc.line(right.x, right.y, nasion.x, nasion.y);
        doc.line(left.x, left.y, nasion.x, nasion.y);
        doc.setLineDashPattern([], 0);
      }
    }

    if (inside(faceL) && inside(faceR)) {
      const y = Math.max(faceL.y, faceR.y) + 0;
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.3);
      doc.line(faceL.x, y, faceR.x, y);
      [faceL, faceR].forEach((p) => doc.line(p.x, y - 1.6, p.x, y + 1.6));
      pill("Face width " + metrics.faceWidthMm + " mm", (faceL.x + faceR.x) / 2, y + 6, ACCENT);
    }
  }

  // ------------------------------------------------------- data block ---
  const dataTop = boxTop + frameH + 8;

  const rows = calibrated
    ? [
        ["Pupillary distance", metrics.pdMm.toFixed(1) + " mm"],
        [
          "Right / left PD",
          metrics.rightPdMm.toFixed(1) +
            " / " +
            metrics.leftPdMm.toFixed(1) +
            " mm" +
            // a turned head shifts each eye sideways: say so instead of
            // pretending the split is as exact as the total
            ((metrics.issues || []).some((issue) => /turn/i.test(String(issue)))
              ? " (approx.)"
              : ""),
        ],
        ["Face width (cheekbones)", metrics.faceWidthMm + " mm"],
        [
          "Scale reference",
          metrics.calibration === "known-pd"
            ? "your PD (exact)"
            : "iris 11.7 mm (approx.)",
        ],
        ["Head position", metrics.level === "good" ? "straight" : metrics.issues.join(", ")],
      ]
    : [
        ["Pupillary distance", "not measured"],
        ["Face width", "not measured"],
        ["Scale", "unknown"],
      ];

  // second column: how to use it
  const noteX = MARGIN + 98;
  const notes = calibrated
    ? [
        "The face is printed at 1:1, so a frame front can be held",
        "against it: compare the frame width with the face width",
        "line, and the optical centres with the PD line.",
        metrics.calibration === "known-pd"
          ? "Scale comes from your own PD, so the size is exact."
          : "Scale comes from the iris reference: expect about 5%.",
      ]
    : [
        "Reference only: the scale could not be calibrated, so",
        "the face is not printed at true size.",
      ];

  const rulerY = Math.min(dataTop + Math.max(rows.length, notes.length) * 5.2 + 8, 268);

  // White card behind the numbers only: the ruler and the print check below
  // stay on the graph paper, where they are actually useful.
  const cardBottom = Math.min(
    286,
    dataTop + Math.max(rows.length * 5.2, notes.length * 4.2) + 3
  );
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN - 4, dataTop - 6, CONTENT_W + 8, cardBottom - (dataTop - 6), 2.5, 2.5, "FD");
  doc.setLineWidth(0.2);
  doc.line(MARGIN, dataTop - 4, pageW - MARGIN, dataTop - 4);

  doc.setFontSize(7.4);
  rows.forEach(([label, value], index) => {
    const y = dataTop + index * 5.2;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(label, MARGIN, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(String(value), MARGIN + 44, y);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.6);
  doc.setTextColor(...MUTED);
  notes.forEach((line, index) => {
    doc.text(line, noteX, dataTop + index * 4.2);
  });

  // ----------------------------------------------------------- ruler ---
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, rulerY, MARGIN + 100, rulerY);
  for (let i = 0; i <= 100; i += 10) {
    const x = MARGIN + i;
    const tall = i % 50 === 0 ? 3.2 : 2.2;
    doc.setLineWidth(0.25);
    doc.line(x, rulerY - tall, x, rulerY);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  doc.text("0", MARGIN, rulerY + 4, { align: "center" });
  doc.text("50", MARGIN + 50, rulerY + 4, { align: "center" });
  doc.text("100 mm", MARGIN + 100, rulerY + 4, { align: "center" });

  doc.setFontSize(6.2);
  doc.text("PRINT CHECK", MARGIN + 118, rulerY - 0.4, { charSpace: 0.6 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(...INK);
  doc.text(
    "Measure this line with a real ruler: it must be exactly 100 mm. In the print dialog choose",
    MARGIN,
    rulerY + 8
  );
  doc.setTextColor(...MUTED);
  doc.text(
    "100% / actual size, never \"fit to page\". When it matches, the face above is true size too.",
    MARGIN,
    rulerY + 11.6
  );
  doc.text(
    "Grid: each small square is 1 mm (bold every 10 mm). Lay a lens or a sticker on it by eye.",
    MARGIN,
    rulerY + 15.2
  );

  // ---------------------------------------------------------- footer ---
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 288, pageW - MARGIN, 288);
  doc.setFontSize(6.4);
  doc.setTextColor(...MUTED);
  doc.text(
    shopName + "  ·  face photo tool  ·  " + formatStamp(takenAt) + "  ·  " + (metrics ? "PD " + metrics.pdMm + " mm" : ""),
    MARGIN,
    292
  );
  doc.text("Keep this sheet with the order.", pageW - MARGIN, 292, { align: "right" });

  return { doc, calibrated, frame: { x: frameX, y: boxTop, width: frameW, height: frameH } };
}

export default buildFaceSheet;