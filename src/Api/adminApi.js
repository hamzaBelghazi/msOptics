import api from "./axiosConfig";

// Base URL of the API server (without /api suffix)
export const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://127.0.0.1:5000";

export const imgUrl = (folder, file) => {
  if (!file) return "";
  if (/^https?:\/\//i.test(file)) return file;
  const clean = String(file).replace(/^\/+/, "");
  if (clean.startsWith("img/")) return `${SERVER_URL}/${clean}`;
  return `${SERVER_URL}/img/${folder}/${clean}`;
};

// Normalize the different list response shapes used by the backend:
// - handlerFactory.getAll -> { data: { data: [...] , totalRecord } }
// - accessoryController   -> { success, data: [...] }
// - plain arrays
export const toList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.data?.data)) return d.data.data;
  return [];
};

// "attachment; filename=\"mhs-orders-2026-11-25.csv\"" -> mhs-orders-...
export const filenameFrom = (headers) => {
  const disposition = headers?.["content-disposition"] || "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  return match ? match[1] : "";
};

export const toOne = (res) => {
  const d = res?.data;
  return d?.data?.data || d?.data || d || null;
};

const withMultipart = {
  headers: { "Content-Type": "multipart/form-data" },
};

export const adminApi = {
  stats: () => api.get("/admin/stats").then((r) => r.data?.data),

  products: {
    list: (params) => api.get("/products", { params }).then(toList),
    get: (id) => api.get(`/products/${id}`).then(toOne),
    create: (formData) => api.post("/products", formData, withMultipart),
    update: (id, formData) =>
      api.patch(`/products/${id}`, formData, withMultipart),
    remove: (id) => api.delete(`/products/${id}`),
    uploadTryOn: (id, formData) =>
      api.post(`/products/${id}/tryon`, formData, withMultipart).then((r) => r.data),
    updateTryOnCalibration: (id, calibration) =>
      api
        .post(`/products/${id}/tryon`, { calibration: JSON.stringify(calibration) })
        .then((r) => r.data),
  },

  orders: {
    list: (params) => api.get("/orders", { params }).then(toList),
    get: (id) => api.get(`/orders/${id}`).then(toOne),
    update: (id, body) => api.patch(`/orders/${id}`, body).then((r) => r.data),
    cancel: (id) => api.patch(`/orders/${id}/admin-cancel`).then((r) => r.data),
    remove: (id) => api.delete(`/orders/${id}/admin`),
    // background ping for the sidebar badge: no loading bar, no error toasts
    pendingCount: () =>
      api
        .get("/orders/admin/pending-count", { silent: true })
        .then((r) => Number(r.data?.data?.count) || 0),
    // returns the file as a blob; the filters mirror the table on screen
    export: (format, params = {}) =>
      api
        .get("/orders/admin/export", {
          params: { ...params, format },
          responseType: "blob",
        })
        .then((r) => ({
          blob: r.data,
          filename:
            filenameFrom(r.headers) ||
            `mhs-orders-${new Date().toISOString().slice(0, 10)}.${format}`,
        })),
  },

  users: {
    list: (params) => api.get("/users", { params }).then(toList),
    update: (id, body) => api.patch(`/users/${id}`, body).then((r) => r.data),
    remove: (id) => api.delete(`/users/${id}`),
  },

  lenses: {
    list: () => api.get("/lenses").then(toList),
    get: (id) => api.get(`/lenses/${id}`).then(toOne),
    create: (formData) => api.post("/lenses", formData, withMultipart),
    update: (id, formData) =>
      api.patch(`/lenses/${id}`, formData, withMultipart),
    remove: (id) => api.delete(`/lenses/${id}`),
  },

  banners: {
    list: () => api.get("/banners/get-banners").then(toList),
    create: (formData) =>
      api.post("/banners/addbanner", formData, withMultipart),
    remove: (id) => api.delete(`/banners/delete-banner/${id}`),
  },

  categories: {
    list: () => api.get("/categories/all").then(toList),
    create: (formData) =>
      api.post("/categories/addcategory", formData, withMultipart),
    remove: (id) => api.delete(`/categories/${id}`),
  },

  collections: {
    list: () => api.get("/collections/all").then(toList),
    get: (id) => api.get(`/collections/${id}`).then(toOne),
    create: (formData) =>
      api.post("/collections/addcollection", formData, withMultipart),
    remove: (id) => api.delete(`/collections/${id}`),
  },

  announces: {
    list: () => api.get("/announces").then(toList),
    create: (body) => api.post("/announces/addannounce", body),
    update: (id, body) => api.patch(`/announces/${id}`, body),
    remove: (id) => api.delete(`/announces/${id}`),
  },

  pages: {
    list: () => api.get("/pages").then(toList),
    create: (body) => api.post("/pages/addpage", body),
    update: (id, body) => api.patch(`/pages/${id}`, body),
    remove: (id) => api.delete(`/pages/${id}`),
  },

  accessories: {
    list: () => api.get("/accessories").then(toList),
    get: (id) => api.get(`/accessories/${id}`).then((r) => r.data?.data || null),
    create: (formData) => api.post("/accessories", formData, withMultipart),
    update: (id, formData) =>
      api.put(`/accessories/${id}`, formData, withMultipart),
    remove: (id) => api.delete(`/accessories/${id}`),
  },

  contacts: {
    list: (params) => api.get("/contacts", { params }).then(toList),
    get: (id) => api.get(`/contacts/${id}`).then(toOne),
    update: (id, body) => api.patch(`/contacts/${id}`, body).then((r) => r.data),
    remove: (id) => api.delete(`/contacts/${id}`),
  },

  settings: {
    get: () => api.get("/settings/admin").then((r) => r.data?.data?.settings || null),
    update: (body) => api.patch("/settings/admin", body).then((r) => r.data),
    // send a real SMTP test; the form values travel along so an unsaved setup
    // can be tried first
    mailTest: (to, mail) =>
      api.post("/settings/admin/mail/test", { to, mail }).then((r) => r.data),
    mailPreview: (audience) =>
      api
        .get("/settings/admin/mail/preview", { params: { audience } })
        .then((r) => r.data?.data || null),
  },

  scripts: {
    list: () => api.get("/scripts").then(toList),
    create: (body) => api.post("/scripts", body),
    update: (id, body) => api.patch(`/scripts/${id}`, body),
    remove: (id) => api.delete(`/scripts/${id}`),
    toggle: (id) => api.patch(`/scripts/${id}/toggle`).then((r) => r.data),
  },

  menus: {
    active: (lang) => api.get("/menus/active", { params: lang ? { lang } : {} }).then((r) => r.data?.data || r.data || []),
    list: () => api.get("/menus").then(toList),
    get: (id) => api.get(`/menus/${id}`).then(toOne),
    create: (body) => api.post("/menus", body).then((r) => r.data),
    update: (id, body) => api.patch(`/menus/${id}`, body).then((r) => r.data),
    remove: (id) => api.delete(`/menus/${id}`),
    toggle: (id) => api.patch(`/menus/${id}/toggle`).then((r) => r.data),
    reorder: (orders) => api.patch("/menus/reorder", { orders }).then((r) => r.data),
    refOptions: () => api.get("/menus/ref-options").then((r) => r.data?.data),
    uploadImage: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post("/menus/upload-image", fd, withMultipart).then((r) => r.data?.data?.file);
    },
  },

  studio: {
    shapes: () => api.get("/tryon/shapes").then((r) => r.data?.data),
    preview: (recipe) =>
      api.post("/tryon/preview", recipe, { responseType: "blob" }),
    generate: (recipe, productId, assign) =>
      api
        .post("/tryon/generate", { recipe, productId: productId || undefined, assign })
        .then((r) => r.data?.data),

    // per-part editor
    partSvg: (slot, recipe) =>
      api.post("/tryon/part-svg", { slot, recipe }, { responseType: "blob" }),
    library: (productId) =>
      api
        .get("/tryon/library", { params: productId ? { productId } : {} })
        .then((r) => r.data?.data?.groups || {}),
    savePart: (formData) =>
      api.post("/tryon/part", formData, withMultipart).then((r) => r.data?.data),
    compose: (recipe, productId, assign, files) =>
      api
        .post("/tryon/compose", {
          recipe,
          productId: productId || undefined,
          assign,
          files: files || undefined,
        })
        .then((r) => r.data?.data),

    // colour / lens variations of one product's frame
    saveVariant: (body) => api.post("/tryon/variant", body).then((r) => r.data?.data),
    deleteVariant: (productId, id) =>
      api.delete("/tryon/variant", { data: { productId, id } }).then((r) => r.data?.data),
  },

};

export default adminApi;
