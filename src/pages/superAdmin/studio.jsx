"use client";

// Try-On Studio — per-part, layer-based editor.
//
// Each of the six renderer slots gets its own native-size canvas: the generated
// art is a locked layer on top of which you stack images you import (drop,
// file picker or the asset library). Layers can be dragged, wheel-zoomed,
// rotated (Alt-drag or the round handle), flipped, faded and locked. The
// canvas is exactly the pixel box the renderer stretches the part to, so what
// you see is what gets saved — no resampling on the way out.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Wand2,
  Download,
  RefreshCw,
  Link2,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  FlipHorizontal,
  FlipVertical,
  Move,
  Save,
  Layers as LayersIcon,
  ImagePlus,
  Package,
  Undo2,
  Redo2,
  Palette,
  Plus,
} from "lucide-react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import {
  PageHeader,
  Card,
  Field,
  inputCls,
  btnPrimary,
  btnGhost,
  btnDanger,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi, SERVER_URL } from "@/Api/adminApi";
import PartCanvas, { paintToCanvas } from "@/Components/superAdmin/studio/PartCanvas";
import VariantCanvas from "@/Components/superAdmin/studio/VariantCanvas";
import useHistory from "@/Components/superAdmin/studio/useHistory";

const DEFAULTS = {
  shape: "cat-eye",
  frameColor: "#2b241d",
  metalColor: "#d8b74a",
  tintColor: "#5b7294",
  tintOpacity: 0.35,
  gloss: true,
  rimWidth: 30,
  lensW: 0.9,
  lensH: 0.68,
  drop: 0.06,
  templeLen: 0.7,
};

const SLOTS = [
  { key: "left", label: "Lens L", hint: "Lens centre = iris centre. Art fills the box." },
  { key: "right", label: "Lens R", hint: "Mirrored lens art. Same box as Lens L." },
  { key: "bridge", label: "Bridge", hint: "Centre = bridge midpoint; ends tuck behind the rims." },
  { key: "templeL", label: "Temple L", hint: "Hinge on the LEFT edge, tip right, vertically symmetric." },
  { key: "templeR", label: "Temple R", hint: "Same strip as Temple L — the renderer rotates it." },
  { key: "single", label: "Single", hint: "Whole front frame, lenses + bridge, no temples." },
];

const MIRROR = { left: "right", right: "left", templeL: "templeR", templeR: "templeL" };

