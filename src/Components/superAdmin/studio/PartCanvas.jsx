"use client";

// Interactive per-part canvas.
//
// One canvas at the part's native pixel size (so export is pixel-exact) plus a
// pointer-transparent overlay for guides and the selection box. Layers are
// plain data: { id, src, iw, ih, x, y, scale, rot, flipX, flipY, opacity,
// visible, locked, kind, name }. x/y are the layer centre as a fraction of the
// canvas, scale is the layer width as a fraction of the canvas width.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const SNAP_PX = 7;

const layerBox = (layer, W) => {
  const dw = layer.scale * W;
  const dh = dw * (layer.ih / (layer.iw || 1));
  return { dw, dh };
};

function hitTest(layers, W, H, pt) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (!l.visible || l.locked) continue;
    const { dw, dh } = layerBox(l, W);
    const dx = pt.x - l.x * W;
    const dy = pt.y - l.y * H;
    const c = Math.cos(l.rot);
    const s = Math.sin(l.rot);
    const lx = dx * c + dy * s;
    const ly = -dx * s + dy * c;
    if (Math.abs(lx) <= dw / 2 && Math.abs(ly) <= dh / 2) return l;
  }
  return null;
}

function drawLayers(ctx, W, H, layers, getImg) {
  ctx.clearRect(0, 0, W, H);
  for (const l of layers) {
    if (!l.visible) continue;
    const img = getImg(l.src);
    if (!img) continue;
    const { dw, dh } = layerBox(l, W);
    ctx.save();
    ctx.globalAlpha = clamp(l.opacity ?? 1, 0, 1);
    ctx.translate(l.x * W, l.y * H);
    ctx.rotate(l.rot || 0);
    ctx.scale(l.flipX ? -1 : 1, l.flipY ? -1 : 1);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
}

// Offscreen render for export (used by "Save all", which must not touch the
// visible canvas).
export function paintToCanvas(canvas, W, H, layers, getImg) {
  canvas.width = W;
  canvas.height = H;
  drawLayers(canvas.getContext("2d"), W, H, layers, getImg);
}

function drawSelection(ctx, layer, W, H) {
  if (!layer) return;
  const { dw, dh } = layerBox(layer, W);
  const hw = dw / 2;
  const hh = dh / 2;
  const cx = layer.x * W;
  const cy = layer.y * H;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(layer.rot || 0);
  ctx.strokeStyle = "rgba(13,122,102,0.95)";
  ctx.lineWidth = Math.max(1.5, W / 600);
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(-hw, -hh, dw, dh);
  ctx.setLineDash([]);

  // corner handles
  const r = Math.max(4, W / 180);
  ctx.fillStyle = "#0D7A66";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, W / 900);
  for (const [x, y] of [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]) {
    ctx.beginPath();
    ctx.rect(x - r, y - r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
  }

  // rotation handle, floating above the top edge
  const off = Math.max(26, W / 30);
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, -hh - off);
  ctx.strokeStyle = "rgba(13,122,102,0.95)";
  ctx.lineWidth = Math.max(1.5, W / 600);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -hh - off, r * 1.15, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#0D7A66";
  ctx.stroke();
  ctx.restore();
}

