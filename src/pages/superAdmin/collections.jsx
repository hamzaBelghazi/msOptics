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
  inputCls,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi, imgUrl } from "@/Api/adminApi";
import TrilingualField, { appendTranslations } from "@/Components/superAdmin/Trilingual";

const blankTr = () => ({ en: "", de: "", ar: "" });

export default function SuperAdminCollections() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [nameTr, setNameTr] = useState(blankTr());
  const [descTr, setDescTr] = useState(blankTr());
  const [file, setFile] = useState(null);

  const load = () => {
    setBusy(true);
    adminApi
      .collections
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("name", name);
    fd.append("desc", desc);
    appendTranslations(fd, "nameTranslations", nameTr);
    appendTranslations(fd, "descTranslations", descTr);
    if (file) fd.append("collectionImage", file);
    setBusy(true);
    try {
      await adminApi.collections.create(fd);
      setModal(false);
      setName("");
      setDesc("");
      setNameTr(blankTr());
      setDescTr(blankTr());
      setFile(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this collection?")) return;
    await adminApi.collections.remove(id);
    load();
  };

  return (
    <SuperAdminLayout title="Collections">
      <PageHeader
        title="Collections"
        action={<AddButton onClick={() => setModal(true)}>Add collection</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Collection name</Th>
            <Th>Image</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c._id || c.id}>
              <Td>{c.name}</Td>
              <Td>
                {c.collectionImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl("collection", c.collectionImage)}
                    alt=""
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <button
                  className={btnDanger}
                  onClick={() => remove(c._id || c.id)}
                >
                  Delete
                </button>
              </Td>
            </tr>
          ))}
          {!items.length && !busy && <EmptyRow colSpan={3} />}
        </tbody>
      </TableWrap>

      <Modal open={modal} onClose={() => setModal(false)} title="Add collection">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Collection name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Collection name"
            />
          </Field>
          <Field label="Description">
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className={inputCls}
              placeholder="Collection desc"
            />
          </Field>
          <TrilingualField label="Name translations" value={nameTr} onChange={setNameTr} placeholder="Collection name" />
          <TrilingualField label="Description translations" value={descTr} onChange={setDescTr} textarea rows={2} placeholder="Collection description" />
          <Field label="Thumbnail">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={inputCls}
            />
          </Field>
          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : "Save"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
