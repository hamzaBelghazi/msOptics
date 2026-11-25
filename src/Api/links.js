// One place that decides what a public URL looks like.
//
// Products, categories and collections all carry a `slug` now; the _id stays as
// a fallback so nothing breaks while older cached payloads are still around.

const pick = (doc, kind) => {
  if (!doc) return "";
  const slug = doc.slug ? String(doc.slug) : "";
  const id = doc._id || doc.id || "";
  return slug || id;
};

export const productHref = (product) => `/product/${pick(product)}`;
export const categoryHref = (category) => `/category/${pick(category)}`;
export const collectionHref = (collection) => `/collections/${pick(collection)}`;

// A ref that may be either a slug or a 24-char ObjectId (e.g. a category id
// stored on a product): prefer it as-is.
export const refHref = (base, ref, slug) => `${base}/${slug || ref || ""}`;
