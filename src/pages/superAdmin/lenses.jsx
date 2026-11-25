import { useEffect, useState } from "react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import {
  PageHeader,
  Card,
  btnPrimary,
  btnDanger,
  btnGhost,
  inputCls,
  labelCls,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi, imgUrl } from "@/Api/adminApi";
import TrilingualField, { appendTranslations } from "@/Components/superAdmin/Trilingual";

const blankTr = () => ({ en: "", de: "", ar: "" });
const withTr = (t) => ({
  ...t,
  subtitleTranslations: { ...blankTr(), ...(t.subtitleTranslations || {}) },
  descTranslations: { ...blankTr(), ...(t.descTranslations || {}) },
});
const appendRowTr = (fd, base, i, t) => {
  ["en", "de", "ar"].forEach((L) => {
    if (t.subtitleTranslations?.[L]) fd.append(`${base}[${i}][subtitleTranslations][${L}]`, t.subtitleTranslations[L]);
    if (t.descTranslations?.[L]) fd.append(`${base}[${i}][descTranslations][${L}]`, t.descTranslations[L]);
  });
};

const newLensType = () => ({ subtitle: "", subtitleTranslations: blankTr(), desc: "", descTranslations: blankTr(), icon: "", _file: null, _delete: false });
const newThickness = () => ({
  subtitle: "",
  subtitleTranslations: blankTr(),
  refraction: "",
  price: "",
  desc: "",
  descTranslations: blankTr(),
  photo: "",
  _file: null,
  _delete: false,
});
const newAdvanced = () => ({
  subtitle: "",
  subtitleTranslations: blankTr(),
  price: "",
  desc: "",
  descTranslations: blankTr(),
  image: "",
  _file: null,
  _delete: false,
});