const num = (v, d) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const uid = () => `l${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const payload = (r) => ({
  shape: r.shape,
  frameColor: r.frameColor,
  metalColor: r.metalColor,
  tintColor: r.tintColor,
  tintOpacity: num(r.tintOpacity, DEFAULTS.tintOpacity),
  gloss: r.gloss,
  rimWidth: num(r.rimWidth, DEFAULTS.rimWidth),
  calibration: {
    lensW: num(r.lensW, DEFAULTS.lensW),
    lensH: num(r.lensH, DEFAULTS.lensH),
    drop: num(r.drop, DEFAULTS.drop),
    templeLen: num(r.templeLen, DEFAULTS.templeLen),
  },
});

const shapeKey = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

// Mirrors sceneLayout() in utils/tryonArt.js — used only for the guides and
// the compose preview. The single PNG is a 1:1 slice of unit space, so this is
// pure placement math with no fit scaling.
const EYE_FRAC = 0.474;

function singleSize(recipe) {
  const lw = Math.round(num(recipe.lensW, 0.9) * 1000);
  const lh = Math.round(num(recipe.lensH, 0.68) * 1000);
  const dropPx = Math.round(num(recipe.drop, 0.06) * 1000);
  const W = 1000 + lw;
  const H = Math.max(
    780,
    Math.ceil((dropPx + lh / 2) / (1 - EYE_FRAC)),
    Math.ceil((lh / 2 - dropPx) / EYE_FRAC)
  );
  return { w: W, h: H };
}

function singleLayout(recipe, sizes) {
  const { w: W, h: H } = sizes.single;
  const eyeY = Math.round(H * EYE_FRAC);
  const lensCy = eyeY + Math.round(num(recipe.drop, 0.06) * 1000);
  const lensCx = W / 2 - 500;
  const lw = sizes.lens.w;
  const lh = sizes.lens.h;
  const bw = sizes.bridge.w;
  const bh = sizes.bridge.h;
  const bridgeCy = lensCy - 80;
  const at = (x, y, w, h) => ({ x, y, w, h });
  return {
    eyeY,
    lensCy,
    lensCx,
    bridgeCy,
    left: at(lensCx - lw / 2, lensCy - lh / 2, lw, lh),
    right: at(W - lensCx - lw / 2, lensCy - lh / 2, lw, lh),
    bridge: at(W / 2 - bw / 2, bridgeCy - bh / 2, bw, bh),
  };
}

function buildGuides(slot, size, recipe, sizes) {
  const W = size.w;
  const H = size.h;
  const soft = "rgba(25,25,25,0.22)";
  const acc = "rgba(13,122,102,0.55)";
  const strong = "rgba(13,122,102,0.9)";
  const g = [{ type: "rect", x: 0, y: 0, w: W, h: H, color: soft }];

  if (slot === "left" || slot === "right") {
    g.push({ type: "v", x: W / 2, color: acc, dash: true });
    g.push({ type: "h", y: H / 2, color: acc, dash: true });
    g.push({ type: "cross", x: W / 2, y: H / 2, size: W / 22, color: strong });
    g.push({ type: "text", x: 12, y: 26, text: "iris centre", color: "rgba(25,25,25,0.5)" });
  } else if (slot === "bridge") {
    // the arch is drawn in a 300x100 design box scaled by width and centred in
    // the taller canvas, so the rim-tuck dots sit on that line, not at 62% of H
    const k = W / 300;
    const designH = 100 * k;
    const archY = (H - designH) / 2 + designH * 0.62;
    g.push({ type: "v", x: W / 2, color: acc, dash: true });
    g.push({ type: "h", y: archY, color: acc, dash: true });
    g.push({ type: "cross", x: W / 2, y: archY, size: 12, color: strong });
    g.push({ type: "dot", x: 1.5, y: archY, r: 3.5, color: strong });
    g.push({ type: "dot", x: W - 1.5, y: archY, r: 3.5, color: strong });
    g.push({ type: "text", x: 8, y: 18, text: "rim tuck", color: "rgba(25,25,25,0.5)" });
    if (H - designH > 8) {
      g.push({ type: "text", x: 8, y: H - 8, text: "headroom", color: "rgba(25,25,25,0.35)" });
    }
  } else if (slot === "templeL" || slot === "templeR") {
    g.push({ type: "rect", x: 0, y: 0, w: W * 0.1, h: H, color: acc });
    g.push({ type: "h", y: H / 2, color: acc, dash: true });
    g.push({ type: "dot", x: W * 0.1, y: H / 2, r: 3, color: strong });
    g.push({ type: "text", x: 8, y: H - 6, text: "hinge", color: "rgba(25,25,25,0.5)" });
    g.push({ type: "text", x: W - 60, y: H - 6, text: "tip", color: "rgba(25,25,25,0.5)" });
  } else {
    const L = singleLayout(recipe, sizes);
    g.push({ type: "v", x: L.lensCx, color: acc, dash: true });
    g.push({ type: "v", x: W - L.lensCx, color: acc, dash: true });
    g.push({ type: "h", y: L.eyeY, color: "rgba(13,122,102,0.35)", dash: true });
    for (const box of [L.left, L.right, L.bridge]) {
      g.push({ type: "rect", x: box.x, y: box.y, w: box.w, h: box.h, color: "rgba(13,122,102,0.45)" });
    }
    for (const box of [L.left, L.right]) {
      g.push({ type: "cross", x: box.x + box.w / 2, y: box.y + box.h / 2, size: 9, color: strong });
    }
    g.push({ type: "text", x: 12, y: 26, text: "eye line 47.4% · lens centres 23.7% / 76.3%", color: "rgba(25,25,25,0.5)" });
  }
  return g;
}

export default function TryOnStudio() {
  const [shapes, setShapes] = useState([]);
  // fixed-size slot boxes come from the server so canvas and PNG never drift
  const [units, setUnits] = useState(null);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [assign, setAssign] = useState(true);
  const [recipe, setRecipe] = useState(DEFAULTS);

  const [slots, setSlots] = useState({});
  const [active, setActive] = useState("left");
  const [selId, setSelId] = useState(null);
  const [showGuides, setShowGuides] = useState(true);

  const [library, setLibrary] = useState(null);
  const [libTab, setLibTab] = useState("kit");
  const [saved, setSaved] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  // result of the server-side GLB audit for the product being edited
  const [modelCheck, setModelCheck] = useState(null);
  // colour / lens variations of the selected product (saved records + drafts)
  const [variations, setVariations] = useState([]);

  const [imgVersion, setImgVersion] = useState(0);
  const imgCache = useRef(new Map()); // src -> Promise<Image|null>
  const imgReady = useRef(new Map()); // src -> Image
  const artUrls = useRef({});
  const canvasRef = useRef(null);
  const fileInput = useRef(null);

  const set = (k, v) => setRecipe((r) => ({ ...r, [k]: v }));

  // Undo/redo over the layer state (all slots share one timeline).
  const history = useHistory(slots, setSlots);
  const historyRef = useRef(null);
  historyRef.current = history;

  // ---- image cache ------------------------------------------------------
  // Everything goes through fetch + object URL: a plain <img> from :4000
  // would taint the canvas and break PNG export.
  const loadImage = useCallback((src) => {
    const cache = imgCache.current;
    if (cache.has(src)) return cache.get(src);
    const p = (async () => {
      const img = new Image();
      const loaded = new Promise((res, rej) => {
        img.onload = () => res(img);
        img.onerror = rej;
      });
      try {
        const r = await fetch(src);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        img.src = URL.createObjectURL(await r.blob());
        await loaded;
        imgReady.current.set(src, img);
        setImgVersion((v) => v + 1);
        return img;
      } catch (e) {
        cache.delete(src);
        return null;
      }
    })();
    cache.set(src, p);
    return p;
  }, []);

  const getImage = useCallback((src) => imgReady.current.get(src) || null, []);

  // ---- boot -------------------------------------------------------------
  useEffect(() => {
    adminApi.studio
      .shapes()
      .then((d) => {
        setShapes(d?.shapes || []);
        setUnits(d?.units || null);
      })
      .catch(() => setShapes([]));
    adminApi.products
      .list()
      .then((list) => setProducts(Array.isArray(list) ? list : []))
      .catch(() => setProducts([]));
  }, []);

  const refreshLibrary = useCallback(
    (pid) => {
      adminApi.studio
        .library(pid)
        .then((g) => setLibrary(g || {}))
        .catch(() => setLibrary({}));
    },
    []
  );

  useEffect(() => {
    refreshLibrary(productId);
  }, [productId, refreshLibrary]);

  // ---- sizes ------------------------------------------------------------
  const sizes = useMemo(
    () => ({
      single: singleSize(recipe),
      lens: { w: Math.round(num(recipe.lensW, 0.9) * 1000), h: Math.round(num(recipe.lensH, 0.68) * 1000) },
      bridge: {
        w: Math.round(num(units?.bridge?.w, 0.3) * 1000),
        h: Math.round(num(units?.bridge?.h, 0.16) * 1000),
      },
      temple: { w: Math.round(num(recipe.templeLen, 0.7) * 1000), h: 50 },
    }),
    [recipe.lensW, recipe.lensH, recipe.templeLen, recipe.drop, units]
  );

  const sizeFor = useCallback(
    (slot) =>
      slot === "left" || slot === "right"
        ? sizes.lens
        : slot === "bridge"
        ? sizes.bridge
        : slot === "single"
        ? sizes.single
        : sizes.temple,
    [sizes]
  );

  // ---- generated art layers --------------------------------------------
  // Canvases start EMPTY. Generated art is only fetched/refreshed for slots
  // that actually have an art layer, so a fresh studio makes no requests.
  // "Add generated art" inserts the layer on demand.
  const artKeys = SLOTS.map(({ key }) => key)
    .filter((key) => (slots[key] || []).some((l) => l.kind === "art"))
    .join(",");

  useEffect(() => {
    if (!artKeys) return undefined;
    const keys = artKeys.split(",");
    let alive = true;
    const t = setTimeout(async () => {
      const body = payload(recipe);
      const urls = {};
      await Promise.all(
        keys.map(async (key) => {
          try {
            const res = await adminApi.studio.partSvg(key, body);
            if (!alive) return;
            const url = URL.createObjectURL(res.data);
            urls[key] = url;
            await loadImage(url);
          } catch (_) {}
        })
      );
      if (!alive) {
        Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      for (const k of Object.keys(urls)) {
        if (artUrls.current[k]) URL.revokeObjectURL(artUrls.current[k]);
      }
      artUrls.current = { ...artUrls.current, ...urls };
      historyRef.current?.markExternal();
      setSlots((prev) => {
        const next = { ...prev };
        for (const key of keys) {
          const url = urls[key];
          if (!url) continue;
          const size = sizeFor(key);
          const arr = next[key] || [];
          const i = arr.findIndex((l) => l.kind === "art");
          if (i < 0) continue;
          const copy = arr.slice();
          copy[i] = { ...copy[i], src: url, iw: size.w, ih: size.h };
          next[key] = copy;
        }
        return next;
      });
    }, 320);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // sizeFor is derived from the recipe; artKeys covers layer presence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, artKeys, loadImage]);

  const addArt = useCallback(
    async (slot) => {
      setBusy("art");
      setError("");
      try {
        const res = await adminApi.studio.partSvg(slot, payload(recipe));
        const url = URL.createObjectURL(res.data);
        if (artUrls.current[slot]) URL.revokeObjectURL(artUrls.current[slot]);
        artUrls.current[slot] = url;
        await loadImage(url);
        const size = sizeFor(slot);
        const layer = {
          id: `art-${slot}`,
          kind: "art",
          name: "Generated art",
          src: url,
          iw: size.w,
          ih: size.h,
          x: 0.5,
          y: 0.5,
          scale: 1,
          rot: 0,
          flipX: false,
          flipY: false,
          opacity: 1,
          visible: true,
          locked: true,
        };
        setSlots((prev) => ({
          ...prev,
          [slot]: [layer, ...(prev[slot] || []).filter((l) => l.kind !== "art")],
        }));
        setSelId(null);
        setFlash("Generated art added — locked, at the renderer's registration");
        setTimeout(() => setFlash(""), 2200);
      } catch (_) {
        setError("Could not generate the art layer.");
      } finally {
        setBusy("");
      }
    },
    [recipe, loadImage, sizeFor]
  );

  // ---- layer helpers ----------------------------------------------------
  const patchLayer = useCallback((id, patch) => {
    setSlots((prev) => {
      const next = {};
      let found = false;
      for (const [k, arr] of Object.entries(prev)) {
        const i = arr.findIndex((l) => l.id === id);
        if (i >= 0) {
          const copy = arr.slice();
          copy[i] = { ...copy[i], ...patch };
          next[k] = copy;
          found = true;
        } else {
          next[k] = arr;
        }
      }
      return found ? next : prev;
    });
  }, []);

  const removeLayer = useCallback(
    (id) => {
      setSlots((prev) => {
        const next = {};
        for (const [k, arr] of Object.entries(prev)) next[k] = arr.filter((l) => l.id !== id);
        return next;
      });
      setSelId((cur) => (cur === id ? null : cur));
    },
    []
  );

  const addLayer = useCallback(
    async (slot, src, opts = {}) => {
      const img = await loadImage(src);
      if (!img) {
        setError("Could not load that image.");
        return null;
      }
      const iw = img.naturalWidth || opts.iw || 1;
      const ih = img.naturalHeight || opts.ih || 1;
      const size = sizeFor(slot);
      const fit = Math.min(1, (size.h / size.w) * (iw / ih));
      const layer = {
        id: uid(),
        kind: "image",
        name: opts.name || "Image",
        src,
        iw,
        ih,
        x: 0.5,
        y: 0.5,
        scale: opts.scale ?? fit,
        rot: 0,
        flipX: false,
        flipY: false,
        opacity: 1,
        visible: true,
        locked: false,
      };
      setSlots((prev) => ({ ...prev, [slot]: [...(prev[slot] || []), layer] }));
      setSelId(layer.id);
      return layer;
    },
    [loadImage, sizeFor]
  );

  const addFiles = useCallback(
    async (slot, files) => {
      const imgs = files.filter((f) => String(f.type).startsWith("image/"));
      for (const f of imgs) {
        const url = URL.createObjectURL(f);
        await addLayer(slot, url, { name: f.name });
      }
    },
    [addLayer]
  );

  const duplicateLayer = useCallback(
    (layer) => {
      if (!layer) return;
      const copy = { ...layer, id: uid(), x: Math.min(0.98, layer.x + 0.03), y: Math.min(0.98, layer.y + 0.03) };
      setSlots((prev) => ({ ...prev, [active]: [...(prev[active] || []), copy] }));
      setSelId(copy.id);
    },
    [active]
  );

  const reorder = useCallback(
    (layer, dir) => {
      if (!layer) return;
      setSlots((prev) => {
        const arr = (prev[active] || []).slice();
        const i = arr.findIndex((l) => l.id === layer.id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return prev;
        [arr[i], arr[j]] = [arr[j], arr[i]];
        return { ...prev, [active]: arr };
      });
    },
    [active]
  );

  const mirrorLayer = useCallback(
    (layer) => {
      const other = MIRROR[active];
      if (!layer || !other) return;
      const copy = {
        ...layer,
        id: uid(),
        x: 1 - layer.x,
        rot: -(layer.rot || 0),
        flipX: !layer.flipX,
      };
      setSlots((prev) => ({ ...prev, [other]: [...(prev[other] || []), copy] }));
      setFlash(`Mirrored into ${other}`);
      setTimeout(() => setFlash(""), 1800);
    },
    [active]
  );

  const resetSlot = useCallback((slot) => {
    setSlots((prev) => ({ ...prev, [slot]: [] }));
    setSelId(null);
  }, []);

  const resetArtTransform = useCallback(() => {
    patchLayer(`art-${active}`, { x: 0.5, y: 0.5, scale: 1, rot: 0, flipX: false, flipY: false, opacity: 1 });
  }, [active, patchLayer]);

  // ---- export / save ----------------------------------------------------
  const exportSlot = useCallback(
    async (slot) => {
      const size = sizeFor(slot);
      const c = document.createElement("canvas");
      paintToCanvas(c, size.w, size.h, slots[slot] || [], getImage);
      return new Promise((res) => c.toBlob(res, "image/png"));
    },
    [sizeFor, slots, getImage]
  );

  const saveSlot = useCallback(
    async (slot, attach) => {
      const blob = await exportSlot(slot);
      if (!blob) throw new Error("export failed");
      const fd = new FormData();
      fd.append("file", blob, `${slot}.png`);
      fd.append("slot", slot);
      fd.append("assign", String(!!attach));
      fd.append("recipe", JSON.stringify(payload(recipe)));
      if (productId) fd.append("productId", productId);
      return adminApi.studio.savePart(fd);
    },
    [exportSlot, recipe, productId]
  );

  const saveCurrent = useCallback(async () => {
    setBusy("save");
    setError("");
    try {
      const data = await saveSlot(active, productId && assign);
      setSaved((s) => ({ ...s, [active]: data }));
      refreshLibrary(productId);
      if (data?.assigned) {
        adminApi.products.list().then((l) => setProducts(l)).catch(() => {});
      }
      setFlash(`${active} saved — ${data.w}×${data.h}`);
      setTimeout(() => setFlash(""), 2200);
      // the PNG is fine but the GLB could not be rebuilt: without it the
      // storefront falls back to the flat try-on instead of Jeeliz
      if (data?.modelError) setError(`3D model not rebuilt: ${data.modelError}`);
      if (data?.modelCheck) setModelCheck(data.modelCheck);
    } catch (e) {
      setError(e?.response?.data?.message || "Save failed — check the backend log.");
    } finally {
      setBusy("");
    }
  }, [active, assign, productId, saveSlot, refreshLibrary]);

  const saveAll = useCallback(async () => {
    setBusy("all");
    setError("");
    const next = {};
    try {
      for (const { key } of SLOTS) {
        if (!(slots[key] || []).length) continue;
        next[key] = await saveSlot(key, productId && assign);
      }
      setSaved((s) => ({ ...s, ...next }));
      refreshLibrary(productId);
      if (productId && assign) {
        adminApi.products.list().then((l) => setProducts(l)).catch(() => {});
      }
      setFlash(`Saved ${Object.keys(next).length} parts`);
      setTimeout(() => setFlash(""), 2200);
    } catch (e) {
      setError(e?.response?.data?.message || "Save failed — check the backend log.");
    } finally {
      setBusy("");
    }
  }, [slots, saveSlot, productId, assign, refreshLibrary]);

  const files = useMemo(() => {
    const out = {};
    for (const [slot, data] of Object.entries(saved)) {
      if (data?.file) out[slot] = data.file;
    }
    return out;
  }, [saved]);

  const composeSingle = useCallback(async () => {
    setBusy("compose");
    setError("");
    try {
      const data = await adminApi.studio.compose(
        payload(recipe),
        productId || undefined,
        productId ? assign : false,
        Object.keys(files).length ? files : undefined
      );
      setSaved((s) => ({ ...s, single: data }));
      refreshLibrary(productId);
      if (data?.assigned) {
        adminApi.products.list().then((l) => setProducts(l)).catch(() => {});
      }
      setFlash("Single frontal PNG composed");
      setTimeout(() => setFlash(""), 2200);
    } catch (e) {
      setError(e?.response?.data?.message || "Compose failed — check the backend log.");
    } finally {
      setBusy("");
    }
  }, [recipe, productId, assign, files, refreshLibrary]);

  // ---- product helpers --------------------------------------------------
  const activeProduct = products.find((p) => (p._id || p.id) === productId);

  const onPickProduct = (id) => {
    setProductId(id);
    setSaved({});
    const p = products.find((x) => (x._id || x.id) === id);
    if (!p) return;
    const cal = p.tryOnParts?.calibration || {};
    setRecipe((r) => ({
      ...r,
      shape: shapeKey(p.shape) || r.shape,
      lensW: num(cal.lensW, DEFAULTS.lensW),
      lensH: num(cal.lensH, DEFAULTS.lensH),
      drop: num(cal.drop, DEFAULTS.drop),
      templeLen: num(cal.templeLen, DEFAULTS.templeLen),
    }));
  };

  // The stored kit *is* the canvas once a product is picked: each slot is
  // replaced by its saved PNG, so what the admin sees is what the storefront
  // already renders (and what a variation recolours).
  const loadProductAssets = useCallback(
    async (target) => {
      const product = target || activeProduct;
      if (!product) return;
      setBusy("load");
      setError("");
      try {
        const parts = product.tryOnParts || {};
        const next = {};
        for (const { key } of SLOTS) {
          const file = key === "single" ? product.tryOnImage : parts[key];
          if (!file) continue;
          const src = `${SERVER_URL}/img/tryon/${file}`;
          const img = await loadImage(src);
          if (!img) continue;
          const iw = img.naturalWidth || 1;
          const ih = img.naturalHeight || 1;
          const size = sizeFor(key);
          next[key] = [
            {
              id: uid(),
              kind: "image",
              name: file,
              src,
              iw,
              ih,
              x: 0.5,
              y: 0.5,
              // the stored part already fills the renderer box
              scale: Math.min(1, (size.h / size.w) * (iw / ih)),
              rot: 0,
              flipX: false,
              flipY: false,
              opacity: 1,
              visible: true,
              locked: false,
            },
          ];
        }
        if (Object.keys(next).length) {
          history.markExternal?.();
          setSlots(next);
          setSelId(null);
          setFlash("Product assets loaded as editable layers");
          setTimeout(() => setFlash(""), 2200);
        }
      } finally {
        setBusy("");
      }
    },
    [activeProduct, loadImage, sizeFor]
  );

  // selecting a product also selects its art — no extra click
  const loadedProduct = useRef("");
  useEffect(() => {
    if (!productId || loadedProduct.current === productId) return;
    const p = products.find((x) => (x._id || x.id) === productId);
    if (!p) return;
    loadedProduct.current = productId;
    loadProductAssets(p);
  }, [productId, products, loadProductAssets]);

  // ---- variations -------------------------------------------------------
  // The product's saved variations own the list; a draft is a variation that
  // exists only on this screen until it is saved.
  useEffect(() => {
    const saved = activeProduct?.tryOnParts?.variants;
    setVariations(
      Array.isArray(saved) ? saved.map((v) => ({ ...v, key: v.id })) : []
    );
  }, [activeProduct]);

  const canVary = !!(
    activeProduct &&
    activeProduct.tryOnParts?.left &&
    activeProduct.tryOnParts?.right &&
    activeProduct.tryOnParts?.bridge
  );

  const addVariation = useCallback(() => {
    setVariations((list) => [
      ...list,
      {
        key: uid(),
        id: "",
        name: `Variation ${list.length + 1}`,
        frameColor: recipe.frameColor || DEFAULTS.frameColor,
        lensColor: recipe.tintColor || DEFAULTS.tintColor,
        lensOpacity: num(recipe.tintOpacity, DEFAULTS.tintOpacity),
        draft: true,
      },
    ]);
  }, [recipe.frameColor, recipe.tintColor, recipe.tintOpacity]);

  const patchVariation = useCallback((key, patch) => {
    setVariations((list) => list.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }, []);

  const saveVariation = useCallback(
    async (v) => {
      if (!productId) return;
      setBusy(`var-${v.key}`);
      setError("");
      try {
        const data = await adminApi.studio.saveVariant({
          productId,
          id: v.id || undefined,
          name: v.name,
          frameColor: v.frameColor,
          lensColor: v.lensColor,
          lensOpacity: v.lensOpacity,
        });
        const saved = data?.variant;
        if (saved) {
          setVariations((list) =>
            list.map((x) => (x.key === v.key ? { ...saved, key: saved.id, draft: false } : x))
          );
        }
        if (data?.modelError) setError(`Variation saved, but its 3D model failed: ${data.modelError}`);
        else {
          setFlash(`${v.name} saved — reachable in the try-on`);
          setTimeout(() => setFlash(""), 2400);
        }
        if (saved?.check) setModelCheck(saved.check);
        refreshLibrary(productId);
      } catch (e) {
        setError(e?.response?.data?.message || "Could not save the variation.");
      } finally {
        setBusy("");
      }
    },
    [productId, refreshLibrary]
  );

  const removeVariation = useCallback(
    async (v) => {
      if (!v.id) {
        setVariations((list) => list.filter((x) => x.key !== v.key));
        return;
      }
      setBusy(`var-${v.key}`);
      try {
        await adminApi.studio.deleteVariant(productId, v.id);
        setVariations((list) => list.filter((x) => x.key !== v.key));
        setFlash(`${v.name} removed`);
        setTimeout(() => setFlash(""), 1800);
      } catch (e) {
        setError(e?.response?.data?.message || "Could not remove the variation.");
      } finally {
        setBusy("");
      }
    },
    [productId]
  );

  const onShape = (key) => {
    const s = shapes.find((x) => x.key === key);
    setRecipe((r) => ({ ...r, shape: key, lensH: s?.defaultLensH ?? r.lensH }));
  };

  // ---- keyboard ---------------------------------------------------------
  const activeLayers = slots[active] || [];
  const selected = activeLayers.find((l) => l.id === selId) || null;

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        history.redo();
        return;
      }

      if (!selected) return;
      const step = e.shiftKey ? 10 : 1;
      const size = sizeFor(active);
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        patchLayer(selected.id, { x: selected.x + ((e.key === "ArrowRight" ? 1 : -1) * step) / size.w });
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        patchLayer(selected.id, { y: selected.y + ((e.key === "ArrowDown" ? 1 : -1) * step) / size.h });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeLayer(selected.id);
      } else if (e.key === "Escape") {
        setSelId(null);
      } else if (e.key === "+" || e.key === "=") {
        patchLayer(selected.id, { scale: selected.scale * 1.02 });
      } else if (e.key === "-") {
        patchLayer(selected.id, { scale: selected.scale / 1.02 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, active, sizeFor, patchLayer, removeLayer, history]);

  // ---- render -----------------------------------------------------------
  const size = sizeFor(active);
  const guides = useMemo(
    () => buildGuides(active, size, recipe, sizes),
    [active, size, recipe, sizes]
  );

  const libItems = library?.[libTab] || [];
  const slotMeta = SLOTS.find((s) => s.key === active);

  return (
    <SuperAdminLayout title="Try-On Studio">
      <PageHeader
        title="Try-On Studio"
        subtitle="Edit every part on its own canvas at the renderer's exact pixel size — drag, zoom, stack images, then save or attach"
      />

      <div className="grid xl:grid-cols-[minmax(0,1fr)_340px] gap-4 items-start">
        <div className="space-y-3">
          {/* toolbar */}
          <Card className="p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <Field label="Product">
                  <select value={productId} onChange={(e) => onPickProduct(e.target.value)} className={inputCls}>
                    <option value="">— none (download only) —</option>
                    {products.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>
                        {p.title || p.titleTranslations?.en || p._id}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-secondary pb-2">
                <input
                  type="checkbox"
                  checked={assign}
                  disabled={!productId}
                  onChange={(e) => setAssign(e.target.checked)}
                  className="accent-[#0D7A66]"
                />
                attach on save
              </label>
              <button
                onClick={history.undo}
                disabled={!history.canUndo || !!busy}
                className={btnGhost}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} /> Undo
              </button>
              <button
                onClick={history.redo}
                disabled={!history.canRedo || !!busy}
                className={btnGhost}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={13} /> Redo
              </button>
              <button onClick={saveCurrent} disabled={!!busy} className={btnPrimary}>
                {busy === "save" ? <Spinner size={15} /> : <Save size={15} />}
                {busy === "save" ? "Saving…" : `Save ${slotMeta?.label || ""}`}
              </button>
              <button onClick={saveAll} disabled={!!busy} className={btnGhost}>
                {busy === "all" ? <Spinner size={13} /> : <LayersIcon size={13} />}
                {busy === "all" ? "Saving…" : "Save all parts"}
              </button>
              <button onClick={composeSingle} disabled={!!busy} className={btnGhost}>
                {busy === "compose" ? <Spinner size={13} /> : <Wand2 size={13} />}
                {busy === "compose" ? "Composing…" : "Compose single"}
              </button>
              {activeProduct && (
                <button onClick={loadProductAssets} disabled={!!busy} className={btnGhost}>
                  {busy === "load" ? <Spinner size={13} /> : <Package size={13} />}
                  {busy === "load" ? "Loading…" : "Load product assets"}
                </button>
              )}
              {activeProduct && (
                <a
                  href={`/product/${activeProduct.slug || activeProduct._id || activeProduct.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className={btnGhost}
                >
                  <Link2 size={13} /> Storefront
                </a>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              Renderer order: parts win over the single PNG once any lens part
              exists. Attaching one part switches the product to parts mode.
            </p>
            {(error || flash) && (
              <p className={`text-xs mt-2 ${error ? "text-red-500" : "text-primary"}`}>{error || flash}</p>
            )}
          </Card>

          {/* part tabs */}
          <div className="flex flex-wrap gap-1.5">
            {SLOTS.map((s) => {
              const savedFile = saved[s.key]?.file;
              const count = (slots[s.key] || []).length;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    setActive(s.key);
                    setSelId(null);
                  }}
                  className={
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors " +
                    (active === s.key
                      ? "bg-primary text-white border-primary"
                      : "bg-card text-text-secondary border-border hover:text-text-primary")
                  }
                >
                  {s.label}
                  <span className={"ml-1.5 font-normal " + (active === s.key ? "text-white/70" : "text-text-muted")}>
                    {count}L
                  </span>
                  {savedFile && <span className="ml-1 text-[10px]">●</span>}
                </button>
              );
            })}
          </div>

          {/* canvas */}
          <Card className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="text-[11px] text-text-muted">
                <b className="text-text-secondary">{size.w}×{size.h}</b> px ·{" "}
                {(size.w / size.h).toFixed(2)}:1 · {slotMeta?.hint}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                  <input
                    type="checkbox"
                    checked={showGuides}
                    onChange={(e) => setShowGuides(e.target.checked)}
                    className="accent-[#0D7A66]"
                  />
                  guides
                </label>
                <button onClick={() => setSelId(null)} className={btnGhost}>
                  <Move size={12} /> deselect
                </button>
              </div>
            </div>

            <div className="relative">
              <PartCanvas
                ref={canvasRef}
                width={size.w}
                height={size.h}
                layers={activeLayers}
                selectedId={selId}
                onSelect={setSelId}
                onUpdate={patchLayer}
                guides={guides}
                showGuides={showGuides}
                getImage={getImage}
                version={imgVersion}
                onDropFiles={(f) => addFiles(active, f)}
              />
              {activeLayers.length === 0 && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center px-4 py-3 rounded-xl bg-white/90 border border-border shadow-sm">
                    <p className="text-sm font-semibold text-text-primary">Empty canvas</p>
                    <p className="text-[11px] text-text-muted mt-1 max-w-[260px]">
                      Drop an image here, use “Add image”, or add the generated art as a
                      starting layer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => fileInput.current?.click()} className={btnGhost}>
                <ImagePlus size={13} /> Add image
              </button>
              {!activeLayers.some((l) => l.kind === "art") && (
                <button onClick={() => addArt(active)} disabled={!!busy} className={btnGhost}>
                  <Wand2 size={13} /> Add generated art
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(active, Array.from(e.target.files || []));
                  e.target.value = "";
                }}
              />
              <span className="text-[11px] text-text-muted">
                drag to move · wheel to zoom · Alt-drag or the round handle to rotate · double-click to fit
              </span>
            </div>
          </Card>

          {/* variations — one canvas per offered colour/lens */}
          {activeProduct && (
            <Card className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2 px-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                    Try-on variations
                  </h3>
                  <p className="text-[10px] text-text-muted mt-0.5 max-w-[420px]">
                    Same frame, another colour or lens. Each variation gets its own canvas and its
                    own 3D model, and shows up as a swatch in the storefront try-on.
                  </p>
                </div>
                <button onClick={addVariation} disabled={!canVary || !!busy} className={btnGhost}>
                  <Plus size={13} /> Add variation
                </button>
              </div>

              {!canVary && (
                <p className="text-[11px] text-amber-600 px-1">
                  Generate the 2D kit first — a variation recolours the stored parts.
                </p>
              )}

              {canVary && variations.length === 0 && (
                <p className="text-[11px] text-text-muted px-1">
                  No variations yet. “Add variation” opens a new canvas for that colour.
                </p>
              )}

              <div className="grid gap-2 md:grid-cols-2">
                {variations.map((v) => (
                  <div key={v.key} className="rounded-xl border border-border p-2 space-y-2">
                    <VariantCanvas
                      src={
                        activeProduct.tryOnImage
                          ? `${SERVER_URL}/img/tryon/${activeProduct.tryOnImage}`
                          : `${SERVER_URL}/img/tryon/${activeProduct.tryOnParts?.left || ""}`
                      }
                      frameColor={v.frameColor}
                      lensColor={v.lensColor}
                      lensOpacity={v.lensOpacity}
                      width={300}
                      height={118}
                      className="w-full"
                    />

                    <input
                      value={v.name}
                      onChange={(e) => patchVariation(v.key, { name: e.target.value })}
                      className={inputCls}
                      placeholder="Variation name"
                    />

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                        frame
                        <input
                          type="color"
                          value={v.frameColor}
                          onChange={(e) => patchVariation(v.key, { frameColor: e.target.value })}
                          className="h-6 w-8 rounded border border-border bg-transparent p-0"
                        />
                        <span className="font-mono text-[10px] text-text-muted">{v.frameColor}</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                        lens
                        <input
                          type="color"
                          value={v.lensColor}
                          onChange={(e) => patchVariation(v.key, { lensColor: e.target.value })}
                          className="h-6 w-8 rounded border border-border bg-transparent p-0"
                        />
                        <span className="font-mono text-[10px] text-text-muted">{v.lensColor}</span>
                      </label>
                    </div>

                    <label className="block text-[11px] text-text-secondary">
                      lens strength {Math.round(num(v.lensOpacity, DEFAULTS.tintOpacity) * 100)}%
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(num(v.lensOpacity, DEFAULTS.tintOpacity) * 100)}
                        onChange={(e) =>
                          patchVariation(v.key, { lensOpacity: Number(e.target.value) / 100 })
                        }
                        className="w-full accent-[#0D7A66]"
                      />
                    </label>

                    {v.check && (
                      <p className={`text-[10px] ${v.check.ok ? "text-emerald-600" : "text-amber-600"}`}>
                        {v.check.ok ? "✓" : "!"} {v.check.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveVariation(v)}
                        disabled={!!busy || !v.name.trim()}
                        className={btnPrimary}
                      >
                        {busy === `var-${v.key}` ? <Spinner size={13} /> : <Palette size={13} />}
                        {busy === `var-${v.key}`
                          ? "Saving…"
                          : v.id
                          ? "Update variation"
                          : "Save variation"}
                      </button>
                      <button
                        onClick={() => removeVariation(v)}
                        disabled={!!busy}
                        className={btnDanger}
                        title={v.id ? "Remove this variation" : "Discard draft"}
                      >
                        <Trash2 size={12} />
                      </button>
                      {v.model && (
                        <a
                          href={`/product/${activeProduct.slug || activeProduct._id || activeProduct.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-primary underline ml-auto"
                        >
                          try it
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* layers */}
          <Card className="p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                Layers — {slotMeta?.label}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {!activeLayers.some((l) => l.kind === "art") && (
                  <button onClick={() => addArt(active)} disabled={!!busy} className={btnGhost}>
                    <Wand2 size={12} /> add generated art
                  </button>
                )}
                <button onClick={() => resetSlot(active)} className={btnGhost}>
                  <Trash2 size={12} /> clear canvas
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {activeLayers.length === 0 && (
                <p className="text-xs text-text-muted px-1 py-2">No layers yet.</p>
              )}
              {[...activeLayers].reverse().map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelId(l.id)}
                  className={
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg border cursor-pointer " +
                    (selId === l.id ? "border-primary bg-primary/5" : "border-border hover:bg-background/60")
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      patchLayer(l.id, { visible: !l.visible });
                    }}
                    className="text-text-muted hover:text-text-primary"
                    title={l.visible ? "hide" : "show"}
                  >
                    {l.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      patchLayer(l.id, { locked: !l.locked });
                    }}
                    className="text-text-muted hover:text-text-primary"
                    title={l.locked ? "unlock" : "lock"}
                  >
                    {l.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  <span className="text-xs text-text-primary truncate flex-1">
                    {l.name}
                    {l.kind === "art" && (
                      <span className="ml-1.5 text-[10px] uppercase text-text-muted">art</span>
                    )}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted">
                    {Math.round(l.scale * 100)}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reorder(l, 1);
                    }}
                    className="text-text-muted hover:text-text-primary"
                    title="up"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      reorder(l, -1);
                    }}
                    className="text-text-muted hover:text-text-primary"
                    title="down"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* transform */}
          {selected && (
            <Card className="p-3 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary truncate">
                  {selected.name}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => duplicateLayer(selected)} className={btnGhost}>
                    <Copy size={12} /> duplicate
                  </button>
                  {MIRROR[active] && (
                    <button onClick={() => mirrorLayer(selected)} className={btnGhost}>
                      mirror → {MIRROR[active]}
                    </button>
                  )}
                  {selected.kind === "art" && (
                    <button onClick={resetArtTransform} className={btnGhost}>
                      <RefreshCw size={12} /> reset transform
                    </button>
                  )}
                  <button onClick={() => removeLayer(selected.id)} className={btnDanger}>
                    <Trash2 size={12} /> delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Field label="X %">
                  <input
                    type="number"
                    step="0.1"
                    value={(selected.x * 100).toFixed(1)}
                    onChange={(e) => patchLayer(selected.id, { x: num(e.target.value, 50) / 100 })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Y %">
                  <input
                    type="number"
                    step="0.1"
                    value={(selected.y * 100).toFixed(1)}
                    onChange={(e) => patchLayer(selected.id, { y: num(e.target.value, 50) / 100 })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Scale %">
                  <input
                    type="number"
                    step="1"
                    value={(selected.scale * 100).toFixed(0)}
                    onChange={(e) =>
                      patchLayer(selected.id, {
                        scale: clamp(num(e.target.value, 100) / 100, 0.01, 30),
                      })
                    }
                    className={inputCls}
                  />
                </Field>
                <Field label="Rotation °">
                  <input
                    type="number"
                    step="1"
                    value={((selected.rot * 180) / Math.PI).toFixed(0)}
                    onChange={(e) =>
                      patchLayer(selected.id, { rot: (num(e.target.value, 0) * Math.PI) / 180 })
                    }
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid md:grid-cols-2 gap-3 items-end">
                <Field label={`Opacity — ${Math.round((selected.opacity ?? 1) * 100)}%`}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={selected.opacity ?? 1}
                    onChange={(e) => patchLayer(selected.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full accent-[#0D7A66]"
                  />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() =>
                      patchLayer(selected.id, {
                        x: 0.5,
                        y: 0.5,
                        scale: Math.min(1, (size.h / size.w) * (selected.iw / selected.ih)),
                        rot: 0,
                      })
                    }
                    className={btnGhost}
                  >
                    fit
                  </button>
                  <button
                    onClick={() => patchLayer(selected.id, { scale: 1 })}
                    className={btnGhost}
                  >
                    fill width
                  </button>
                  <button
                    onClick={() => patchLayer(selected.id, {
                      scale: (size.h / size.w) * (selected.iw / selected.ih),
                    })}
                    className={btnGhost}
                  >
                    fill height
                  </button>
                  <button
                    onClick={() => patchLayer(selected.id, { x: 0.5, y: 0.5 })}
                    className={btnGhost}
                  >
                    centre
                  </button>
                  <button
                    onClick={() => patchLayer(selected.id, { flipX: !selected.flipX })}
                    className={btnGhost}
                  >
                    <FlipHorizontal size={12} />
                  </button>
                  <button
                    onClick={() => patchLayer(selected.id, { flipY: !selected.flipY })}
                    className={btnGhost}
                  >
                    <FlipVertical size={12} />
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* right column */}
        <div className="space-y-3 xl:sticky xl:top-20">
          <Card className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">Library</h3>
            <div className="flex gap-1 mb-2">
              {[
                ["kit", "Kit"],
                ["studio", "Studio"],
                ["product", "Product"],
                ["examples", "Examples"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setLibTab(k)}
                  className={
                    "px-2 py-1 rounded-md text-[11px] font-semibold border " +
                    (libTab === k
                      ? "bg-primary text-white border-primary"
                      : "border-border text-text-secondary hover:text-text-primary")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            {libItems.length === 0 ? (
              <p className="text-[11px] text-text-muted">Nothing here yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-56 overflow-auto pr-1">
                {libItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => addLayer(active, `${SERVER_URL}${item.url}`, { name: item.name })}
                    className="rounded-lg border border-border bg-white p-1 hover:border-primary"
                    title={`${item.name} · ${item.w}×${item.h}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${SERVER_URL}${item.url}`}
                      alt={item.name}
                      className="w-full h-12 object-contain"
                    />
                    <span className="block text-[9px] font-mono text-text-muted truncate">
                      {item.w}×{item.h}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-text-muted mt-2 leading-snug">
              Click a thumbnail to stack it on the {slotMeta?.label} canvas.
            </p>
          </Card>

          <Card className="p-3">
            <details open>
              <summary className="text-xs font-bold uppercase tracking-wide text-text-secondary cursor-pointer">
                Frame recipe
              </summary>
              <div className="pt-3 space-y-3">
                <Field label="Shape">
                  <select value={recipe.shape} onChange={(e) => onShape(e.target.value)} className={inputCls}>
                    {(shapes.length ? shapes : [{ key: recipe.shape, label: recipe.shape }]).map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["frameColor", "Frame"],
                    ["metalColor", "Metal"],
                    ["tintColor", "Tint"],
                  ].map(([k, label]) => (
                    <Field key={k} label={label}>
                      <input
                        type="color"
                        value={recipe[k]}
                        onChange={(e) => set(k, e.target.value)}
                        className="h-8 w-full rounded-md border border-input-border bg-transparent"
                      />
                    </Field>
                  ))}
                </div>
                <Field label={`Tint opacity — ${Number(recipe.tintOpacity).toFixed(2)}`}>
                  <input
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.01"
                    value={recipe.tintOpacity}
                    onChange={(e) => set("tintOpacity", parseFloat(e.target.value))}
                    className="w-full accent-[#0D7A66]"
                  />
                </Field>
                <Field label={`Rim weight — ${recipe.rimWidth}`}>
                  <input
                    type="range"
                    min="6"
                    max="70"
                    step="1"
                    value={recipe.rimWidth}
                    onChange={(e) => set("rimWidth", parseFloat(e.target.value))}
                    className="w-full accent-[#0D7A66]"
                  />
                </Field>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={recipe.gloss}
                    onChange={(e) => set("gloss", e.target.checked)}
                    className="accent-[#0D7A66]"
                  />
                  gloss sheen
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["lensW", "Lens W"],
                    ["lensH", "Lens H"],
                    ["drop", "Drop"],
                    ["templeLen", "Temple"],
                  ].map(([k, label]) => (
                    <Field key={k} label={label}>
                      <input
                        type="number"
                        step="0.01"
                        value={recipe[k]}
                        onChange={(e) => set(k, e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setRecipe(DEFAULTS)} className={btnGhost}>
                    <RefreshCw size={12} /> reset recipe
                  </button>
                  <button
                    onClick={async () => {
                      setBusy("gen");
                      try {
                        const gen = await adminApi.studio.generate(payload(recipe), productId || undefined, productId ? assign : false);
                        refreshLibrary(productId);
                        if (productId && assign) {
                          adminApi.products.list().then((l) => setProducts(l)).catch(() => {});
                        }
                        if (gen?.modelCheck) setModelCheck(gen.modelCheck);
                        if (gen?.modelError) {
                          setError(`Parts generated, but the 3D model failed: ${gen.modelError}`);
                        } else {
                          setFlash(gen?.files?.model ? "Generated: 2D parts + 3D model" : "Vector set generated");
                          setTimeout(() => setFlash(""), 2200);
                        }
                      } catch (_) {
                        setError("Generation failed.");
                      } finally {
                        setBusy("");
                      }
                    }}
                    disabled={!!busy}
                    className={btnGhost}
                  >
                    <Wand2 size={12} /> generate vector set
                  </button>
                </div>

                {modelCheck && (
                  <div className="mt-3 rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-text-secondary">Model check</h4>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          modelCheck.ok ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                        }`}
                      >
                        {modelCheck.ok ? "PASS" : "CHECK"}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {modelCheck.checks.map((c) => (
                        <li key={c.id} className="flex items-start gap-1.5 text-[11px] leading-snug">
                          <span className={c.ok ? "text-emerald-500" : "text-amber-500"}>{c.ok ? "✓" : "!"}</span>
                          <span className="text-text-secondary">{c.label}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-[11px] font-semibold text-text-primary">{modelCheck.summary}</p>
                  </div>
                )}
              </div>
            </details>
          </Card>

          {Object.keys(saved).length > 0 && (
            <Card className="p-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">
                Saved this session
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(saved).map(([slot, data]) => (
                  <div key={slot} className="rounded-lg border border-border p-1.5">
                    <div className="h-14 grid place-items-center bg-white rounded-md overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${SERVER_URL}${data.url}`}
                        alt={slot}
                        className="max-h-14 max-w-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold text-text-secondary">{slot}</span>
                      <a
                        href={`${SERVER_URL}${data.url}`}
                        download
                        className="text-[10px] text-primary font-bold inline-flex items-center gap-0.5"
                      >
                        <Download size={10} /> PNG
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-text-muted mt-2">
                {productId && assign
                  ? "Attached to the product as they were saved."
                  : "Saved to /img/tryon — attach a product to publish them."}
              </p>
            </Card>
          )}

          <Card className="p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-text-secondary mb-2">
              Output spec
            </h3>
            <table className="w-full text-[11px]">
              <tbody className="[&_td]:py-0.5 [&_td:first-child]:text-text-muted">
                <tr>
                  <td>Single frontal</td>
                  <td className="text-right font-mono">
                    {sizes.single.w}×{sizes.single.h}
                  </td>
                </tr>
                <tr>
                  <td>Lens L/R</td>
                  <td className="text-right font-mono">
                    {sizes.lens.w}×{sizes.lens.h}
                  </td>
                </tr>
                <tr>
                  <td>Bridge</td>
                  <td className="text-right font-mono">
                    {sizes.bridge.w}×{sizes.bridge.h}
                  </td>
                </tr>
                <tr>
                  <td>Temple L/R</td>
                  <td className="text-right font-mono">
                    {sizes.temple.w}×{sizes.temple.h}
                  </td>
                </tr>
              </tbody>
            </table>
            <p className="text-[10px] text-text-muted mt-2 leading-snug">
              Exports are the canvas at native size — no resampling. Saving re-encodes
              server-side and only replaces that one slot on the product.
            </p>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
