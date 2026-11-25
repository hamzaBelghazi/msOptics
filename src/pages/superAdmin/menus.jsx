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
import { adminApi, SERVER_URL } from "@/Api/adminApi";
import { useToast } from "@/Components/Context/ToastContext";

const KINDS = ["none", "product", "category", "collection", "page", "accessory"];
const TYPES = ["link", "dropdown", "mega"];

const blankLabels = () => ({ en: "", de: "", ar: "" });
const blankLink = () => ({
  label: "",
  labels: blankLabels(),
  url: "",
  refKind: "none",
  refId: "",
  image: "",
});
const blankColumn = () => ({ heading: "", headings: blankLabels(), links: [] });
const blankForm = () => ({
  label: "",
  labels: blankLabels(),
  type: "link",
  url: "",
  refKind: "none",
  refId: "",
  image: "",
  openInNewTab: false,
  enabled: true,
  children: [],
  columns: [],
  promo: { title: "", titles: blankLabels(), subtitle: "", image: "", url: "", refKind: "none", refId: "" },
});

const menuImg = (f) => (f ? `${SERVER_URL}/img/menus/${f}` : "");

function ImagePick({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const name = await adminApi.menus.uploadImage(file);
      onChange(name);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={menuImg(value)} alt="" className="h-14 w-14 rounded-xl object-cover border border-border" />
      ) : (
        <span className="grid place-items-center h-14 w-14 rounded-xl bg-background text-text-muted text-xs border border-border">
          No image
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => upload(e.target.files?.[0])}
          className="text-xs text-text-secondary"
        />
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
            <Spinner size={12} /> Uploading…
          </span>
        )}
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 text-left">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function RefPicker({ kind, value, options, onKind, onPick, prefix }) {
  const list =
    kind === "product"
      ? (options.products || []).map((p) => ({ id: p._id, name: p.title }))
      : kind === "category"
      ? (options.categories || []).map((c) => ({ id: c._id, name: c.name }))
      : kind === "collection"
      ? (options.collections || []).map((c) => ({ id: c._id, name: c.name }))
      : kind === "page"
      ? (options.pages || []).map((p) => ({ id: p._id, name: p.name }))
      : kind === "accessory"
      ? (options.accessories || []).map((a) => ({ id: a._id, name: a.name }))
      : [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Field label={`${prefix} links to`}>
        <select value={kind} onChange={(e) => onKind(e.target.value)} className={inputCls}>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k === "none" ? "Custom URL" : k}
            </option>
          ))}
        </select>
      </Field>
      {kind !== "none" ? (
        <Field label="Choose item (label + link auto-filled)">
          <select value={value} onChange={(e) => onPick(e.target.value)} className={inputCls}>
            <option value="">— select —</option>
            {list.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Custom URL">
          <input
            value={value}
            placeholder="https://… or /shop-path"
            onChange={(e) => onPick(e.target.value)}
            className={inputCls}
          />
        </Field>
      )}
    </div>
  );
}

