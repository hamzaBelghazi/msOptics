import { useState } from "react";
import { Field, btnPrimary, btnGhost, inputCls } from "./ui";
import { adminApi, SERVER_URL } from "@/Api/adminApi";

const PART_SLOTS = [
  {
    key: "single",
    field: "tryOnImage",
    label: "Single frontal PNG (whole glasses)",
    hint: "1900 × 780 (2.44:1) — lenses + bridge only, no temples",
  },
  {
    key: "left",
    field: "part-left",
    label: "Left lens part",
    hint: "900 × 900·lensH/lensW — e.g. 900 × 620; centre = iris",
  },
  {
    key: "right",
    field: "part-right",
    label: "Right lens part",
    hint: "same box as the left lens, mirrored",
  },
  {
    key: "bridge",
    field: "part-bridge",
    label: "Bridge part",
    hint: "240 × 100 (2.4:1)",
  },
  {
    key: "templeL",
    field: "part-templeL",
    label: "Left temple part",
    hint: "840 × 60 (14:1) — hinge on the left edge",
  },
  {
    key: "templeR",
    field: "part-templeR",
    label: "Right temple part",
    hint: "840 × 60 (14:1) — same strip, vertically symmetric",
  },
];

const tryonImg = (f) => (f ? `${SERVER_URL}/img/tryon/${f}` : "");

// Per-product 2D try-on assets: single PNG and/or 5-part kit + calibration.
// Parts (if any lens part exists) win over the single PNG, which wins over shapes.
export default function TryOnAssetsEditor({ product, onSaved }) {
  const pid = product?._id || product?.id;
  const [files, setFiles] = useState({});
  const [removeSingle, setRemoveSingle] = useState(false);
  const [removeParts, setRemoveParts] = useState([]);
  const [cal, setCal] = useState({
    lensW: product?.tryOnParts?.calibration?.lensW ?? 0.9,
    lensH: product?.tryOnParts?.calibration?.lensH ?? 0.62,
    drop: product?.tryOnParts?.calibration?.drop ?? 0.06,
    templeLen: product?.tryOnParts?.calibration?.templeLen ?? 0.85,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!pid) return null;

  const current = (slot) =>
    slot === "single" ? product?.tryOnImage : product?.tryOnParts?.[slot];

  const save = async () => {
    const fd = new FormData();
    let touched = false;
    PART_SLOTS.forEach(({ key, field }) => {
      if (files[key]) {
        fd.append(field, files[key]);
        touched = true;
      }
    });
    if (removeSingle) {
      fd.append("removeTryOnImage", "1");
      touched = true;
    }
    if (removeParts.length) {
      fd.append("removeParts", JSON.stringify(removeParts));
      touched = true;
    }
    fd.append(
      "calibration",
      JSON.stringify({
        lensW: parseFloat(cal.lensW) || 0.9,
        lensH: parseFloat(cal.lensH) || 0.62,
        drop: parseFloat(cal.drop) || 0,
        templeLen: parseFloat(cal.templeLen) || 0.85,
      })
    );
    touched = true;
    if (!touched) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await adminApi.products.uploadTryOn(pid, fd);
      const data = res?.data || {};
      onSaved?.({
        tryOnImage: data.tryOnImage ?? null,
        tryOnParts: data.tryOnParts ?? null,
      });
      setFiles({});
      setRemoveSingle(false);
      setRemoveParts([]);
      setMsg("Try-on assets saved.");
    } catch (e) {
      setMsg(e?.response?.data?.message || "Failed to save assets.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRemovePart = (key) =>
    setRemoveParts((r) => (r.includes(key) ? r.filter((k) => k !== key) : [...r, key]));

  return (
    <div className="border-t border-border pt-4 space-y-4">
      <div>
        <h4 className="font-bold text-text-primary">Try-On assets (2D parts)</h4>
        <p className="text-xs text-text-secondary mt-1">
          Upload transparent PNGs. A 5-part kit (lenses + bridge + temples) gives the
          best 3D feel; a single frontal PNG also works; otherwise the shape renderer is used.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {PART_SLOTS.map(({ key, label, hint }) => {
          const cur = current(key);
          const marked = key === "single" ? removeSingle : removeParts.includes(key);
          return (
            <div key={key} className="rounded-xl border border-border p-2.5 space-y-2 bg-background/40">
              <p className="text-xs font-bold text-text-primary">{label}</p>
              <p className="text-[10px] leading-snug text-text-muted">{hint}</p>
              {cur && !files[key] ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tryonImg(cur)}
                    alt=""
                    className={`h-20 w-full object-contain rounded-lg bg-background-soft ${marked ? "opacity-30" : ""}`}
                  />
                  <button
                    type="button"
                    onClick={() => (key === "single" ? setRemoveSingle(!removeSingle) : toggleRemovePart(key))}
                    className={`mt-1.5 text-[11px] font-bold ${marked ? "text-primary" : "text-red-500"}`}
                  >
                    {marked ? "Keep (undo remove)" : "Remove"}
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-text-muted">
                  {files[key] ? `Selected: ${files[key].name}` : "No file"}
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/webp"
                onChange={(e) => setFiles((f) => ({ ...f, [key]: e.target.files?.[0] || null }))}
                className="text-xs text-text-secondary w-full"
              />
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["lensW", "Lens width"],
          ["lensH", "Lens height"],
          ["drop", "Lens drop"],
          ["templeLen", "Temple length"],
        ].map(([k, label]) => (
          <Field key={k} label={`${label} (IPD units)`}>
            <input
              type="number"
              step="0.01"
              value={cal[k]}
              onChange={(e) => setCal({ ...cal, [k]: e.target.value })}
              className={inputCls}
            />
          </Field>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" disabled={busy} onClick={save} className={btnPrimary}>
          {busy ? "Saving…" : "Save try-on assets"}
        </button>
        {msg && <span className="text-xs text-text-secondary">{msg}</span>}
      </div>
    </div>
  );
}
