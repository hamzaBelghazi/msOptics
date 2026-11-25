// Resolve a translatable entity field by UI language.
// entity: { title, titleTranslations: { en, de, ar } }, base: "title", lang: "de"
// Falls back to EN translation, then to the default-language field.
export function langCode(lng) {
  const l = String(lng || "en").toLowerCase();
  if (l.startsWith("ar")) return "ar";
  if (l.startsWith("de") || l.startsWith("du")) return "de";
  return "en";
}

export function tField(entity, base, lang) {
  if (!entity) return "";
  const tr = entity[`${base}Translations`];
  const l = langCode(lang);
  if (tr && typeof tr === "object") {
    if (tr[l]) return tr[l];
    if (tr.en) return tr.en;
  }
  const v = entity[base];
  return typeof v === "string" ? v : v ?? "";
}