export default function SuperAdminMenus() {
  const [items, setItems] = useState([]);
  const [options, setOptions] = useState({});
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());
  const { addToast } = useToast();

  const load = () => {
    setBusy(true);
    adminApi.menus
      .list()
      .then((l) => setItems(Array.isArray(l) ? l.sort((a, b) => (a.order || 0) - (b.order || 0)) : []))
      .catch(() => setItems([]))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    load();
    adminApi.menus.refOptions().then(setOptions).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLabel = (lang, v) => setForm((f) => ({ ...f, labels: { ...f.labels, [lang]: v } }));

  const applyEntity = (refId, asUrl = false) => {
    // find entity name to suggest a label
    const all = [
      ...(options.products || []).map((p) => ({ id: String(p._id), name: p.title })),
      ...(options.categories || []).map((c) => ({ id: String(c._id), name: c.name })),
      ...(options.collections || []).map((c) => ({ id: String(c._id), name: c.name })),
      ...(options.pages || []).map((p) => ({ id: String(p._id), name: p.name })),
      ...(options.accessories || []).map((a) => ({ id: String(a._id), name: a.name })),
    ];
    const found = all.find((o) => o.id === String(refId));
    setForm((f) => ({
      ...f,
      refId,
      ...(asUrl ? { url: refId } : {}),
      ...(!f.label && found ? { label: found.name, labels: { ...f.labels, en: f.labels.en || found.name } } : {}),
    }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(blankForm());
    setModal(true);
  };

  const openEdit = async (m) => {
    const full = await adminApi.menus.get(m._id || m.id).catch(() => m);
    const src = full || m;
    setEditing(src);
    setForm({
      ...blankForm(),
      ...src,
      labels: { ...blankLabels(), ...(src.labels || {}) },
      children: (src.children || []).map((c) => ({ ...blankLink(), ...c, labels: { ...blankLabels(), ...(c.labels || {}) } })),
      columns: (src.columns || []).map((c) => ({
        ...blankColumn(),
        ...c,
        headings: { ...blankLabels(), ...(c.headings || {}) },
        links: (c.links || []).map((l) => ({ ...blankLink(), ...l, labels: { ...blankLabels(), ...(l.labels || {}) } })),
      })),
      promo: { ...blankForm().promo, ...(src.promo || {}), titles: { ...blankLabels(), ...((src.promo || {}).titles || {}) } },
    });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    // Strip server-managed / resolved fields: sending back _id inside the
    // body makes MongoDB throw "immutable field '_id'" (500) on updates.
    const cleanLink = (l) => {
      const { _id, __v, resolved, ...rest } = l || {};
      return { ...rest, labels: { ...(l?.labels || {}) } };
    };
    const payload = { ...form };
    // label is required by the schema: fall back to the EN label
    if (!payload.label) {
      payload.label = payload.labels?.en || payload.labels?.de || payload.labels?.ar || "Menu item";
    }
    delete payload._id;
    delete payload.__v;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.resolved;
    payload.children = (payload.children || []).map(cleanLink);
    payload.columns = (payload.columns || []).map((c) => {
      const { _id, __v, ...rest } = c || {};
      return { ...rest, links: (c.links || []).map(cleanLink) };
    });
    if (payload.promo) {
      const { resolved, ...promo } = payload.promo;
      payload.promo = promo;
    }
    if (form.type === "link") {
      payload.children = [];
      payload.columns = [];
      payload.promo = undefined;
    } else if (form.type === "dropdown") {
      payload.columns = [];
      payload.promo = undefined;
    } else {
      payload.children = [];
    }
    setBusy(true);
    try {
      if (editing) await adminApi.menus.update(editing._id || editing.id, payload);
      else await adminApi.menus.create(payload);
      setModal(false);
      load();
    } catch (err) {
      // Surface the real cause: axios "Network Error" means the browser got
      // NO response (blocked/refused). Log everything for diagnosis.
      console.error("[menus] save failed", {
        url: (err?.config?.baseURL || "") + (err?.config?.url || ""),
        method: err?.config?.method,
        status: err?.response?.status,
        code: err?.code,
        message: err?.message,
      });
      addToast(
        `Save failed (${err?.response?.status || "no response"}): ${
          err?.response?.data?.message || err?.message
        }. Open F12 Console for the request URL.`,
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this menu item?")) return;
    await adminApi.menus.remove(id);
    load();
  };

  const toggle = async (m) => {
    await adminApi.menus.toggle(m._id || m.id);
    load();
  };

  const move = async (idx, dir) => {
    const arr = [...items];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setItems(arr);
    await adminApi.menus.reorder(arr.map((m, i) => ({ id: m._id || m.id, order: i })));
  };

  // ---- sub-editors ----
  const patchChild = (i, patch) =>
    setForm((f) => ({ ...f, children: f.children.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  const patchCol = (i, patch) =>
    setForm((f) => ({ ...f, columns: f.columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  const patchColLink = (ci, li, patch) =>
    setForm((f) => ({
      ...f,
      columns: f.columns.map((c, idx) =>
        idx === ci ? { ...c, links: c.links.map((l, j) => (j === li ? { ...l, ...patch } : l)) } : c
      ),
    }));

  const childEntityName = (refKind, refId) => {
    if (!refKind || refKind === "none") return "";
    const map = {
      product: options.products || [],
      category: options.categories || [],
      collection: options.collections || [],
      page: options.pages || [],
      accessory: options.accessories || [],
    };
    const ent = (map[refKind] || []).find((o) => String(o._id) === String(refId));
    return ent ? ent.title || ent.name : "";
  };

  return (
    <SuperAdminLayout title="Menus">
      <PageHeader
        title="Header menus"
        subtitle="Dropdowns & mega menus with images, products, categories and collections"
        action={<AddButton onClick={openAdd}>Add menu item</AddButton>}
      />
      <TableWrap>
        <thead>
          <tr>
            <Th>Order</Th>
            <Th>Label</Th>
            <Th>Type</Th>
            <Th>Target</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, idx) => (
            <tr key={m._id || m.id}>
              <Td>
                <div className="flex gap-1">
                  <button className={btnGhost} onClick={() => move(idx, -1)}>↑</button>
                  <button className={btnGhost} onClick={() => move(idx, 1)}>↓</button>
                </div>
              </Td>
              <Td className="font-semibold">{m.labels?.en || m.label}</Td>
              <Td>
                <StatusBadge value={m.type} />
              </Td>
              <Td className="text-xs max-w-[220px] truncate">
                {m.refKind && m.refKind !== "none"
                  ? `${m.refKind}: ${childEntityName(m.refKind, m.refId) || m.refId}`
                  : m.url || "—"}
              </Td>
              <Td>
                <StatusBadge value={m.enabled ? "on" : "off"} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <button className={btnGhost} onClick={() => openEdit(m)}>Edit</button>
                  <button className={btnGhost} onClick={() => toggle(m)}>
                    {m.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className={btnDanger} onClick={() => remove(m._id || m.id)}>Delete</button>
                </div>
              </Td>
            </tr>
          ))}
          {!items.length && !busy && <EmptyRow colSpan={6} />}
        </tbody>
      </TableWrap>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit menu item" : "Add menu item"} wide>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {["en", "de", "ar"].map((L) => (
              <Field key={L} label={`Label (${L.toUpperCase()})`}>
                <input
                  value={form.labels?.[L] || ""}
                  onChange={(e) => setLabel(L, e.target.value)}
                  className={inputCls}
                  placeholder={L === "en" ? "Shop" : ""}
                />
              </Field>
            ))}
          </div>
          {!form.labels?.en && (
            <Field label="Label (fallback)">
              <input value={form.label} onChange={(e) => set("label", e.target.value)} className={inputCls} required={!form.labels?.en} />
            </Field>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Menu type">
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "link" ? "Simple link" : t === "dropdown" ? "Dropdown" : "Mega menu"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Thumbnail image (optional)">
              <ImagePick value={form.image} onChange={(v) => set("image", v)} />
            </Field>
          </div>

          <RefPicker
            kind={form.refKind}
            value={form.refKind === "none" ? form.url : form.refId}
            options={options}
            prefix="Top item"
            onKind={(k) => {
              set("refKind", k);
              if (k === "none") set("refId", "");
              else set("url", "");
            }}
            onPick={(v) => (form.refKind === "none" ? set("url", v) : applyEntity(v))}
          />

          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={!!form.openInNewTab} onChange={(e) => set("openInNewTab", e.target.checked)} />
            Open in new tab
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={!!form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            Enabled
          </label>

          {/* DROPDOWN children */}
          {form.type === "dropdown" && (
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="font-bold text-text-primary">Dropdown links</h4>
              {form.children.map((c, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-3 bg-background/40">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {["en", "de", "ar"].map((L) => (
                      <input
                        key={L}
                        value={c.labels?.[L] || ""}
                        onChange={(e) => patchChild(i, { labels: { ...c.labels, [L]: e.target.value } })}
                        placeholder={`Label ${L.toUpperCase()}`}
                        className={inputCls}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Link to">
                      <select
                        value={c.refKind}
                        onChange={(e) => patchChild(i, { refKind: e.target.value, refId: "", url: "" })}
                        className={inputCls}
                      >
                        {KINDS.map((k) => (
                          <option key={k} value={k}>{k === "none" ? "Custom URL" : k}</option>
                        ))}
                      </select>
                    </Field>
                    {c.refKind === "none" ? (
                      <Field label="URL">
                        <input value={c.url || ""} onChange={(e) => patchChild(i, { url: e.target.value })} className={inputCls} placeholder="/type/sunglasses" />
                      </Field>
                    ) : (
                      <Field label={`Choose ${c.refKind}`}>
                        <select
                          value={c.refId || ""}
                          onChange={(e) => {
                            const rid = e.target.value;
                            const nm = childEntityName(c.refKind, rid);
                            patchChild(i, {
                              refId: rid,
                              label: c.label || nm,
                              labels: { ...c.labels, en: c.labels?.en || nm },
                            });
                          }}
                          className={inputCls}
                        >
                          <option value="">— select —</option>
                          {(
                            (c.refKind === "product" ? options.products || [] :
                             c.refKind === "category" ? options.categories || [] :
                             c.refKind === "collection" ? options.collections || [] :
                             c.refKind === "page" ? options.pages || [] : options.accessories || [])
                          ).map((o) => (
                            <option key={o._id} value={o._id}>{o.title || o.name}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </div>
                  <ImagePick value={c.image} onChange={(v) => patchChild(i, { image: v })} />
                  <button type="button" className={btnDanger} onClick={() => set("children", form.children.filter((_, j) => j !== i))}>
                    Remove link
                  </button>
                </div>
              ))}
              <button type="button" className={btnGhost} onClick={() => set("children", [...form.children, blankLink()])}>
                + Add dropdown link
              </button>
            </div>
          )}

          {/* MEGA columns + promo */}
          {form.type === "mega" && (
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="font-bold text-text-primary">Mega columns</h4>
              {form.columns.map((col, ci) => (
                <div key={ci} className="rounded-xl border border-border p-3 space-y-3 bg-background/40">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {["en", "de", "ar"].map((L) => (
                      <input
                        key={L}
                        value={col.headings?.[L] || ""}
                        onChange={(e) => patchCol(ci, { headings: { ...col.headings, [L]: e.target.value } })}
                        placeholder={`Column heading ${L.toUpperCase()}`}
                        className={inputCls}
                      />
                    ))}
                  </div>
                  {(col.links || []).map((l, li) => (
                    <div key={li} className="rounded-lg border border-border/70 p-2.5 space-y-2">
                      <input
                        value={l.labels?.en || l.label || ""}
                        onChange={(e) => patchColLink(ci, li, { label: e.target.value, labels: { ...l.labels, en: e.target.value } })}
                        placeholder="Link label"
                        className={inputCls}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-end">
                        <select
                          value={l.refKind || "none"}
                          onChange={(e) => patchColLink(ci, li, { refKind: e.target.value, refId: "", url: "" })}
                          className={inputCls}
                        >
                          {["none", "product", "category", "collection", "accessory", "page"].map((k) => (
                            <option key={k} value={k}>{k === "none" ? "Custom URL" : k}</option>
                          ))}
                        </select>
                        {(l.refKind || "none") === "none" ? (
                          <input
                            value={l.url || ""}
                            onChange={(e) => patchColLink(ci, li, { url: e.target.value })}
                            placeholder="/type/sunglasses or https://…"
                            className={inputCls}
                          />
                        ) : (
                          <select
                            value={l.refId || ""}
                            onChange={(e) => {
                              const id = e.target.value;
                              const nm = childEntityName(l.refKind, id);
                              patchColLink(ci, li, { refId: id, label: l.label || nm, labels: { ...l.labels, en: l.labels?.en || nm } });
                            }}
                            className={inputCls}
                          >
                            <option value="">— select {l.refKind} —</option>
                            {(
                              (l.refKind === "product" ? options.products || [] :
                               l.refKind === "category" ? options.categories || [] :
                               l.refKind === "collection" ? options.collections || [] :
                               l.refKind === "page" ? options.pages || [] : options.accessories || [])
                            ).map((o) => (
                              <option key={o._id} value={o._id}>{o.title || o.name}</option>
                            ))}
                          </select>
                        )}
                        <button type="button" className={btnDanger} onClick={() => patchCol(ci, { links: col.links.filter((_, j) => j !== li) })}>
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button type="button" className={btnGhost} onClick={() => patchCol(ci, { links: [...(col.links || []), blankLink()] })}>
                      + Add column link
                    </button>
                    <button type="button" className={btnDanger} onClick={() => set("columns", form.columns.filter((_, j) => j !== ci))}>
                      Remove column
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" className={btnGhost} onClick={() => set("columns", [...form.columns, blankColumn()])}>
                + Add column
              </button>

              <h4 className="font-bold text-text-primary pt-2">Featured promo card</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Promo title">
                  <input value={form.promo?.title || ""} onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, title: e.target.value, titles: { ...f.promo.titles, en: e.target.value } } }))} className={inputCls} placeholder="New season" />
                </Field>
                <Field label="Promo subtitle">
                  <input value={form.promo?.subtitle || ""} onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, subtitle: e.target.value } }))} className={inputCls} placeholder="Up to 30% off" />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Promo image">
                  <ImagePick value={form.promo?.image} onChange={(v) => setForm((f) => ({ ...f, promo: { ...f.promo, image: v } }))} />
                </Field>
                <Field label="Promo link URL">
                  <input value={form.promo?.url || ""} onChange={(e) => setForm((f) => ({ ...f, promo: { ...f.promo, url: e.target.value } }))} className={inputCls} placeholder="/type/sunglasses" />
                </Field>
              </div>
            </div>
          )}

          <button disabled={busy} className={btnPrimary}>
            {busy && <Spinner size={15} />}
            {busy ? "Saving…" : editing ? "Update menu item" : "Add menu item"}
          </button>
        </form>
      </Modal>
    </SuperAdminLayout>
  );
}
