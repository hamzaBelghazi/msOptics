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
import { adminApi } from "@/Api/adminApi";
import TrilingualField from "@/Components/superAdmin/Trilingual";

const blankTr = () => ({ en: "", de: "", ar: "" });
const emptyForm = {
  name: "",
  pageBody: "",
  nameTranslations: { en: "", de: "", ar: "" },
  pageBodyTranslations: { en: "", de: "", ar: "" },
};

export default function SuperAdminPages() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setBusy(true);
    adminApi
      .pages
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      pageBody: p.pageBody || "",
      nameTranslations: { ...blankTr(), ...(p.nameTranslations || {}) },
      pageBodyTranslations: { ...blankTr(), ...(p.pageBodyTranslations || {}) },
    });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await adminApi.pages.update(editing._id || editing.id, form);
      } else {
        await adminApi.pages.create(form);
      }
      setModal(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this page?")) return;
    await adminApi.pages.remove(id);
    load();
  };

  return (
    <SuperAdminLayout title="Pages">
      <PageHeader
        title="Pages"
        action={<AddButton onClick={openAdd}>Add page</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Page</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p._id || p.id}>
              <Td>{p.name}</Td>
              <Td>
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => openEdit(p)}>
                    Edit
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => remove(p._id || p.id)}
                  >
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {!items.length && !busy && <EmptyRow colSpan={2} />}
        </tbody>
      </TableWrap>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit page" : "Add page"}
        wide
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Page name">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Name of the page"
            />
          </Field>
          <TrilingualField label="Name translations" value={form.nameTranslations} onChange={(v) => setForm({ ...form, nameTranslations: v })} placeholder="Page name" />
          <Field label="Page body (HTML allowed)">
            <textarea
              value={form.pageBody}
              onChange={(e) => setForm({ ...form, pageBody: e.target.value })}
              className={inputCls}
              rows={10}
              placeholder="Write page content here (HTML allowed)..."
            />
          </Field>
          <TrilingualField label="Body translations" value={form.pageBodyTranslations} onChange={(v) => setForm({ ...form, pageBodyTranslations: v })} textarea rows={6} placeholder="Page content (HTML allowed)" />
          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : editing ? "Update" : "Post"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