export default function SuperAdminLenses() {
  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState("");
  const [titleTr, setTitleTr] = useState(blankTr());
  const [lensType, setLensType] = useState([newLensType()]);
  const [thickness, setThickness] = useState([newThickness()]);
  const [advanced, setAdvanced] = useState([newAdvanced()]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setBusy(true);
    adminApi
      .lenses
      .list()
      .then((list) => {
        const first = Array.isArray(list) ? list[0] : null;
        setDoc(first || null);
        setTitle(first?.title || "");
        setTitleTr({ ...blankTr(), ...(first?.titleTranslations || {}) });
        setLensType(
          first?.lensType?.length
            ? first.lensType.map((t) => withTr({ ...newLensType(), ...t }))
            : [newLensType()]
        );
        setThickness(
          first?.thickness?.length
            ? first.thickness.map((t) => withTr({ ...newThickness(), ...t }))
            : [newThickness()]
        );
        setAdvanced(
          first?.advancedLensType?.length
            ? first.advancedLensType.map((t) => withTr({ ...newAdvanced(), ...t }))
            : [newAdvanced()]
        );
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const patchRow = (setter, i, k, v) =>
    setter((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const removeRow = (setter, i) =>
    setter((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, _delete: true } : r))
    );

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("title", title);
    appendTranslations(fd, "titleTranslations", titleTr);

    lensType.forEach((t, i) => {
      if (t._delete) {
        fd.append(`lensType[${i}][_delete]`, "1");
        return;
      }
      fd.append(`lensType[${i}][subtitle]`, t.subtitle || "");
      fd.append(`lensType[${i}][desc]`, t.desc || "");
      appendRowTr(fd, "lensType", i, t);
      if (t._file) {
        fd.append(`lensType[${i}][icon]`, t._file);
        fd.append(`lensType[${i}][_touchIcon]`, "1");
      }
    });

    thickness.forEach((t, i) => {
      if (t._delete) {
        fd.append(`thickness[${i}][_delete]`, "1");
        return;
      }
      fd.append(`thickness[${i}][subtitle]`, t.subtitle || "");
      fd.append(`thickness[${i}][refraction]`, t.refraction || "");
      fd.append(`thickness[${i}][price]`, t.price || "");
      fd.append(`thickness[${i}][desc]`, t.desc || "");
      appendRowTr(fd, "thickness", i, t);
      if (t._file) {
        fd.append(`thickness[${i}][photo]`, t._file);
        fd.append(`thickness[${i}][_touchPhoto]`, "1");
      }
    });

    advanced.forEach((t, i) => {
      if (t._delete) {
        fd.append(`advancedLensType[${i}][_delete]`, "1");
        return;
      }
      fd.append(`advancedLensType[${i}][subtitle]`, t.subtitle || "");
      fd.append(`advancedLensType[${i}][price]`, t.price || "");
      fd.append(`advancedLensType[${i}][desc]`, t.desc || "");
      appendRowTr(fd, "advancedLensType", i, t);
      if (t._file) {
        fd.append(`advancedLensType[${i}][image]`, t._file);
        fd.append(`advancedLensType[${i}][_touchImage]`, "1");
      }
    });

    setBusy(true);
    try {
      if (doc) {
        await adminApi.lenses.update(doc._id || doc.id, fd);
      } else {
        await adminApi.lenses.create(fd);
      }
      alert("Lens settings saved.");
      load();
    } catch {
      alert("Failed to save lens settings.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAll = async () => {
    if (!doc) return;
    if (!confirm("Delete these lens settings and all associated images?")) return;
    await adminApi.lenses.remove(doc._id || doc.id);
    load();
  };

  const rowCls = "border border-border rounded-xl p-4 space-y-3 bg-background/40";

  return (
    <SuperAdminLayout title="Lens Settings">
      <PageHeader title="Lenses settings" subtitle="Lens types, thickness and premium features" />
      <form onSubmit={submit} className="space-y-5">
        <Card className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-text-primary">Lens Configuration</h3>
            {doc && (
              <button type="button" onClick={deleteAll} className={btnDanger}>
                Delete Lens Settings
              </button>
            )}
          </div>
          <label className="block">
            <span className={labelCls}>Lens settings title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Enter lens settings title..."
            />
          </label>
          <TrilingualField label="Title translations" value={titleTr} onChange={setTitleTr} placeholder="Lens settings title" />
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-bold text-text-primary">Lens Types</h3>
          {lensType.map((t, i) =>
            t._delete ? null : (
              <div key={i} className={rowCls}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className={labelCls}>Type name</span>
                    <input
                      value={t.subtitle || ""}
                      onChange={(e) => patchRow(setLensType, i, "subtitle", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Single Vision"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Type icon</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => patchRow(setLensType, i, "_file", e.target.files?.[0] || null)}
                      className={inputCls}
                    />
                  </label>
                </div>
                {t.icon && (
                  <div className="text-xs text-text-secondary">
                    Current icon: {t.icon}{" "}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl("lenses", t.icon)} alt="" className="h-12 w-12 object-cover rounded mt-1" />
                  </div>
                )}
                <label className="block">
                  <span className={labelCls}>Description</span>
                  <textarea
                    value={t.desc || ""}
                    onChange={(e) => patchRow(setLensType, i, "desc", e.target.value)}
                    className={inputCls}
                    rows={2}
                  />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TrilingualField label="Name translations" value={t.subtitleTranslations} onChange={(v) => patchRow(setLensType, i, "subtitleTranslations", v)} placeholder="Type name" />
                  <TrilingualField label="Description translations" value={t.descTranslations} onChange={(v) => patchRow(setLensType, i, "descTranslations", v)} textarea rows={2} placeholder="Description" />
                </div>
                <button type="button" onClick={() => removeRow(setLensType, i)} className={btnGhost}>
                  Remove this type
                </button>
              </div>
            )
          )}
          <button type="button" onClick={() => setLensType((r) => [...r, newLensType()])} className={btnGhost}>
            + Add lens type
          </button>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-bold text-text-primary">Thickness</h3>
          {thickness.map((t, i) =>
            t._delete ? null : (
              <div key={i} className={rowCls}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="block">
                    <span className={labelCls}>Name</span>
                    <input
                      value={t.subtitle || ""}
                      onChange={(e) => patchRow(setThickness, i, "subtitle", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Standard"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Refraction index</span>
                    <input
                      value={t.refraction || ""}
                      onChange={(e) => patchRow(setThickness, i, "refraction", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. 1.50"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Price</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={t.price || ""}
                      onChange={(e) => patchRow(setThickness, i, "price", e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className={labelCls}>Description</span>
                  <textarea
                    value={t.desc || ""}
                    onChange={(e) => patchRow(setThickness, i, "desc", e.target.value)}
                    className={inputCls}
                    rows={2}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => patchRow(setThickness, i, "_file", e.target.files?.[0] || null)}
                    className={inputCls}
                  />
                </label>
                {t.photo && (
                  <div className="text-xs text-text-secondary">
                    Current photo: {t.photo}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TrilingualField label="Name translations" value={t.subtitleTranslations} onChange={(v) => patchRow(setThickness, i, "subtitleTranslations", v)} placeholder="Thickness name" />
                  <TrilingualField label="Description translations" value={t.descTranslations} onChange={(v) => patchRow(setThickness, i, "descTranslations", v)} textarea rows={2} placeholder="Description" />
                </div>
                <button type="button" onClick={() => removeRow(setThickness, i)} className={btnGhost}>
                  Remove this thickness
                </button>
              </div>
            )
          )}
          <button type="button" onClick={() => setThickness((r) => [...r, newThickness()])} className={btnGhost}>
            + Add thickness
          </button>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-bold text-text-primary">Advanced Lens Features</h3>
          {advanced.map((t, i) =>
            t._delete ? null : (
              <div key={i} className={rowCls}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="block">
                    <span className={labelCls}>Feature name</span>
                    <input
                      value={t.subtitle || ""}
                      onChange={(e) => patchRow(setAdvanced, i, "subtitle", e.target.value)}
                      className={inputCls}
                      placeholder="e.g. Blue Light Filter"
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Price</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={t.price || ""}
                      onChange={(e) => patchRow(setAdvanced, i, "price", e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block">
                    <span className={labelCls}>Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => patchRow(setAdvanced, i, "_file", e.target.files?.[0] || null)}
                      className={inputCls}
                    />
                  </label>
                </div>
                {t.image && (
                  <div className="text-xs text-text-secondary">
                    Current image: {t.image}
                  </div>
                )}
                <label className="block">
                  <span className={labelCls}>Description</span>
                  <textarea
                    value={t.desc || ""}
                    onChange={(e) => patchRow(setAdvanced, i, "desc", e.target.value)}
                    className={inputCls}
                    rows={2}
                  />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TrilingualField label="Name translations" value={t.subtitleTranslations} onChange={(v) => patchRow(setAdvanced, i, "subtitleTranslations", v)} placeholder="Feature name" />
                  <TrilingualField label="Description translations" value={t.descTranslations} onChange={(v) => patchRow(setAdvanced, i, "descTranslations", v)} textarea rows={2} placeholder="Description" />
                </div>
                <button type="button" onClick={() => removeRow(setAdvanced, i)} className={btnGhost}>
                  Remove this feature
                </button>
              </div>
            )
          )}
          <button type="button" onClick={() => setAdvanced((r) => [...r, newAdvanced()])} className={btnGhost}>
            + Add feature
          </button>
        </Card>

        <button disabled={busy} className={btnPrimary}>
          {busy && <Spinner size={15} />}
          {busy ? "Saving..." : "Save Lens Settings"}
        </button>
      </form>
    </SuperAdminLayout>
  );
}
