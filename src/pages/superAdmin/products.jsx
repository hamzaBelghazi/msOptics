import { useEffect, useState } from "react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import {
  PageHeader,
  TableWrap,
  Th,
  Td,
  EmptyRow,
  Modal,
  Field,
  AddButton,
  btnPrimary,
  btnDanger,
  btnGhost,
  inputCls,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi, imgUrl } from "@/Api/adminApi";
import TrilingualField, { appendTranslations } from "@/Components/superAdmin/Trilingual";
import TryOnAssetsEditor from "@/Components/superAdmin/TryOnAssetsEditor";

const SHAPES = ["round", "rectangle", "square", "aviator", "cat eye", "oval", "geometric"];
const FRAME_TYPES = ["full rim", "half rim", "rimless"];
const GENDERS = ["men", "women", "unisex"];
const MATERIALS = ["metal", "plastic", "titanium", "acetate", "wood"];

const PRODUCT_FIELDS = [
  "title",
  "price",
  "originalPrice",
  "glassWidth",
  "sideSize",
  "noasSize",
  "lenseSize",
  "lenseHeight",
  "templeColor",
  "colors",
  "productGender",
  "glassesType",
  "shape",
  "frameMatirial",
  "frameType",
  "lenses",
  "collections",
  "categories",
  "shipping",
  "returnPolicy",
  "warranty",
  "description",
];

const TRANSLATION_FIELDS = ["titleTranslations", "descriptionTranslations"];

const blankTr = () => ({ en: "", de: "", ar: "" });

const pickProductFields = (prod) => {
  const out = { ...emptyForm };
  PRODUCT_FIELDS.forEach((k) => {
    let v = prod[k];
    if (k === "colors" && Array.isArray(v)) v = v.join(", ");
    if (k === "lenses") v = prod.lenses?._id || prod.lenses || "";
    if (k === "collections")
      v = prod.collections?._id || prod.collections?.id || prod.collections || "";
    if (k === "categories")
      v =
        (Array.isArray(prod.categories)
          ? prod.categories[0]?._id || prod.categories[0]
          : prod.categories?._id || prod.categories) || "";
    if (v !== undefined && v !== null && typeof v !== "object")
      out[k] = v;
  });
  TRANSLATION_FIELDS.forEach((k) => {
    out[k] = { ...blankTr(), ...(prod[k] || {}) };
  });
  return out;
};

const emptyForm = {
  title: "",
  price: "",
  originalPrice: "",
  glassWidth: "",
  sideSize: "",
  noasSize: "",
  lenseSize: "",
  lenseHeight: "",
  templeColor: "",
  colors: "",
  productGender: "",
  glassesType: "",
  shape: "",
  frameMatirial: "",
  frameType: "",
  lenses: "",
  collections: "",
  categories: "",
  shipping: "Free shipping",
  returnPolicy: "30-day return",
  warranty: "2-year warranty",
  description: "",
  titleTranslations: { en: "", de: "", ar: "" },
  descriptionTranslations: { en: "", de: "", ar: "" },
};