function drawGuides(ctx, W, H, guides) {
  if (!guides) return;
  ctx.save();
  ctx.lineWidth = Math.max(1, W / 900);
  for (const g of guides) {
    ctx.strokeStyle = g.color || "rgba(40,40,40,0.35)";
    ctx.fillStyle = g.color || "rgba(40,40,40,0.35)";
    ctx.setLineDash(g.dash ? [6, 6] : []);
    if (g.type === "v") {
      ctx.beginPath();
      ctx.moveTo(g.x, g.y1 ?? 0);
      ctx.lineTo(g.x, g.y2 ?? H);
      ctx.stroke();
    } else if (g.type === "h") {
      ctx.beginPath();
      ctx.moveTo(g.x1 ?? 0, g.y);
      ctx.lineTo(g.x2 ?? W, g.y);
      ctx.stroke();
    } else if (g.type === "rect") {
      ctx.strokeRect(g.x, g.y, g.w, g.h);
    } else if (g.type === "circle") {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (g.type === "cross") {
      const s = g.size || 12;
      ctx.beginPath();
      ctx.moveTo(g.x - s, g.y);
      ctx.lineTo(g.x + s, g.y);
      ctx.moveTo(g.x, g.y - s);
      ctx.lineTo(g.x, g.y + s);
      ctx.stroke();
    } else if (g.type === "dot") {
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r || 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (g.type === "text") {
      ctx.setLineDash([]);
      ctx.font = `${g.font || Math.max(11, W / 90)}px ui-monospace, monospace`;
      ctx.fillText(g.text, g.x, g.y);
    }
  }
  ctx.restore();
}

const PartCanvas = forwardRef(function PartCanvas(
  {
    width,
    height,
    layers,
    selectedId,
    onSelect,
    onUpdate,
    guides,
    showGuides,
    getImage,
    version,
    onDropFiles,
  },
  ref
) {
  const baseRef = useRef(null);
  const overlayRef = useRef(null);
  const dragRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const selected = layers.find((l) => l.id === selectedId) || null;

  const paint = useCallback(() => {
    const c = baseRef.current;
    const o = overlayRef.current;
    if (!c || !o) return;
    const ctx = c.getContext("2d");
    drawLayers(ctx, width, height, layers, getImage);
    const octx = o.getContext("2d");
    octx.clearRect(0, 0, width, height);
    if (showGuides) drawGuides(octx, width, height, guides);
    drawSelection(octx, selected, width, height);
  }, [width, height, layers, getImage, showGuides, guides, selected, version]);

  useEffect(() => {
    for (const c of [baseRef.current, overlayRef.current]) {
      if (!c) continue;
      if (c.width !== width || c.height !== height) {
        c.width = width;
        c.height = height;
      }
    }
    paint();
  }, [paint, width, height]);

  useImperativeHandle(
    ref,
    () => ({
      toBlob: () =>
        new Promise((resolve) => {
          paint();
          const c = baseRef.current;
          if (!c) return resolve(null);
          c.toBlob((b) => resolve(b), "image/png");
        }),
      getCanvas: () => baseRef.current,
    }),
    [paint]
  );

  const rectRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const queueRef = useRef(null);
  const wheelRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const toCanvas = useCallback(
    (e) => {
      const r = rectRef.current || baseRef.current?.getBoundingClientRect();
      if (!r) return { x: 0, y: 0 };
      return {
        x: ((e.clientX - r.left) * width) / r.width,
        y: ((e.clientY - r.top) * height) / r.height,
      };
    },
    [width, height]
  );

  // Coalesce gesture updates to one React commit per animation frame, so a
  // fast drag does not queue a re-render for every pointermove.
  const queuePatch = useCallback(
    (id, patch) => {
      const prev = queueRef.current;
      queueRef.current = {
        id,
        patch: prev && prev.id === id ? { ...prev.patch, ...patch } : { ...patch },
      };
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const q = queueRef.current;
        queueRef.current = null;
        if (q) onUpdate(q.id, q.patch);
      });
    },
    [onUpdate]
  );

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.style.userSelect = "";
    },
    []
  );

  const lockSelection = () => {
    document.body.style.userSelect = "none";
    setDragging(true);
  };

  const rotHandlePoint = (l) => {
    const { dh } = layerBox(l, width);
    const off = Math.max(26, width / 30);
    const dist = dh / 2 + off;
    const c = Math.cos(l.rot || 0);
    const s = Math.sin(l.rot || 0);
    return {
      // local (0, -dist) rotated by rot, relative to the layer centre
      x: l.x * width + dist * s,
      y: l.y * height - dist * c,
      r: Math.max(14, width / 45),
    };
  };

  const onPointerDown = (e) => {
    // keep the gesture inside the canvas: no text selection, no native drag
    e.preventDefault();
    rectRef.current = baseRef.current.getBoundingClientRect();
    const pt = toCanvas(e);

    if (selected) {
      const h = rotHandlePoint(selected);
      if (Math.hypot(pt.x - h.x, pt.y - h.y) <= h.r) {
        dragRef.current = {
          id: selected.id,
          mode: "rotate",
          cx: selected.x * width,
          cy: selected.y * height,
          startAngle: Math.atan2(pt.y - selected.y * height, pt.x - selected.x * width),
          rot0: selected.rot || 0,
        };
        lockSelection();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (_) {}
        return;
      }
    }

    const hit = hitTest(layers, width, height, pt);
    if (!hit) {
      onSelect(null);
      return;
    }
    onSelect(hit.id);
    dragRef.current = {
      id: hit.id,
      mode: e.altKey || e.button === 2 ? "rotate" : "move",
      startX: pt.x,
      startY: pt.y,
      x0: hit.x,
      y0: hit.y,
      cx: hit.x * width,
      cy: hit.y * height,
      rot0: hit.rot || 0,
      startAngle: Math.atan2(pt.y - hit.y * height, pt.x - hit.x * width),
    };
    lockSelection();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    const pt = toCanvas(e);
    if (d.mode === "rotate") {
      const a = Math.atan2(pt.y - d.cy, pt.x - d.cx);
      let rot = d.rot0 + (a - d.startAngle);
      if (e.shiftKey) rot = Math.round(rot / (Math.PI / 12)) * (Math.PI / 12);
      queuePatch(d.id, { rot });
    } else {
      let x = d.x0 + (pt.x - d.startX) / width;
      let y = d.y0 + (pt.y - d.startY) / height;
      // magnetic centre lines
      if (Math.abs(x - 0.5) * width < SNAP_PX) x = 0.5;
      if (Math.abs(y - 0.5) * height < SNAP_PX) y = 0.5;
      queuePatch(d.id, { x, y });
    }
  };

  const endDrag = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    rectRef.current = null;
    document.body.style.userSelect = "";
    setDragging(false);
  };

  const onWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!rectRef.current) rectRef.current = baseRef.current.getBoundingClientRect();
    const pt = toCanvas(e);
    const target = hitTest(layers, width, height, pt) || selected;
    if (!target) return;

    // apply on top of the patch already queued this frame, so several wheel
    // ticks in one frame compound instead of overwriting each other
    const q = queueRef.current;
    const base = q && q.id === target.id ? { ...target, ...q.patch } : target;

    const f = Math.exp(-e.deltaY * 0.0015);
    const nScale = clamp(base.scale * f, 0.01, 30);
    const k = nScale / base.scale;
    if (k === 1) return;
    const px = base.x * width;
    const py = base.y * height;
    queuePatch(target.id, {
      scale: nScale,
      x: (pt.x - (pt.x - px) * k) / width,
      y: (pt.y - (pt.y - py) * k) / height,
    });
  };
  wheelRef.current = onWheel;

  // React's onWheel is passive; a non-passive native listener on the wrapper
  // keeps the page from scrolling while the cursor is over the canvas.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const handler = (e) => wheelRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const onDoubleClick = (e) => {
    const pt = toCanvas(e);
    const hit = hitTest(layers, width, height, pt);
    if (!hit) return;
    const fit = Math.min(1, (height / width) * (hit.iw / hit.ih));
    queuePatch(hit.id, { x: 0.5, y: 0.5, scale: fit, rot: 0 });
  };

  return (
    <div
      ref={wrapRef}
      className={
        "relative w-full rounded-xl overflow-hidden border border-border select-none " +
        (dragging ? "cursor-grabbing" : "")
      }
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
        backgroundColor: "#f4f4f4",
        backgroundImage:
          "linear-gradient(45deg,#e6e6e6 25%,transparent 25%),linear-gradient(-45deg,#e6e6e6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e6e6e6 75%),linear-gradient(-45deg,transparent 75%,#e6e6e6 75%)",
        backgroundSize: "18px 18px",
        backgroundPosition: "0 0,0 9px,9px -9px,-9px 0",
        outline: dragOver ? "2px solid #0D7A66" : "none",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length) onDropFiles?.(files);
      }}
    >
      <canvas
        ref={baseRef}
        width={width}
        height={height}
        className="block w-full h-auto touch-none select-none"
        style={{ aspectRatio: `${width} / ${height}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      <canvas
        ref={overlayRef}
        width={width}
        height={height}
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ aspectRatio: `${width} / ${height}` }}
      />
      <div className="absolute left-2 bottom-1.5 text-[10px] font-mono text-black/40">
        {width}×{height}
      </div>
    </div>
  );
});

export default PartCanvas;
