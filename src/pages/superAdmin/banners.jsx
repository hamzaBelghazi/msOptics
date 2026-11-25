import { useEffect, useState } from "react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import {
  PageHeader,
  Toolbar,
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

export default function SuperAdminBanners() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [link, setLink] = useState("");
  const [file, setFile] = useState(null);

  const load = () => {
    setBusy(true);
    adminApi
      .banners
      .list()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.append("slide", file);
    fd.append("link", link);
    setBusy(true);
    try {
      await adminApi.banners.create(fd);
      setModal(false);
      setLink("");
      setFile(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this banner?")) return;
    await adminApi.banners.remove(id);
    load();
  };

  return (
    <SuperAdminLayout title="Banners">
      <PageHeader
        title="Banners"
        subtitle="Homepage slides"
        action={<AddButton onClick={() => setModal(true)}>Add banner</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Preview</Th>
            <Th>Link</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b._id || b.id}>
              <Td>
                {b.slide ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl("banners", b.slide)}
                    alt=""
                    className="h-12 w-28 object-cover rounded"
                  />
                ) : (
                  "—"
                )}
              </Td>
              <Td className="max-w-[280px] truncate">{b.link}</Td>
              <Td>
                <button
                  className={btnDanger}
                  onClick={() => remove(b._id || b.id)}
                >
                  Delete
                </button>
              </Td>
            </tr>
          ))}
          {!items.length && !busy && <EmptyRow colSpan={3} />}
        </tbody>
      </TableWrap>

      <Modal open={modal} onClose={() => setModal(false)} title="Add banner">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Banner image">
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className={inputCls}
            />
          </Field>
          <Field label="Link (http://...)">
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className={inputCls}
              placeholder="http://"
            />
          </Field>
          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving..." : "Add banner"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