export default function SuperAdminProducts() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [cats, setCats] = useState([]);
  const [cols, setCols] = useState([]);
  const [lensOpts, setLensOpts] = useState([]);

  const load = () => {
    setBusy(true);
    adminApi
      .products
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    load();
    adminApi.categories.list().then(setCats).catch(() => {});
    adminApi.collections.list().then(setCols).catch(() => {});
    adminApi.lenses.list().then(setLensOpts).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setExistingImages([]);
    setRemovedImages([]);
    setNewFiles([]);
    setModal(true);
  };

  const openEdit = async (p) => {
    const id = p._id || p.id;
    const full = await adminApi.products.get(id);
    const prod = full || p;
    setEditing(prod);
    setForm(pickProductFields(prod));
    setExistingImages(prod.images || []);
    setRemovedImages([]);
    setNewFiles([]);
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    PRODUCT_FIELDS.forEach((k) => {
      const v = form[k];
      if (v === "" || v === null || v === undefined) return;
      fd.append(k, v);
    });
    TRANSLATION_FIELDS.forEach((k) => appendTranslations(fd, k, form[k]));
    if (editing && removedImages.length)
      fd.append("imagesToRemove", JSON.stringify(removedImages));
    newFiles.forEach((f) => fd.append("images", f));
    setBusy(true);
    try {
      if (editing) {
        await adminApi.products.update(editing._id || editing.id, fd);
      } else {
        await adminApi.products.create(fd);
      }
      setModal(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p) => {
    if (!confirm("Delete this product and its images?")) return;
    await adminApi.products.remove(p._id || p.id);
    load();
  };

  return (
    <SuperAdminLayout title="Products">
      <PageHeader
        title="Product Management"
        subtitle="Glasses inventory and details"
        action={<AddButton onClick={openAdd}>Add new product</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Product name</Th>
            <Th>Preview</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p._id || p.id}>
              <Td>{String(p.title || "").slice(0, 40)}</Td>
              <Td>
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl("products", p.images[0])}
                    alt=""
                    className="h-12 w-16 object-cover rounded"
                  />
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => openEdit(p)}>
                    Edit
                  </button>
                  <button className={btnDanger} onClick={() => remove(p)}>
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {!items.length && !busy && <EmptyRow colSpan={3} />}
        </tbody>
      </TableWrap>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? `Edit: ${editing.title || ""}` : "Add new product"}
        wide
      >
        <form onSubmit={submit} className="space-y-5">
          <div>
            <h4 className="font-bold text-text-primary mb-2">Basic Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Title">
                <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} required />
              </Field>
              <div className="md:col-span-3">
                <TrilingualField label="Title translations" value={form.titleTranslations} onChange={(v) => set("titleTranslations", v)} placeholder="Product title" />
              </div>
              <Field label="Price">
                <input type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Original price">
                <input type="number" step="0.01" value={form.originalPrice} onChange={(e) => set("originalPrice", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Glass width">
                <input type="number" value={form.glassWidth} onChange={(e) => set("glassWidth", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Side size">
                <input type="number" value={form.sideSize} onChange={(e) => set("sideSize", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Lense size">
                <input type="number" value={form.lenseSize} onChange={(e) => set("lenseSize", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Lense height">
                <input type="number" value={form.lenseHeight} onChange={(e) => set("lenseHeight", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Noas size">
                <input type="number" value={form.noasSize} onChange={(e) => set("noasSize", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Temple color">
                <input value={form.templeColor} onChange={(e) => set("templeColor", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Colors (comma separated)">
                <input value={form.colors} onChange={(e) => set("colors", e.target.value)} className={inputCls} placeholder="black, brown" />
              </Field>
              <Field label="Shape — drives virtual try-on">
                <select value={form.shape} onChange={(e) => set("shape", e.target.value)} className={inputCls}>
                  <option value="">Select shape (no try-on without it)</option>
                  {SHAPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Frame type">
                <select value={form.frameType} onChange={(e) => set("frameType", e.target.value)} className={inputCls}>
                  <option value="">Select frame type</option>
                  {FRAME_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Gender">
                <select value={form.productGender} onChange={(e) => set("productGender", e.target.value)} className={inputCls}>
                  <option value="">Select gender</option>
                  {GENDERS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Frame material">
                <select value={form.frameMatirial} onChange={(e) => set("frameMatirial", e.target.value)} className={inputCls}>
                  <option value="">Select frame material</option>
                  {MATERIALS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Shipping">
                <input value={form.shipping} onChange={(e) => set("shipping", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Return policy">
                <input value={form.returnPolicy} onChange={(e) => set("returnPolicy", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Warranty">
                <input value={form.warranty} onChange={(e) => set("warranty", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2">Relations</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Field label="Glasses type">
                <select value={form.glassesType} onChange={(e) => set("glassesType", e.target.value)} className={inputCls}>
                  <option value="">Glasses Type</option>
                  <option value="prescription">Prescription</option>
                  <option value="sunglasses">Sunglasses</option>
                </select>
              </Field>
              <Field label="Collection">
                <select value={form.collections} onChange={(e) => set("collections", e.target.value)} className={inputCls}>
                  <option value="">collections</option>
                  {cols.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Category">
                <select value={form.categories} onChange={(e) => set("categories", e.target.value)} className={inputCls}>
                  <option value="">categories</option>
                  {cats.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lens settings">
                <select value={form.lenses} onChange={(e) => set("lenses", e.target.value)} className={inputCls}>
                  <option value="">select lenses settings</option>
                  {lensOpts.map((l) => (
                    <option key={l._id || l.id} value={l._id || l.id}>{l.title}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-text-primary mb-2">Images (up to 5)</h4>
            {!!existingImages.length && (
              <div className="flex flex-wrap gap-2 mb-3">
                {existingImages
                  .filter((img) => !removedImages.includes(img))
                  .map((img) => (
                    <div key={img} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl("products", img)} alt="" className="h-20 w-20 object-cover rounded border border-border" />
                      <button
                        type="button"
                        onClick={() => setRemovedImages((r) => [...r, img])}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
              className={inputCls}
            />
            {!!newFiles.length && (
              <p className="text-xs text-text-secondary mt-1">
                {newFiles.length} new file(s) selected
              </p>
            )}
          </div>

          <Field label="Description (HTML allowed)">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
              rows={6}
              placeholder="Write a detailed description of the product..."
            />
          </Field>
          <TrilingualField label="Description translations" value={form.descriptionTranslations} onChange={(v) => set("descriptionTranslations", v)} textarea rows={4} placeholder="Product description (HTML allowed)" />

          {editing && (
            <TryOnAssetsEditor
              product={editing}
              onSaved={(patch) => {
                setEditing((prev) => (prev ? { ...prev, ...patch } : prev));
                load();
              }}
            />
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setModal(false)} className={btnGhost}>
              Cancel
            </button>
            <button disabled={busy} className={btnPrimary}>
              {busy && <Spinner size={15} />}
              {busy ? "Saving..." : editing ? "Update Product" : "Publish Product"}
            </button>
          </div>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
