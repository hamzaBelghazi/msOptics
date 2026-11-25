import { SERVER_URL } from "@/Api/adminApi";

export const isExternal = (url) => /^https?:\/\//i.test(url || "");

// Pick translated label with graceful fallback
export const menuLabel = (item, lang) => {
  if (!item) return "";
  const l = (lang || "en").toLowerCase();
  const short = l.startsWith("ar") ? "ar" : l.startsWith("de") ? "de" : "en";
  return (
    item.labels?.[short] ||
    item.labels?.en ||
    item.label ||
    item.heading ||
    item.headings?.[short] ||
    item.headings?.en ||
    ""
  );
};

// Bare menu image filenames live in /img/menus; resolved thumbs are full /img/... paths
export const menuImage = (file) => {
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  const clean = String(file).replace(/^\/+/, "");
  if (clean.startsWith("img/")) return `${SERVER_URL}/${clean}`;
  return `${SERVER_URL}/img/menus/${clean}`;
};

// Child/link thumbnail: explicit image first, then resolved entity image
export const linkThumb = (link) => {
  if (link?.image) return menuImage(link.image);
  if (link?.resolved?.image) return menuImage(link.resolved.image);
  return "";
};

export const linkUrl = (link) => link?.url || link?.resolved?.url || "#";
