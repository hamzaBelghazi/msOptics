"use client";
// Payments & sign-in configuration, all stored in the database — no env vars.
// Secrets are write-only: the page never receives them back, blank fields keep
// whatever is stored.
import { useEffect, useState } from "react";
import SuperAdminLayout from "@/Components/superAdmin/SuperAdminLayout";
import { PageHeader, Card, btnPrimary, btnGhost, inputCls, labelCls } from "@/Components/superAdmin/ui";
import { adminApi } from "@/Api/adminApi";
import { useToast } from "@/Components/Context/ToastContext";
import {
  Wallet,
  CreditCard,
  BadgeDollarSign,
  Banknote,
  KeyRound,
  Save,
  Loader2,
  Check,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

const ON_PILL = "bg-emerald-100 text-emerald-700";
const OFF_PILL = "bg-text-muted/10 text-text-secondary";

// a switch styled like the rest of the dashboard
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
      {label || (on ? "Live" : "Off")}
    </span>
  );
}

function SectionTitle({ icon: Icon, title, hint }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-primary" />
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-text-primary">
          {title}
        </h3>
      </div>
      {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type, hint }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputCls}
      />
      {hint && <p className="mt-1 text-[11px] text-text-muted leading-snug">{hint}</p>}
    </div>
  );
}

function SecretField({ label, value, onChange, isSet, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className={labelCls}>{label}</label>
        {isSet && (
          <span className="mb-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            Stored
          </span>
        )}
      </div>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? "••••••••  —  leave blank to keep the saved value" : "Not set yet"}
        autoComplete="off"
        className={inputCls}
      />
      {hint && <p className="mt-1 text-[11px] text-text-muted leading-snug">{hint}</p>}
    </div>
  );
}

function Warning({ children }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium leading-snug text-amber-700">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const PAY_CARDS = [
  {
    key: "stripe",
    title: "Stripe",
    desc: "Cards, Apple Pay, Google Pay, iDEAL and Bancontact.",
    icon: CreditCard,
    tint: "bg-indigo-500/10 text-indigo-500",
    fields: [
      { name: "publishableKey", label: "Publishable key", secret: false },
      { name: "secretKey", label: "Secret key", secret: true, setFlag: "secretKeySet" },
      { name: "webhookSecret", label: "Webhook signing secret", secret: true, setFlag: "webhookSecretSet" },
    ],
  },
  {
    key: "paypal",
    title: "PayPal",
    desc: "Redirect flow — the shopper approves on PayPal and comes back.",
    icon: Wallet,
    tint: "bg-sky-500/10 text-sky-500",
    fields: [
      { name: "clientId", label: "Client ID", secret: false },
      { name: "clientSecret", label: "Client secret", secret: true, setFlag: "clientSecretSet" },
    ],
  },
  {
    key: "cod",
    title: "Cash on delivery",
    desc: "Cash is collected by the courier. Orders start as pending.",
    icon: Banknote,
    tint: "bg-amber-500/10 text-amber-600",
    span2: true,
    fields: [],
  },
];

