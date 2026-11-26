import { useState } from "react";
import { Field, btnPrimary, inputCls } from "./ui";
import { adminApi, SERVER_URL } from "@/Api/adminApi";

// The storefront uses one complete front/back frame and four temple views.
const PART_SLOTS = [
  {
    key: "single",
    field: "tryOnImage",
    group: "Front view",
    label: "Front side",
    hint: "Complete front frame with both lenses and bridge; canvas size follows calibration",
  },
  {
    key: "singleBack",
    field: "part-singleBack",
    group: "Front view",
    label: "Back side",
    hint: "same canvas as the front; drawn a hair larger behind it, so the rim reads solid",
  },
  {
    key: "armLFront",
    field: "part-armLFront",
    group: "Arms",
    label: "Left — front (outer) face",
    hint: "Temple outer face; hinge on the left edge (default canvas 700 × 50)",
  },
  {
    key: "armLBack",
    field: "part-armLBack",
    group: "Arms",
    label: "Left — back (inner) face",
    hint: "Temple inner face; shown when the arm turns away from the camera",
  },
  {
    key: "armRFront",
    field: "part-armRFront",
    group: "Arms",
    label: "Right — front (outer) face",
    hint: "Temple outer face; mirrored on draw, hinge on the left edge",
  },
  {
    key: "armRBack",
    field: "part-armRBack",
    group: "Arms",
    label: "Right — back (inner) face",
    hint: "Temple inner face",
  },
 ];

const GROUPS = ["Front view", "Arms"];

const tryonImg = (f) => (f ? `${SERVER_URL}/img/tryon/${f}` : "");

// Per-product 2D try-on assets + calibration.
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
    armY: product?.tryOnParts?.calibration?.armY ?? 0.474,
    templeX: product?.tryOnParts?.calibration?.templeX ?? 1,
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!pid) return null;

  const current = (slot) => (slot === "single" ? product?.tryOnImage : product?.tryOnParts?.[slot]);

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
        armY: Math.min(1, Math.max(0, Number.isFinite(parseFloat(cal.armY)) ? parseFloat(cal.armY) : 0.474)),
        templeX: Math.min(1, Math.max(0.5, Number.isFinite(parseFloat(cal.templeX)) ? parseFloat(cal.templeX) : 1)),
        mode: "single",
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
    <div className="border-t border-border pt-4 space-y-5">
      <div>
        <h4 className="font-bold text-text-primary">Try-On assets</h4>
        <p className="text-xs text-text-secondary mt-1">
          Upload transparent PNGs. The <b>front</b> and <b>back</b> show the complete frame, including the bridge; four <b>temple views</b> provide left/right outer and inner arm faces.
        </p>
      </div>

      {GROUPS.map((group) => {
        const slots = PART_SLOTS.filter((s) => s.group === group);
        if (!slots.length) return null;
        return (
          <div key={group} className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">{group}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {slots.map(({ key, label, hint }) => {
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
          </div>
        );
      })}

      <div className="rounded-xl border border-border p-3 space-y-3 bg-background/40">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-text-primary">Arm height on the front view</p>
            <span className="text-xs font-mono text-text-secondary">{(Number(cal.armY) * 100).toFixed(1)}%</span>
          </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={cal.armY}
          onChange={(e) => setCal({ ...cal, armY: e.target.value })}
          className="w-full"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            max="1"
            step="0.005"
            value={cal.armY}
            onChange={(e) => setCal({ ...cal, armY: e.target.value })}
            className={inputCls + " w-28"}
          />
            <p className="text-[11px] leading-snug text-text-muted">
              0% = top edge of the front artwork, 100% = bottom. The eye line (47.4%) is the default;
              drag it until the hinge sits on the uploaded arm.
            </p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-text-primary">Arm horizontal position</p>
            <span className="text-xs font-mono text-text-secondary">{Math.round((Number(cal.templeX) - 0.5) * 200)}% to outer edge</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.005"
            value={cal.templeX}
            onChange={(e) => setCal({ ...cal, templeX: e.target.value })}
            className="w-full"
          />
          <p className="text-[11px] leading-snug text-text-muted">
            Move both hinges from the frame center to the outer edge of the front artwork.
          </p>
        </div>
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
