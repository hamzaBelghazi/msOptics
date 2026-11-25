import { useEffect, useMemo, useRef, useState } from "react";
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
  Spinner,
  btnDanger,
  btnGhost,
  inputCls,
} from "@/Components/superAdmin/ui";
import { adminApi, SERVER_URL } from "@/Api/adminApi";
import { useCurrency } from "@/Components/Context/currencyContext";
import { useToast } from "@/Components/Context/ToastContext";
import { Download, ChevronDown, FileText, FileSpreadsheet } from "lucide-react";

// Saves a blob returned by the API as a download.
const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

// The API answers blob requests with JSON on failure.
const blobMessage = async (error) => {
  const data = error?.response?.data;
  if (data && typeof data.text === "function") {
    try {
      const text = await data.text();
      return JSON.parse(text)?.message || "";
    } catch {
      return "";
    }
  }
  return error?.response?.data?.message || "";
};

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "failed"];

const fileHref = (f) => {
  if (!f) return "";
  if (typeof f === "string")
    return f.startsWith("http") ? f : `${SERVER_URL}/${f.replace(/^\/+/, "")}`;
  const u = f.file || f.path || "";
  return u.startsWith("http") ? u : `${SERVER_URL}/${String(u).replace(/^\/+/, "")}`;
};

// Older orders were saved before `kind` existed: fall back to the path/ref.
const assetKind = (f) => {
  if (f?.kind) return f.kind;
  const ref = String(f?.ref || "");
  const file = String(f?.file || "");
  if (ref.startsWith("facePhoto:") || file.includes("/face-photos/")) return "facePhoto";
  if (ref.startsWith("faceSheet:") || file.includes("/face-sheets/")) return "faceSheet";
  return "prescription";
};

const faceMetric = (value, unit = " mm") =>
  value === undefined || value === null || value === "" ? "—" : `${value}${unit}`;

const facePdPair = (m) =>
  m?.right === undefined || m?.right === null || m?.left === undefined || m?.left === null
    ? "—"
    : `${m.right} / ${m.left} mm`;

const faceScaleSource = (m) => {
  if (m?.calibration === "known-pd") return "Your PD (exact)";
  if (m?.calibration === "iris") return "Iris 11.7 mm (approx.)";
  return "—";
};

const FaceMetricGrid = ({ metrics }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
    <div>
      <span className="text-text-muted">Pupillary distance</span>{" "}
      <strong>{faceMetric(metrics?.pd)}</strong>
    </div>
    <div>
      <span className="text-text-muted">Right / left PD</span>{" "}
      <strong>{facePdPair(metrics)}</strong>
    </div>
    <div>
      <span className="text-text-muted">Face width</span>{" "}
      <strong>{faceMetric(metrics?.faceWidth)}</strong>
    </div>
    <div>
      <span className="text-text-muted">Head position</span>{" "}
      <strong>
        {metrics?.level
          ? metrics.level === "good"
            ? "Straight"
            : String(metrics.level).replace("-", " ")
          : "—"}
      </strong>
    </div>
    <div>
      <span className="text-text-muted">Scale source</span>{" "}
      <strong>{faceScaleSource(metrics)}</strong>
    </div>
    <div>
      <span className="text-text-muted">Captured</span>{" "}
      <strong>
        {metrics?.takenAt ? new Date(metrics.takenAt).toLocaleString() : "—"}
      </strong>
    </div>
  </div>
);

