import { inputCls, labelCls } from "./ui";

const LANGS = [
  { code: "en", name: "EN" },
  { code: "de", name: "DE" },
  { code: "ar", name: "AR" },
];

// Trilingual text editor bound to a { en, de, ar } object.
// Falls back to the default-language value when a translation is empty at display time.
export default function TrilingualField({
  label,
  value,
  onChange,
  textarea = false,
  rows = 3,
  placeholder,
}) {
  const v = value || {};
  const set = (code, text) => onChange({ ...v, [code]: text });
  return (
    <div>
      {label && <span className={labelCls}>{label} — EN / DE / AR</span>}
      <div className="grid grid-cols-1 gap-2">
        {LANGS.map(({ code, name }) => (
          <div key={code} className="flex gap-2 items-start">
            <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary text-[11px] font-extrabold">
              {name}
            </span>
            {textarea ? (
              <textarea
                value={v[code] || ""}
                onChange={(e) => set(code, e.target.value)}
                rows={rows}
                dir={code === "ar" ? "rtl" : "ltr"}
                placeholder={placeholder ? `${placeholder} (${name})` : `${name} version (optional — falls back to default)`}
                className={inputCls}
              />
            ) : (
              <input
                value={v[code] || ""}
                onChange={(e) => set(code, e.target.value)}
                dir={code === "ar" ? "rtl" : "ltr"}
                placeholder={placeholder ? `${placeholder} (${name})` : `${name} version (optional)`}
                className={inputCls}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Append a { en, de, ar } object to FormData as key[en], key[de], key[ar]
export function appendTranslations(fd, key, obj) {
  if (!obj) return;
  ["en", "de", "ar"].forEach((L) => {
    if (obj[L]) fd.append(`${key}[${L}]`, obj[L]);
  });
}
