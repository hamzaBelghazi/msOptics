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

export default function SuperAdminCategories() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [nameTr, setNameTr] = useState(blankTr());
  const [file, setFile] = useState(null);

  const load = () => {
    setBusy(true);
    adminApi
      .categories
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
    appendTranslations(fd, "nameTranslations", nameTr);
    if (file) fd.append("categoryImage", file);
    setBusy(true);
    try {
      await adminApi.categories.create(fd);
      setModal(false);
      setName("");
      setNameTr(blankTr());
      setFile(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this category?")) return;
    await adminApi.categories.remove(id);
    load();
  };

  return (
    <SuperAdminLayout title="Categories">
      <PageHeader
        title="Categories"
        action={<AddButton onClick={() => setModal(true)}>Add category</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Category name</Th>
            <Th>Image</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c._id || c.id}>
              <Td>{c.name}</Td>
              <Td>
                {c.categoryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl("category", c.categoryImage)}
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

      <Modal open={modal} onClose={() => setModal(false)} title="Add category">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Category name">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Category name"
            />
          </Field>
          <TrilingualField label="Name translations" value={nameTr} onChange={setNameTr} placeholder="Category name" />
          <Field label="Category image">
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