export default function SuperAdminOrders() {
  // admin figures are always the shop's own currency
  const { formatBase } = useCurrency();
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [assets, setAssets] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState("");
  const exportRef = useRef(null);

  const load = () => {
    setBusy(true);
    adminApi
      .orders
      .list()
      .then((list) => setItems(Array.isArray(list) ? list : []))
      .catch(() => setItems([]))
      .finally(() => {
        setBusy(false);
        // keep the sidebar's pending badge in step with the table
        window.dispatchEvent(new Event("admin:orders-changed"));
      });
  };

  useEffect(load, []);

  const filtered = useMemo(
    () =>
      items.filter((o) => {
        const needle = q.trim().toLowerCase();
        const num = String(o.orderNum || "").toLowerCase();
        const uname =
          o.customerName ||
          (o.user
            ? `${o.user.firstName || ""} ${o.user.lastName || ""}`.trim()
            : "Guest");
        const okQ =
          !needle ||
          num.includes(needle) ||
          String(uname).toLowerCase().includes(needle);
        const okS = !status || o.status === status;
        return okQ && okS;
      }),
    [items, q, status]
  );

  // close the export menu on an outside click or Escape
  useEffect(() => {
    if (!exportOpen) return undefined;
    const onClick = (event) => {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [exportOpen]);

  // export exactly the rows the table is showing
  const runExport = async (format) => {
    if (exporting) return;
    setExportOpen(false);
    setExporting(format);
    try {
      const { blob, filename } = await adminApi.orders.export(format, {
        q: q.trim(),
        status,
      });
      saveBlob(blob, filename);
      addToast(
        `${filtered.length} order${filtered.length === 1 ? "" : "s"} exported`,
        "success"
      );
    } catch (error) {
      addToast(
        (await blobMessage(error)) || "The export could not be generated",
        "error"
      );
    } finally {
      setExporting("");
    }
  };

  const userName = (o) =>
    o.customerName ||
    (o.user
      ? `${o.user.firstName || ""} ${o.user.lastName || ""}`.trim() || "Guest"
      : "Guest");

  const update = async (o, next) => {
    await adminApi.orders.update(o._id || o.id, { status: next });
    load();
  };

  const cancel = async (o) => {
    if (!confirm("Cancel this order and issue a refund (if possible)?")) return;
    await adminApi.orders.cancel(o._id || o.id);
    load();
  };

  const remove = async (o) => {
    if (!confirm("Permanently delete this order and its files?")) return;
    await adminApi.orders.remove(o._id || o.id);
    load();
  };

  const view = async (o) => {
    const full = await adminApi.orders.get(o._id || o.id);
    setDetail(full);
  };

  const showAssets = (o) => {
    const legacy = (o.facePhotos || o.attachments || []).map((f) => ({
      kind: "facePhoto",
      file: typeof f === "string" ? f : f?.file || f?.path || "",
    }));
    setAssets({
      items: [
        ...(o.prescriptions || []).map((f) => ({ ...f, kind: assetKind(f) })),
        ...legacy,
      ],
    });
  };

  const assetItems = assets?.items || [];
  const assetPhotos = assetItems.filter((f) => f.kind === "facePhoto");
  const assetSheets = assetItems.filter((f) => f.kind === "faceSheet");
  const assetDocs = assetItems.filter(
    (f) => f.kind !== "facePhoto" && f.kind !== "faceSheet"
  );
  const sheetOf = (entry) =>
    assetSheets.find((s) => s.itemId && s.itemId === entry.itemId);

  return (
    <SuperAdminLayout title="Orders">
      <PageHeader title="Order Management" />
      <Toolbar onRefresh={load}>
        <SearchField
          value={q}
          onChange={setQ}
          placeholder="Search order # or customer..."
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

        <div className="relative ml-auto" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((open) => !open)}
            disabled={Boolean(exporting) || !filtered.length}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            className={btnGhost}
            title="Download the orders shown below"
          >
            {exporting ? <Spinner size={14} /> : <Download size={14} />}
            {exporting ? "Preparing…" : "Export"}
            <ChevronDown
              size={13}
              className={`transition-transform ${exportOpen ? "rotate-180" : ""}`}
            />
          </button>

          {exportOpen && (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-card-background p-1 shadow-xl"
            >
              <p className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {filtered.length} order{filtered.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => runExport("csv")}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-background"
              >
                <FileText size={16} className="mt-0.5 shrink-0 text-text-muted" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-primary">
                    CSV file
                  </span>
                  <span className="block text-[11px] leading-snug text-text-muted">
                    One row per order — opens anywhere
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => runExport("xlsx")}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-background"
              >
                <FileSpreadsheet
                  size={16}
                  className="mt-0.5 shrink-0 text-text-muted"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-text-primary">
                    Excel workbook (.xlsx)
                  </span>
                  <span className="block text-[11px] leading-snug text-text-muted">
                    Orders + items sheets, totals stay numeric
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </Toolbar>

      <TableWrap>
        <thead>
          <tr>
            <Th>Order #</Th>
            <Th>Customer</Th>
            <Th>Amount</Th>
            <Th>Items</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => {
            const id = o._id || o.id;
            return (
              <tr key={id}>
                <Td className="font-mono text-xs">{o.orderNum || id}</Td>
                <Td>{userName(o)}</Td>
                <Td>{formatBase(o.amount)}</Td>
                <Td>{Array.isArray(o.products) ? o.products.length : 0}</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={o.status} />
                    <select
                      value={o.status}
                      onChange={(e) => update(o, e.target.value)}
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
                  {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <button className={btnGhost} onClick={() => view(o)}>
                      View
                    </button>
                    <button
                      className={btnGhost}
                      onClick={() => cancel(o)}
                      disabled={["shipped", "delivered", "cancelled"].includes(
                        o.status
                      )}
                    >
                      Cancel & Refund
                    </button>
                    <button className={btnGhost} onClick={() => showAssets(o)}>
                      Assets
                    </button>
                    <button className={btnDanger} onClick={() => remove(o)}>
                      Delete
                    </button>
                  </div>
                  {o.paymentIntentId && (
                    <div className="mt-1 text-[11px] text-text-muted">
                      PI: <code>{o.paymentIntentId}</code>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
          {!filtered.length && !busy && <EmptyRow colSpan={7} />}
        </tbody>
      </TableWrap>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`Order ${detail?.orderNum || ""}`}
        wide
      >
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><strong>Status:</strong> {detail.status}</div>
              <div><strong>Total:</strong> {formatBase(detail.amount)}</div>
              <div>
                <strong>Created:</strong>{" "}
                {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : "—"}
              </div>
              {detail.paymentIntentId && (
                <div><strong>PI:</strong> <code>{detail.paymentIntentId}</code></div>
              )}
            </div>
            <div>
              <h4 className="font-bold mb-2">Items</h4>
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Qty</Th>
                    <Th>Price</Th>
                    <Th>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.products || []).map((p, i) => (
                    <tr key={i}>
                      <Td>
                        {p.title || p.name || "Item"}
                        {p.customizations &&
                          Object.keys(p.customizations).length > 0 && (
                            <details className="mt-1 text-xs text-text-secondary">
                              <summary className="cursor-pointer">
                                Customization details
                              </summary>
                              <ul className="list-disc list-inside">
                                {Object.entries(p.customizations).map(([k, v]) => (
                                  <li key={k}>
                                    <strong>{k}:</strong>{" "}
                                    {Array.isArray(v) ? v.join(", ") : String(v)}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                      </Td>
                      <Td>{p.quantity}</Td>
                      <Td>{formatBase(p.price)}</Td>
                      <Td>
                        {formatBase((Number(p.price) || 0) * (p.quantity || 1))}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            </div>
            {(detail.prescriptions || []).some((f) => assetKind(f) === "facePhoto") && (
              <div>
                <h4 className="font-bold mb-2">Face measurements</h4>
                <div className="space-y-2">
                  {(detail.prescriptions || [])
                    .filter((f) => assetKind(f) === "facePhoto")
                    .map((f, i) => (
                      <div
                        key={i}
                        className="border border-border rounded-lg p-3 flex flex-col md:flex-row gap-3"
                      >
                        {f.file && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fileHref(f.file)}
                            alt=""
                            className="h-24 w-20 object-cover rounded border border-border shrink-0"
                          />
                        )}
                        <div className="flex-1">
                          <FaceMetricGrid metrics={f.metrics} />
                          <div className="mt-2 flex gap-3 text-xs">
                            {f.file && (
                              <a
                                href={fileHref(f.file)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary"
                              >
                                Open face photo
                              </a>
                            )}
                            {(() => {
                              const sheet = (detail.prescriptions || []).find(
                                (s) => assetKind(s) === "faceSheet" && s.itemId === f.itemId
                              );
                              return sheet?.file ? (
                                <a
                                  href={fileHref(sheet)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary"
                                >
                                  Open A4 sheet
                                </a>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div>
              <h4 className="font-bold mb-1">Customer & Shipping</h4>
              <div className="text-text-secondary">
                {detail.customerName && <div>Name: {detail.customerName}</div>}
                {detail.address?.line1 && (
                  <div>
                    {[detail.address.line1, detail.address.line2]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
                {(detail.address?.city || detail.address?.postal_code) && (
                  <div>
                    {[detail.address.postal_code, detail.address.city]
                      .filter(Boolean)
                      .join(" ")}
                    {detail.address.state ? `, ${detail.address.state}` : ""}
                  </div>
                )}
                {detail.address?.country && <div>{detail.address.country}</div>}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Assets modal */}
      <Modal
        open={!!assets}
        onClose={() => setAssets(null)}
        title="Order Assets"
        wide
      >
        {assets && (
          <div className="space-y-5">
            <div>
              <h4 className="font-bold mb-2">Face measurements</h4>
              {assetPhotos.length ? (
                <div className="space-y-3">
                  {assetPhotos.map((f, i) => {
                    const sheet = sheetOf(f);
                    return (
                      <div
                        key={i}
                        className="flex flex-col md:flex-row gap-4 border border-border rounded-xl p-3"
                      >
                        <div className="w-full md:w-40 shrink-0">
                          {f.file ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={fileHref(f)}
                              alt="Face"
                              className="h-32 w-full md:w-40 object-cover rounded-lg border border-border"
                            />
                          ) : (
                            <div className="h-32 w-full md:w-40 rounded-lg border border-border grid place-items-center text-xs text-text-muted">
                              No image
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            {f.file && (
                              <a
                                href={fileHref(f)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary"
                              >
                                Open photo
                              </a>
                            )}
                            {sheet?.file && (
                              <a
                                href={fileHref(sheet)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary"
                              >
                                Open A4 sheet
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <FaceMetricGrid metrics={f.metrics} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-text-muted text-sm">
                  No face photo on this order.
                </span>
              )}
            </div>

            <div>
              <h4 className="font-bold mb-2">Face sheets (A4)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {assetSheets.map((f, i) => {
                  const url = fileHref(f);
                  return (
                    <div key={i} className="border border-border rounded-lg p-2 text-center">
                      <div className="text-xs break-all">
                        {url.split("/").pop() || "sheet.pdf"}
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary"
                      >
                        Open A4 sheet
                      </a>
                    </div>
                  );
                })}
                {!assetSheets.length && (
                  <span className="text-text-muted text-sm">No sheet</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-bold mb-2">Prescriptions</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {assetDocs.map((f, i) => {
                  const url = fileHref(f);
                  const isPdf = /\.pdf(\?|#|$)/i.test(url);
                  return (
                    <div key={i} className="border border-border rounded-lg p-2 text-center">
                      {isPdf ? (
                        <div className="text-xs break-all">{url.split("/").pop()}</div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="h-24 w-full object-cover rounded" />
                      )}
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary"
                      >
                        Open / Download
                      </a>
                    </div>
                  );
                })}
                {!assetDocs.length && (
                  <span className="text-text-muted text-sm">No files</span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </SuperAdminLayout>
  );
}
