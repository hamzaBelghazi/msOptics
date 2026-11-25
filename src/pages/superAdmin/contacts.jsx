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
  StatusBadge,
  btnDanger,
  btnGhost,
  inputCls,
} from "@/Components/superAdmin/ui";
import { adminApi } from "@/Api/adminApi";

const STATUSES = ["new", "read", "resolved"];

export default function SuperAdminContacts() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = () => {
    setBusy(true);
    adminApi
      .contacts
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const filtered = items.filter((c) => {
    const needle = q.trim().toLowerCase();
    const okQ =
      !needle ||
      (c.name || "").toLowerCase().includes(needle) ||
      (c.email || "").toLowerCase().includes(needle) ||
      (c.subject || "").toLowerCase().includes(needle);
    const okS = !status || c.status === status;
    return okQ && okS;
  });

  const changeStatus = async (c, next) => {
    await adminApi.contacts.update(c._id || c.id, { status: next });
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this message?")) return;
    await adminApi.contacts.remove(id);
    load();
  };

  const view = async (id) => {
    const full = await adminApi.contacts.get(id);
    setViewing(full);
  };

  return (
    <SuperAdminLayout title="Contacts">
      <PageHeader title="Contact Messages" />
      <Toolbar onRefresh={load}>
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search name, email, subject..."
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputCls + " w-auto"}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Toolbar>

      <TableWrap>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Subject</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c._id || c.id}>
              <Td>{c.name}</Td>
              <Td>
                <a href={`mailto:${c.email}`}>{c.email}</a>
              </Td>
              <Td className="max-w-[220px] truncate" title={c.subject}>
                {c.subject}
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <StatusBadge value={c.status} />
                  <select
                    value={c.status}
                    onChange={(e) => changeStatus(c, e.target.value)}
                    className={inputCls + " w-auto !py-1 text-xs"}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </Td>
              <Td>
                {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
              </Td>
              <Td>
                <div className="flex gap-2">
                  <button
                    className={btnGhost}
                    onClick={() => view(c._id || c.id)}
                  >
                    View
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => remove(c._id || c.id)}
                  >
                    Delete
                  </button>
                </div>
              </Td>
            </tr>
          ))}
          {!filtered.length && !busy && <EmptyRow colSpan={6} />}
        </tbody>
      </TableWrap>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Message"
        wide
      >
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="font-semibold text-text-secondary">Name: </span>
                <span className="text-text-primary">{viewing.name}</span>
              </div>
              <div>
                <span className="font-semibold text-text-secondary">Email: </span>
                <a href={`mailto:${viewing.email}`}>{viewing.email}</a>
              </div>
              <div>
                <span className="font-semibold text-text-secondary">Phone: </span>
                <span className="text-text-primary">{viewing.phone || "—"}</span>
              </div>
              <div>
                <span className="font-semibold text-text-secondary">Status: </span>
                <StatusBadge value={viewing.status} />
              </div>
            </div>
            <div>
              <span className="font-semibold text-text-secondary">Subject: </span>
              <span className="text-text-primary">{viewing.subject}</span>
            </div>
            <pre className="whitespace-pre-wrap break-words bg-background rounded-lg p-3 text-text-primary">
              {viewing.message}
            </pre>
          </div>
        )}
      </Modal>
    </SuperAdminLayout>
  );
}
