import { useEffect, useState } from "react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import {
  PageHeader,
  Toolbar,
  SearchField,
  TableWrap,
  Th,
  Td,
  EmptyRow,
  Modal,
  Field,
  StatusBadge,
  btnPrimary,
  btnDanger,
  btnGhost,
  inputCls,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi } from "@/Api/adminApi";

const emptyForm = { name: "", placement: "header", content: "", enabled: true };

export default function SuperAdminScripts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setBusy(true);
    adminApi
      .scripts
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const filtered = items.filter((s) =>
    (s.name || "").toLowerCase().includes(q.trim().toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || "",
      placement: s.placement || "header",
      content: s.content || "",
      enabled: !!s.enabled,
    });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await adminApi.scripts.update(editing._id || editing.id, form);
      } else {
        await adminApi.scripts.create(form);
      }
      setModal(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this script?")) return;
    await adminApi.scripts.remove(id);
    load();
  };

  const toggle = async (s) => {
    await adminApi.scripts.toggle(s._id || s.id);
    load();
  };

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  return (
    <SuperAdminLayout title="Scripts">
      <PageHeader
        title="Scripts Manager"
        subtitle="Custom scripts rendered in header or footer"
      />
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit script" : "Add script"}
        wide
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Google Analytics"
              />
            </Field>
            <Field label="Placement">
              <select
                value={form.placement}
                onChange={(e) => setForm({ ...form, placement: e.target.value })}
                className={inputCls}
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            Enabled
          </label>
          <Field label="Script content">
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className={inputCls + " font-mono"}
              rows={8}
              placeholder="Paste <script>...</script> or inline JS"
            />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={reset} className={btnGhost}>
              Reset
            </button>
            <button disabled={busy} className={btnPrimary}>
              {busy && <Spinner size={15} />}
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      <Toolbar onRefresh={load}>
        <SearchField value={q} onChange={setQ} placeholder="Search by name..." />
        <button onClick={openAdd} className={btnPrimary}>
          Add script
        </button>
      </Toolbar>

      <TableWrap>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Placement</Th>
            <Th>Enabled</Th>
            <Th>Updated</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s._id || s.id}>
              <Td>{s.name}</Td>
              <Td>
                <StatusBadge value={s.placement} />
              </Td>
              <Td>
                <StatusBadge value={s.enabled ? "on" : "off"} />
              </Td>
              <Td>{s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}</Td>
              <Td>
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => openEdit(s)}>
                    Edit
                  </button>
                  <button className={btnGhost} onClick={() => toggle(s)}>
                    {s.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => remove(s._id || s.id)}
                  >
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {!filtered.length && !busy && <EmptyRow colSpan={5} />}
        </tbody>
      </TableWrap>
    </SuperAdminLayout>
  );
}