export default function SuperAdminPayments() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [s, setS] = useState(null);

  const load = async (silent) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminApi.settings.get();
      setS(data);
      setDirty(false);
    } catch {
      addToast("Could not load the settings", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="grid place-items-center py-24">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      </SuperAdminLayout>
    );
  }
  if (!s) {
    return (
      <SuperAdminLayout>
        <p className="text-text-secondary p-6">Settings could not be loaded.</p>
      </SuperAdminLayout>
    );
  }

  const patch = (path, value) => {
    setDirty(true);
    setS((cur) => {
      const next = JSON.parse(JSON.stringify(cur));
      const parts = path.split(".");
      let node = next;
      for (let i = 0; i < parts.length - 1; i++) node = node[parts[i]];
      node[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      // the settings doc is the whole truth; masked secret fields are blank
      await adminApi.settings.update(s);
      addToast("Settings saved — live immediately, no restart needed.", "success");
      await load(true);
    } catch (e) {
      addToast(e?.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const payments = s.payments || {};
  const methods = [
    { key: "stripe", label: "Card", icon: CreditCard },
    { key: "paypal", label: "PayPal", icon: Wallet },
    { key: "cod", label: "Cash on delivery", icon: Banknote },
  ].map((m) => ({ ...m, on: !!payments[m.key]?.enabled }));
  const enabledCount = methods.filter((m) => m.on).length;

  return (
    <SuperAdminLayout>
      <PageHeader
        title="Payments & Sign-in"
        subtitle="Everything below is stored in the database and takes effect immediately — no env vars, no restarts."
        action={
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={() => load()}
                disabled={saving}
                className={btnGhost}
              >
                <RotateCcw size={14} />
                Discard
              </button>
            )}
            <button onClick={save} disabled={saving} className={btnPrimary}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save changes
            </button>
          </div>
        }
      />

      {/* live summary of what the storefront will offer */}
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-card-background shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-gold/10" />
        <div className="relative flex flex-wrap items-center gap-4 p-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-sm">
            <Wallet size={22} />
          </span>
          <div className="mr-auto min-w-[190px]">
            <p className="text-sm font-bold text-text-primary">Storefront checkout</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Shoppers only see the methods switched on here. At least one must stay enabled.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <span
                  key={m.key}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    m.on
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-text-muted"
                  }`}
                >
                  <Icon size={13} />
                  {m.label}
                  {m.on && <Check size={12} />}
                </span>
              );
            })}
          </div>
        </div>
        {enabledCount === 0 && (
          <div className="relative px-5 pb-4">
            <Warning>No payment method is enabled — checkout will refuse every order. Turn one on below.</Warning>
          </div>
        )}
      </div>

      <div className="space-y-8">
        <section>
          <SectionTitle
            icon={CreditCard}
            title="Payment methods"
            hint={`${enabledCount} of ${methods.length} live`}
          />
          <div className="grid gap-5 md:grid-cols-2">
            {PAY_CARDS.map((card) => {
              const Icon = card.icon;
              const sec = payments[card.key] || {};
              const on = !!sec.enabled;
              const missingCredentials =
                on &&
                ((card.key === "stripe" && !sec.secretKeySet) ||
                  (card.key === "paypal" && (!sec.clientId || !sec.clientSecretSet)));
              const missingPublicKey = card.key === "stripe" && on && !sec.publishableKey;
              return (
                <Card
                  key={card.key}
                  className={`${card.span2 ? "md:col-span-2" : ""} transition-shadow ${
                    on ? "ring-1 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 border-b border-border bg-background/40 px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${card.tint}`}>
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold leading-tight text-text-primary">
                          {card.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{card.desc}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden sm:block">
                        <StatusPill on={on} />
                      </span>
                      <Toggle
                        checked={on}
                        onChange={(v) => patch(`payments.${card.key}.enabled`, v)}
                        label={undefined}
                      />
                    </div>
                  </div>

                  <div className="space-y-3.5 px-5 py-4">
                    {!on && (
                      <p className="text-[11px] font-medium text-text-muted">
                        Switched off — this method is hidden at checkout.
                      </p>
                    )}
                    {missingCredentials && (
                      <Warning>
                        Enabled but a secret is missing — checkout will refuse this method until it is saved.
                      </Warning>
                    )}
                    {missingPublicKey && (
                      <Warning>
                        Add the publishable key, otherwise the card form cannot load for shoppers.
                      </Warning>
                    )}

                    {card.fields.map((f) =>
                      f.secret ? (
                        <SecretField
                          key={f.name}
                          label={f.label}
                          value={sec[f.name] || ""}
                          onChange={(v) => patch(`payments.${card.key}.${f.name}`, v)}
                          isSet={sec[f.setFlag]}
                          hint={f.name === "webhookSecret" ? "Used to verify Stripe webhook events." : undefined}
                        />
                      ) : (
                        <TextField
                          key={f.name}
                          label={f.label}
                          value={sec[f.name] || ""}
                          onChange={(v) => patch(`payments.${card.key}.${f.name}`, v)}
                          hint={f.name === "clientId" ? "Public — also used by the PayPal button." : undefined}
                        />
                      )
                    )}

                    {card.key === "paypal" && (
                      <div>
                        <label className={labelCls}>Mode</label>
                        <select
                          value={sec.mode || "sandbox"}
                          onChange={(e) => patch("payments.paypal.mode", e.target.value)}
                          className={inputCls}
                        >
                          <option value="sandbox">Sandbox (test payments)</option>
                          <option value="live">Live (real money)</option>
                        </select>
                      </div>
                    )}

                    {card.key === "cod" && (
                      <div className="grid gap-3.5 sm:grid-cols-2">
                        <TextField
                          label="Maximum order total (EUR, 0 = no limit)"
                          type="number"
                          value={sec.maxAmount ?? 0}
                          onChange={(e) => patch("payments.cod.maxAmount", Number(e) || 0)}
                        />
                        <TextField
                          label="Note shown at checkout"
                          value={sec.note || ""}
                          onChange={(v) => patch("payments.cod.note", v)}
                          placeholder="Pay in cash when your order is delivered."
                        />
                      </div>
                    )}

                    {card.key === "cod" && (
                      <p className="text-[11px] leading-snug text-text-muted">
                        COD orders are created with status <em>pending</em> and move through the
                        normal Orders workflow — mark them shipped, then delivered once the cash is
                        collected.
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle icon={KeyRound} title="Sign-in" hint="Google OAuth is configured here too" />
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between gap-3 border-b border-border bg-background/40 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
                    <KeyRound size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold leading-tight text-text-primary">
                      Google sign-in
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
                      One Tap and the login button on the storefront.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden sm:block">
                    <StatusPill on={!!s.googleAuth?.enabled} />
                  </span>
                  <Toggle
                    checked={!!s.googleAuth?.enabled}
                    onChange={(v) => patch("googleAuth.enabled", v)}
                  />
                </div>
              </div>
              <div className="space-y-3.5 px-5 py-4">
                {s.googleAuth?.enabled && (!s.googleAuth?.clientId || !s.googleAuth?.clientSecretSet) && (
                  <Warning>Google sign-in is enabled but the client credentials are incomplete.</Warning>
                )}
                <TextField
                  label="Client ID (public, used by the storefront)"
                  value={s.googleAuth?.clientId || ""}
                  onChange={(v) => patch("googleAuth.clientId", v)}
                  placeholder="xxxxx.apps.googleusercontent.com"
                />
                <SecretField
                  label="Client secret"
                  value={s.googleAuth?.clientSecret || ""}
                  onChange={(v) => patch("googleAuth.clientSecret", v)}
                  isSet={s.googleAuth?.clientSecretSet}
                />
                <Toggle
                  checked={!!s.googleAuth?.oneTap}
                  onChange={(v) => patch("googleAuth.oneTap", v)}
                  label="Google One Tap prompt"
                />
                <p className="text-[11px] leading-snug text-text-muted">
                  Authorised redirect URI in Google Cloud Console:
                  <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-text-secondary">
                    /auth/google/callback
                  </code>
                  on this API origin.
                </p>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3 px-5 py-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <BadgeDollarSign size={18} />
                </span>
                <div className="text-xs leading-relaxed text-text-secondary">
                  <p className="mb-1 text-sm font-semibold text-text-primary">How the storefront behaves</p>
                  <p>
                    Shoppers only ever see the methods enabled above. Disabling a method hides it at
                    checkout immediately; at least one method must stay enabled. Card totals are still
                    charged in EUR — the currency switcher is display-only.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    <li className="flex items-start gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Secrets are write-only — a blank field keeps the stored value.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Saving applies instantly, no restart needed.
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                      Test orders are safe; nothing is charged while in sandbox mode.
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>

      {/* floating save bar while there are unsaved edits */}
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
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save
          </button>
        </div>
      )}
    </SuperAdminLayout>
  );
}
