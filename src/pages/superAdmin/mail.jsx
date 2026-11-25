"use client";
// Outgoing mail for the shop: order confirmations for buyers and a copy for
// the shop. Everything lives in the settings document — no env vars, no
// restarts — and a missing or broken mailbox never blocks a checkout.
import { useEffect, useState } from "react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import { PageHeader, Card, btnPrimary, btnGhost, inputCls, labelCls, Spinner } from "@/Components/superAdmin/ui";
import { adminApi } from "@/Api/adminApi";
import { useToast } from "@/Components/Context/ToastContext";
import { MAIL_PRESETS, PRESET_GROUPS, presetById } from "@/Components/superAdmin/mailPresets";
import {
  Mail,
  Save,
  RotateCcw,
  Send,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShoppingBag,
  Store,
  Eye,
  ServerCog,
  AtSign,
} from "lucide-react";

const ON_PILL = "bg-emerald-100 text-emerald-700";
const OFF_PILL = "bg-text-muted/10 text-text-secondary";

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
      aria-pressed={checked}
      aria-label={label || "toggle"}
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-input-border/60"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
      {label && <span className="text-sm text-text-secondary">{label}</span>}
    </button>
  );
}

function StatusPill({ on, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
        on ? ON_PILL : OFF_PILL
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-text-muted"}`} />
      {label || (on ? "On" : "Off")}
    </span>
  );
}

function SectionTitle({ icon: Icon, title, hint }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-primary">{title}</h3>
      </div>
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type, hint, disabled }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={inputCls + (disabled ? " opacity-60" : "")}
      />
      {hint && <p className="mt-1 text-[11px] leading-snug text-text-muted">{hint}</p>}
    </div>
  );
}

const isReady = (mail) =>
  Boolean(mail?.enabled && mail?.host && (mail?.fromEmail || mail?.user));

