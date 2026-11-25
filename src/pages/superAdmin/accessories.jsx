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
  StatusBadge,
  btnPrimary,
  btnDanger,
  btnGhost,
  inputCls,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi, imgUrl } from "@/Api/adminApi";
import TrilingualField, { appendTranslations } from "@/Components/superAdmin/Trilingual";

const blankTr = () => ({ en: "", de: "", ar: "" });
const TR_FIELDS = ["nameTranslations", "shortDescriptionTranslations", "descriptionTranslations"];

const emptyForm = {
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  status: "active",
  nameTranslations: { en: "", de: "", ar: "" },
  shortDescriptionTranslations: { en: "", de: "", ar: "" },
  descriptionTranslations: { en: "", de: "", ar: "" },
};

export default function SuperAdminAccessories() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);

  const load = () => {
    setBusy(true);
    adminApi
      .accessories
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setExistingImages([]);
    setRemovedImages([]);
    setNewFiles([]);
    setModal(true);
  };

  const openEdit = async (a) => {
    const full = await adminApi.accessories.get(a._id || a.id);
    const acc = full || a;
    setEditing(acc);
    setForm({
      name: acc.name || "",
      shortDescription: acc.shortDescription || "",
      description: acc.description || "",
      price: acc.price ?? "",
      status: acc.status || "active",
      nameTranslations: { ...blankTr(), ...(acc.nameTranslations || {}) },
      shortDescriptionTranslations: { ...blankTr(), ...(acc.shortDescriptionTranslations || {}) },
      descriptionTranslations: { ...blankTr(), ...(acc.descriptionTranslations || {}) },
    });
    setExistingImages(acc.images || []);
    setRemovedImages([]);
    setNewFiles([]);
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    ["name", "shortDescription", "description", "price", "status"].forEach((k) =>
      fd.append(k, form[k] ?? "")
    );
    TR_FIELDS.forEach((k) => appendTranslations(fd, k, form[k]));
    if (editing && removedImages.length)
      fd.append("imagesToRemove", JSON.stringify(removedImages));
    newFiles.forEach((f) => fd.append("accessoryImages", f));
    setBusy(true);
    try {
      if (editing) {
        await adminApi.accessories.update(editing._id || editing.id, fd);
      } else {
        await adminApi.accessories.create(fd);
      }
      setModal(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (a) => {
    if (!confirm("Delete this accessory?")) return;
    await adminApi.accessories.remove(a._id || a.id);
    load();
  };

  return (
    <SuperAdminLayout title="Accessories">
      <PageHeader
        title="Accessories"
        action={<AddButton onClick={openAdd}>Add new accessory</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Description</Th>
            <Th>Price</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a._id || a.id}>
              <Td>{a.name}</Td>
              <Td className="max-w-[280px] truncate">
                {String(a.description || "").slice(0, 50)}...
              </Td>
              <Td>${a.price}</Td>
              <Td>
                <StatusBadge value={a.status} />
              </Td>
              <Td>
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => openEdit(a)}>
                    Edit
                  </button>
                  <button className={btnDanger} onClick={() => remove(a)}>
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {!items.length && !busy && <EmptyRow colSpan={5} />}
        </tbody>
      </TableWrap>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit accessory" : "Add accessory"}
        wide
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Name">
              <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Price">
              <input required type="number" step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Short description">
            <textarea required value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} className={inputCls} rows={2} />
          </Field>
          <TrilingualField label="Name translations" value={form.nameTranslations} onChange={(v) => set("nameTranslations", v)} placeholder="Accessory name" />
          <TrilingualField label="Short description translations" value={form.shortDescriptionTranslations} onChange={(v) => set("shortDescriptionTranslations", v)} textarea rows={2} placeholder="Short description" />
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <div>
            <span className="block text-xs font-semibold text-text-secondary mb-1 uppercase tracking-wide">
              Images (1–5)
            </span>
            {!!existingImages.length && (
              <div className="flex flex-wrap gap-2 mb-3">
                {existingImages
                  .filter((img) => !removedImages.includes(img))
                  .map((img) => (
                    <div key={img} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl("accessories", img)} alt="" className="h-20 w-20 object-cover rounded border border-border" />
                      <button
                        type="button"
                        onClick={() => setRemovedImages((r) => [...r, img])}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
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
          </div>
          <Field label="Description (HTML allowed)">
            <textarea required value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} rows={5} />
          </Field>
          <TrilingualField label="Description translations" value={form.descriptionTranslations} onChange={(v) => set("descriptionTranslations", v)} textarea rows={4} placeholder="Description (HTML allowed)" />
          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : editing ? "Update" : "Add Accessory"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
