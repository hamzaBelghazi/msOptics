import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { Cookie, ShieldCheck, X, ChevronDown } from "lucide-react";
import { getConsent, setConsent, onConsentOpen } from "@/lib/consent";

const ROWS = [
  { key: "necessary", locked: true },
  { key: "preferences", locked: false },
  { key: "analytics", locked: false },
  { key: "marketing", locked: false },
];

function Toggle({ on, locked, onFlip, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={locked}
      onClick={onFlip}
      className={`relative w-12 h-7 rounded-full shrink-0 transition-colors duration-300 ${
        on ? "bg-gradient-to-r from-primary to-gold" : "bg-text-muted/30"
      } ${locked ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${
          on ? (typeof document !== "undefined" && document.documentElement.dir === "rtl" ? "left-1" : "right-1") : "left-1"
        }`}
      />
    </button>
  );
}

export default function CookieConsent() {
  const { t, i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [prefs, setPrefs] = useState({ preferences: true, analytics: true, marketing: true });
  const cardRef = useRef(null);

  useEffect(() => {
    const c = getConsent();
    if (!c.decided) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => onConsentOpen(() => {
    const c = getConsent();
    setPrefs({ preferences: c.preferences, analytics: c.analytics, marketing: c.marketing });
    setCustomizing(true);
    setVisible(true);
  }), []);

  useEffect(() => {
    if (!visible || !cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 60, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "power3.out" }
    );
  }, [visible]);

  if (!visible) return null;

  const acceptAll = () => {
    setConsent({ preferences: true, analytics: true, marketing: true });
    setVisible(false);
  };
  const rejectAll = () => {
    setConsent({ preferences: false, analytics: false, marketing: false });
    setVisible(false);
  };
  const saveCustom = () => {
    setConsent(prefs);
    setVisible(false);
    setCustomizing(false);
  };

  const dir = i18n.dir();

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-3 sm:px-6 sm:pb-6 flex justify-center pointer-events-none"
      dir={dir}
      role="dialog"
      aria-live="polite"
      aria-label={t("cookies.banner.title", "Cookie preferences")}
    >
      <div
        ref={cardRef}
        className="pointer-events-auto w-full max-w-3xl glass-strong rounded-[1.6rem] shadow-2xl border border-white/20 overflow-hidden"
      >
        {/* gold top line */}
        <div className="h-[3px] bg-gradient-to-r from-primary via-gold to-primary" />
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-gold text-white shrink-0 shadow">
              <Cookie size={22} />
            </span>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-lg text-text-primary leading-snug">
                {t("cookies.banner.title", "We value your privacy")}
              </h3>
              <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                {t(
                  "cookies.banner.body",
                  "We use cookies to run the shop, remember your preferences, measure traffic and — with your permission — personalize marketing. Choose what you're comfortable with."
                )}{" "}
                <Link href="/inside/cookies" className="font-semibold text-primary hover:underline whitespace-nowrap">
                  {t("cookies.banner.policy", "Cookie policy")}
                </Link>
              </p>
            </div>
          </div>

          {/* customize panel */}
          {customizing && (
            <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 divide-y divide-border/60 overflow-hidden">
              {ROWS.map(({ key, locked }) => (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <Toggle
                    on={key === "necessary" ? true : !!prefs[key]}
                    locked={locked}
                    label={key}
                    onFlip={() => setPrefs((p) => ({ ...p, [key]: !p[key] }))}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary flex items-center gap-2">
                      {t(`cookies.banner.cat_${key}`, key)}
                      {locked && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 rounded-full px-2 py-0.5">
                          {t("cookies.banner.always_on", "Always on")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                      {t(`cookies.banner.cat_${key}_desc`, "")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mt-4">
            <button onClick={acceptAll} className="btn-luxe flex-1 !py-3 text-sm">
              <ShieldCheck size={16} />
              {t("cookies.banner.accept", "Accept all")}
            </button>
            <button onClick={rejectAll} className="btn-glass flex-1 !py-3 text-sm">
              <X size={15} />
              {t("cookies.banner.reject", "Reject optional")}
            </button>
            {customizing ? (
              <button onClick={saveCustom} className="btn-glass flex-1 !py-3 text-sm !border-primary/40">
                {t("cookies.banner.save", "Save my choices")}
              </button>
            ) : (
              <button
                onClick={() => setCustomizing(true)}
                className="flex items-center justify-center gap-1 text-sm font-semibold text-text-secondary hover:text-primary px-3 py-3 transition-colors"
              >
                {t("cookies.banner.customize", "Customize")}
                <ChevronDown size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
