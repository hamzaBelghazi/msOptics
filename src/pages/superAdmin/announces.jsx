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
const emptyForm = { announceText: "", announceTextTranslations: { en: "", de: "", ar: "" } };

export default function SuperAdminAnnounces() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setBusy(true);
    adminApi
      .announces
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

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      announceText: a.announceText || "",
      announceTextTranslations: { ...blankTr(), ...(a.announceTextTranslations || {}) },
    });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await adminApi.announces.update(editing._id || editing.id, form);
      } else {
        await adminApi.announces.create(form);
      }
      setModal(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this announcement?")) return;
    await adminApi.announces.remove(id);
    load();
  };

  return (
    <SuperAdminLayout title="Announcements">
      <PageHeader
        title="Announcements"
        subtitle="Top announcement bar messages"
        action={<AddButton onClick={openAdd}>Add announce</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Announce</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a._id || a.id}>
              <Td>{a.announceText}</Td>
              <Td>
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => openEdit(a)}>
                    Edit
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => remove(a._id || a.id)}
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
        title={editing ? "Edit announcement" : "Add announcement"}
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Announcement text">
            <input
              required
              value={form.announceText}
              onChange={(e) =>
                setForm({ ...form, announceText: e.target.value })
              }
              className={inputCls}
              placeholder="announce-body"
            />
          </Field>
          <TrilingualField
            label="Translations"
            value={form.announceTextTranslations}
            onChange={(v) => setForm({ ...form, announceTextTranslations: v })}
            placeholder="Announcement text"
          />
          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : editing ? "Update" : "Announce"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