export default function SuperAdminMail() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [s, setS] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [preview, setPreview] = useState({ customer: "", admin: "" });
  const [previewTab, setPreviewTab] = useState("customer");

  const load = async (silent) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminApi.settings.get();
      setS(data);
      setDirty(false);
      setTestTo((cur) => cur || data?.mail?.adminEmail || data?.mail?.fromEmail || "");
    } catch {
      addToast("Could not load the email settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (audience) => {
    try {
      const data = await adminApi.settings.mailPreview(audience);
      if (data?.html) setPreview((cur) => ({ ...cur, [audience]: data.html }));
    } catch {
      // the preview is decoration; ignore failures
    }
  };

  useEffect(() => {
    load();
    loadPreview("customer");
    loadPreview("admin");
  }, []);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="grid place-items-center py-24">
          <Spinner size={28} className="text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }
  if (!s) {
    return (
      <SuperAdminLayout>
        <p className="p-6 text-text-secondary">The settings could not be loaded.</p>
      </SuperAdminLayout>
    );
  }

  const mail = s.mail || {};
  const ready = isReady(mail);
  const preset = presetById(mail.provider);

  const patch = (key, value) => {
    setDirty(true);
    setS((cur) => ({ ...cur, mail: { ...cur.mail, [key]: value } }));
  };

  const applyPreset = (id) => {
    const next = presetById(id);
    setDirty(true);
    setS((cur) => ({
      ...cur,
      mail: {
        ...cur.mail,
        provider: next.id,
        host: next.host,
        port: next.port,
        secure: next.secure,
        user: next.user || cur.mail?.user || "",
      },
    }));
  };

  const save = async () => {
    if (mail.enabled && !mail.host) {
      addToast("Add the SMTP host before switching email on", "error");
      return;
    }
    setSaving(true);
    try {
      await adminApi.settings.update(s);
      addToast("Email settings saved — they apply immediately.", "success");
      await load(true);
      loadPreview(previewTab);
    } catch (e) {
      addToast(e?.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await adminApi.settings.mailTest(testTo, mail);
      setTestResult({ ok: true, message: res?.message || "Test email sent." });
    } catch (e) {
      setTestResult({
        ok: false,
        message: e?.response?.data?.message || "The test email could not be sent.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <SuperAdminLayout>
      <PageHeader
title="Email notifications"
subtitle="Order confirmations for buyers and a copy for the shop. Stored in the database and applied instantly."
        action={
          <div className="flex items-center gap-2">
            {dirty && (
              <button type="button" onClick={() => load()} disabled={saving} className={btnGhost}>
                <RotateCcw size={14} />
                Discard
              </button>
            )}
            <button onClick={save} disabled={saving} className={btnPrimary}>
              {saving ? <Spinner size={15} /> : <Save size={15} />}
              Save changes
            </button>
          </div>
        }
      />

      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-card-background shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-gold/10" />
        <div className="relative flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
            <Mail size={22} />
          </span>
          <div className="mr-auto min-w-[200px]">
            <p className="text-sm font-bold text-text-primary">New order emails</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {ready
                ? "Every new order emails the buyer and the shop."
                : mail.enabled
                ? "Switched on, but the SMTP details are incomplete."
                : "Switched off — orders are still placed normally, no email is sent."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill on={!!mail.enabled} label={mail.enabled ? "Enabled" : "Off"} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <ShoppingBag size={13} /> Buyer copy
              {mail.notifyCustomer ? <CheckCircle2 size={12} className="text-emerald-600" /> : null}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-text-secondary">
              <Store size={13} /> Shop copy
              {mail.notifyAdmin ? <CheckCircle2 size={12} className="text-emerald-600" /> : null}
            </span>
          </div>
        </div>
        {!ready && (
          <div className="relative px-5 pb-4">
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium leading-snug text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                Checkout never waits for mail. With email off or a server that cannot be reached, orders
                still go through and the failure is only written to the server log.
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="space-y-8">
        <section>
          <SectionTitle icon={ServerCog} title="SMTP server" hint="pick a provider, then fine-tune" />
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/40 px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-semibold leading-tight text-text-primary">Send email through</h3>
                <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                  {preset.label}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill on={!!mail.enabled} />
                <Toggle checked={!!mail.enabled} onChange={(v) => patch("enabled", v)} />
              </div>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className={labelCls}>Provider preset</label>
                <select
                  value={mail.provider || "custom"}
                  onChange={(e) => applyPreset(e.target.value)}
                  className={inputCls}
                >
                  {PRESET_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-text-muted">
                  <Eye size={12} className="mt-0.5 shrink-0" />
                  <span>{preset.note}</span>
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <TextField
                  label="SMTP host"
                  value={mail.host || ""}
                  onChange={(v) => patch("host", v)}
                  placeholder="smtp.yourprovider.com"
                />
                <TextField
                  label="Port"
                  type="number"
                  value={mail.port ?? 587}
                  onChange={(v) => patch("port", Number(v) || 0)}
                  hint="465 with TLS below, 587 for STARTTLS."
                />
              </div>

              <div className="rounded-xl border border-border bg-background/50 px-3.5 py-3">
                <Toggle
                  checked={!!mail.secure}
                  onChange={(v) => patch("secure", v)}
                  label="TLS from the first byte (port 465)"
                />
                <p className="mt-1 text-[11px] leading-snug text-text-muted">
                  Leave this off for port 587 — the connection is upgraded with STARTTLS automatically.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <TextField
                  label="Username"
                  value={mail.user || ""}
                  onChange={(v) => patch("user", v)}
                  placeholder="you@yourdomain.com"
                  hint="Usually the full mailbox address."
                />
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className={labelCls}>Password / API key</label>
                    {mail.passSet && (
                      <span className="mb-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        Stored
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={mail.pass || ""}
                    onChange={(e) => patch("pass", e.target.value)}
                    placeholder={mail.passSet ? "••••••••  —  leave blank to keep it" : "Not set yet"}
                    autoComplete="off"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <SectionTitle icon={AtSign} title="Sender & recipients" hint="what the buyer sees in their inbox" />
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <div className="space-y-3.5 px-5 py-5">
                <TextField
                  label="Sender name"
                  value={mail.fromName || ""}
                  onChange={(v) => patch("fromName", v)}
                  placeholder="MHS Optics"
                />
                <TextField
                  label="Sender email"
                  value={mail.fromEmail || ""}
                  onChange={(v) => patch("fromEmail", v)}
                  placeholder="orders@yourdomain.com"
                  hint="Most providers only let you send from an address on their domain."
                />
                <TextField
                  label="Reply-to (optional)"
                  value={mail.replyTo || ""}
                  onChange={(v) => patch("replyTo", v)}
                  placeholder="support@yourdomain.com"
                  hint="Buyer replies go here instead of the sender address."
                />
              </div>
            </Card>

            <Card>
              <div className="space-y-4 px-5 py-5">
                <TextField
                  label="Shop notifications go to"
                  value={mail.adminEmail || ""}
                  onChange={(v) => patch("adminEmail", v)}
                  placeholder="owner@yourdomain.com"
                  hint="Leave blank to use the sender address."
                />
                <div className="rounded-xl border border-border bg-background/50 px-3.5 py-3">
                  <Toggle
                    checked={!!mail.notifyCustomer}
                    onChange={(v) => patch("notifyCustomer", v)}
                    label="Email the buyer their confirmation"
                  />
                  <p className="mt-1 text-[11px] leading-snug text-text-muted">
                    Sent to the address on their account, with the items, total and delivery address.
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/50 px-3.5 py-3">
                  <Toggle
                    checked={!!mail.notifyAdmin}
                    onChange={(v) => patch("notifyAdmin", v)}
                    label="Email the shop a copy"
                  />
                  <p className="mt-1 text-[11px] leading-snug text-text-muted">
                    Replies from the shop copy go straight back to the buyer.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <SectionTitle icon={Send} title="Test & preview" hint="no order needed" />
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <div className="space-y-3.5 px-5 py-5">
                <div>
                  <label className={labelCls}>Send a test email to</label>
                  <input
                    type="email"
                    value={testTo}
                    onChange={(e) => setTestTo(e.target.value)}
                    placeholder="you@yourdomain.com"
                    autoComplete="off"
                    className={inputCls}
                  />
                  <p className="mt-1 text-[11px] leading-snug text-text-muted">
                    Uses the values currently on screen, so unsaved changes can be tried first.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={sendTest}
                  disabled={testing || !testTo}
                  className={btnPrimary}
                >
                  {testing ? <Spinner size={15} /> : <Send size={15} />}
                  {testing ? "Sending…" : "Send test email"}
                </button>
                {testResult && (
                  <p
                    className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium leading-snug ${
                      testResult.ok
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </p>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3 px-5 py-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck size={18} />
                </span>
                <div className="text-xs leading-relaxed text-text-secondary">
                  <p className="mb-1 text-sm font-semibold text-text-primary">Checkout is never blocked by mail</p>
                  <p>
                    Order emails are sent after the order is saved. A missing SMTP setup, a wrong
                    password or an unreachable server only writes a line to the server log — the
                    buyer sees the normal confirmation and the order lands in Orders as always.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Card, PayPal and cash-on-delivery orders all send the same summary.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      The password is write-only — a blank field keeps the stored one.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Saving applies instantly, no restart needed.
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <SectionTitle icon={Eye} title="What the email looks like" hint="rendered with a sample order" />
          <Card>
            <div className="flex items-center gap-1.5 border-b border-border bg-background/40 px-4 py-2.5">
              {[
                { key: "customer", label: "Buyer confirmation" },
                { key: "admin", label: "Shop notification" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPreviewTab(tab.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    previewTab === tab.key
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:bg-background hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadPreview(previewTab)}
                className="ml-auto text-[11px] font-semibold text-text-muted hover:text-text-primary"
              >
                Refresh
              </button>
            </div>
            <div className="bg-background p-3">
              {preview[previewTab] ? (
                <iframe
                  title="Email preview"
                  srcDoc={preview[previewTab]}
                  className="h-[560px] w-full rounded-lg border border-border bg-white"
                />
              ) : (
                <div className="grid h-[240px] place-items-center text-xs text-text-muted">
                  Preview unavailable
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>

      {dirty && (
        <div className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card-background/95 px-4 py-2 shadow-lg backdrop-blur">
          <span className="text-xs font-medium text-text-secondary">Unsaved changes</span>
          <button
            type="button"
            onClick={() => load()}
            className="text-xs font-semibold text-text-muted hover:text-text-primary"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? <Spinner size={13} /> : <Save size={13} />}
            Save
          </button>
        </div>
      )}
    </SuperAdminLayout>
  );
}