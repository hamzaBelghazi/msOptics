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
  btnPrimary,
  btnDanger,
  btnGhost,
  inputCls,
  Spinner,
} from "@/Components/superAdmin/ui";
import { adminApi } from "@/Api/adminApi";

export default function SuperAdminUsers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "client",
  });

  const load = () => {
    setBusy(true);
    adminApi
      .users
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const filtered = items.filter((u) => {
    const name = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
    const email = (u.email || "").toLowerCase();
    const needle = q.trim().toLowerCase();
    const okQ = !needle || name.includes(needle) || email.includes(needle);
    const okR = !role || (u.role || "") === role;
    return okQ && okR;
  });

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || "",
      role: u.role || "client",
    });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.users.update(editing._id || editing.id, form);
      setModal(false);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Permanently delete this user?")) return;
    await adminApi.users.remove(id);
    load();
  };

  return (
    <SuperAdminLayout title="Users">
      <PageHeader title="Users" />
      <Toolbar onRefresh={load}>
        <SearchField value={q} onChange={setQ} placeholder="Search name or email" />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={inputCls + " w-auto"}
        >
          <option value="">All roles</option>
          <option value="client">client</option>
          <option value="admin">admin</option>
          <option value="superAdmin">superAdmin</option>
        </select>
      </Toolbar>

      <TableWrap>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u._id || u.id}>
              <Td>
                {(u.firstName || "") + " " + (u.lastName || "")}
              </Td>
              <Td>{u.email}</Td>
              <Td>{u.role}</Td>
              <Td>
                <div className="flex gap-2">
                  <button className={btnGhost} onClick={() => openEdit(u)}>
                    Edit
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => remove(u._id || u.id)}
                  >
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {!filtered.length && !busy && <EmptyRow colSpan={4} />}
        </tbody>
      </TableWrap>

      <Modal open={modal} onClose={() => setModal(false)} title="Edit user">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name">
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Last name">
              <input
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls}
              >
                <option value="client">client</option>
                <option value="admin">admin</option>
                <option value="superAdmin">superAdmin</option>
              </select>
            </Field>
          </div>
          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : "Save"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
