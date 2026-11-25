// pages/checkout/index.jsx

import StripeCheckoutForm from "@/Components/Checkout/StripeCheckoutForm";
import { AuthContext } from "@/Components/Context/AuthContext";
import { CartContext } from "@/Components/Context/CartContext";
import Layout from "@/Components/Layout/Layout";
import Spinner from "@/Components/Spinner/Spinner";
import PriceTag from "@/Components/utils/PriceTag";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePublicSettings } from "@/Api/publicSettings";
import { useToast } from "@/Components/Context/ToastContext";

// publishable key comes from the dashboard settings (env stays a fallback)
const stripePromiseFor = (pk) => (pk ? loadStripe(pk) : null);

// A cart line is unique by product + its customisation set.
const lineKey = (item) => `${item.id}-${JSON.stringify(item.customizations || {})}`;

const imagePathFor = (item) => {
 const imageName = Array.isArray(item.image) ? item.image[0] : item.image;
 switch (item.type) {
 case "product":
 return `products/${imageName}`;
 case "accessory":
 return `accessories/${imageName}`;
 case "lens":
 return `lenses/lenses.webp`;
 default:
 return `products/${imageName}`;
 }
};

// Customisation values can be nested objects (lens packages); flatten them so
// the checkout never prints "[object Object]".
const formatValue = (value) => {
 if (value === null || value === undefined || value === "") return "";
 if (Array.isArray(value)) {
 return value.map(formatValue).filter(Boolean).join(" / ");
 }
 if (typeof value === "object") {
 return Object.values(value).map(formatValue).filter(Boolean).join(" / ");
 }
 return String(value);
};

const formatLabel = (key) =>
 String(key)
 .replace(/([a-z])([A-Z])/g, "$1 $2")
 .replace(/[_-]+/g, " ")
 .replace(/^\w/, (c) => c.toUpperCase());

const toApiItem = (item) => ({
 id: item.id,
 type: item.type,
 customizations: item.customizations,
 quantity: item.quantity,
 price: item.price,
 title: item.title,
 image: item.image,
});

const PHONE_RE = /^\+?[\d\s().-]{6,20}$/;

// account fields are not guaranteed to be strings (phone/postal code are often
// stored as numbers) — never call .trim() on them directly
const asText = (value) =>
 value === null || value === undefined ? "" : String(value);

const EMPTY_FORM = {
 name: "",
 phone: "",
 line1: "",
};

// one free-text address box: keep every line the shopper typed, joined so the
// order exports and emails stay on a single readable line
const normalizeAddress = (value) =>
 asText(value)
 .split(/\r?\n/)
 .map((part) => part.trim())
 .filter(Boolean)
 .join(", ");

// --- small presentational pieces (module scope so inputs keep focus) ------

const Checkbox = ({ checked, onChange, label }) => (
 <button
 type="button"
 role="checkbox"
 aria-checked={checked}
 aria-label={label}
 onClick={onChange}
 className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
 checked
 ? "border-primary bg-primary text-white shadow-sm"
 : "border-card-border bg-transparent hover:border-primary/60"
 }`}
 >
 {checked ? (
 <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
 <path d="M4.5 10.5l3.5 3.5 7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 ) : null}
 </button>
);

const QtyStepper = ({ value, onDecrease, onIncrease, labels }) => (
 <div className="inline-flex items-center overflow-hidden rounded-full border border-card-border bg-background">
 <button
 type="button"
 onClick={onDecrease}
 disabled={value <= 1}
 aria-label={labels.decrease}
 className="px-2.5 py-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
 >
 <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
 <path d="M4 10h12" strokeLinecap="round" />
 </svg>
 </button>
 <span className="w-8 text-center text-sm font-semibold tabular-nums text-text-primary">{value}</span>
 <button
 type="button"
 onClick={onIncrease}
 aria-label={labels.increase}
 className="px-2.5 py-1.5 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
 >
 <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
 <path d="M10 4v12M4 10h12" strokeLinecap="round" />
 </svg>
 </button>
 </div>
);

const Field = ({ label, error, className = "", multiline = false, rows = 3, ...props }) => {
 const controlClass = `w-full rounded-xl border bg-input-background px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition placeholder:text-text-muted/70 focus:ring-2 ${
 error
 ? "border-red-400 focus:border-red-500 focus:ring-red-200/50"
 : "border-input-border focus:border-primary focus:ring-primary/15"
 }`;
 return (
 <label className={`block ${className}`}>
 <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
 {label}
 </span>
 {multiline ? (
 <textarea {...props} rows={rows} className={`${controlClass} resize-y leading-relaxed`} />
 ) : (
 <input {...props} className={controlClass} />
 )}
 {error ? <span className="mt-1 block text-xs font-medium text-red-500">{error}</span> : null}
 </label>
 );
};

const LockIcon = ({ className = "h-4 w-4" }) => (
 <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
 <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
 <path d="M8 10.5V8a4 4 0 018 0v2.5" strokeLinecap="round" />
 </svg>
);

export default function CheckoutPage() {
 const [clientSecret, setClientSecret] = useState("");
 const [method, setMethod] = useState(""); // stripe | paypal | cod
 const [paypalBusy, setPaypalBusy] = useState(false);
 const [codBusy, setCodBusy] = useState(false);
 const { cart, updateQuantity, removeFromCart } = useContext(CartContext);
 const { user, token } = useContext(AuthContext);
 const { t } = useTranslation();
 const [hasMounted, setHasMounted] = useState(false);
 const settings = usePublicSettings();
 const { addToast: addToastSafe } = useToast();
 const stripeKey =
 settings?.payments?.stripe?.publishableKey ||
 process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
 "";
 const methods = {
 stripe: Boolean(settings?.payments?.stripe?.enabled && settings?.payments?.stripe?.publishableKey),
 paypal: Boolean(settings?.payments?.paypal?.enabled),
 cod: Boolean(settings?.payments?.cod?.enabled),
 };
 const codMax = Number(settings?.payments?.cod?.maxAmount) || 0;
 const stripePromise = useMemo(() => stripePromiseFor(stripeKey), [stripeKey]);

 // every line starts selected; the shopper can deselect what they do not want yet
 const [selected, setSelected] = useState({});
 const [form, setForm] = useState(EMPTY_FORM);
 const [formErrors, setFormErrors] = useState({});
 const router = useRouter();

 const selectedItems = useMemo(
 () => cart.filter((item) => selected[lineKey(item)] !== false),
 [cart, selected]
 );
 const allSelected = cart.length > 0 && selectedItems.length === cart.length;
 const selectedTotal = selectedItems.reduce(
 (acc, item) => acc + item.price * item.quantity,
 0
 );
 // changes when the ordered subset (or a quantity) changes — used to rebuild
 // the Stripe session so the charged amount always matches the selection.
 const selectionSignature = selectedItems
 .map((item) => `${lineKey(item)}x${item.quantity}`)
 .join("|");

 // the first enabled method is the default choice
 useEffect(() => {
 if (method || !settings) return;
 if (methods.stripe) setMethod("stripe");
 else if (methods.paypal) setMethod("paypal");
 else if (methods.cod) setMethod("cod");
 }, [settings, method]);

 useEffect(() => {
 setHasMounted(true);
 }, []);

 useEffect(() => {
 if (hasMounted && !user) router.push("/login");
 }, [hasMounted, user]);

 // keep the selection map in sync with the cart (new lines default to selected)
 useEffect(() => {
 setSelected((prev) => {
 const next = {};
 cart.forEach((item) => {
 const key = lineKey(item);
 next[key] = prev[key] !== false;
 });
 return next;
 });
 }, [cart]);

 // remember which lines are being ordered so the success page can remove only
 // those and keep the rest of the bag intact
 useEffect(() => {
 if (typeof window === "undefined" || selectedItems.length === 0) return;
 try {
 window.sessionStorage.setItem(
 "checkout:ordered",
 JSON.stringify(
 selectedItems.map((item) => ({
 id: item.id,
 customizations: item.customizations,
 }))
 )
 );
 } catch (_) {}
 }, [selectionSignature]);

 const buildPrescriptions = (items = cart) => {
 const prescriptions = [];
 try {
 if (typeof window !== "undefined") {
 items.forEach((item) => {
 const cust = item?.customizations || {};
 const entries = [];
 if (cust.prescriptionRef) entries.push({ ref: cust.prescriptionRef, kind: "prescription" });
 if (cust.facePhotoRef) entries.push({ ref: cust.facePhotoRef, kind: "facePhoto" });
 if (cust.facePhotoRef) {
 entries.push({
 ref: cust.facePhotoRef.replace("facePhoto:", "faceSheet:"),
 kind: "faceSheet",
 });
 }
 entries.forEach(({ ref, kind }) => {
 const dataUrl = window.localStorage.getItem(ref) || "";
 if (dataUrl && dataUrl.length) {
 prescriptions.push({
 ref,
 itemId: item.id,
 dataUrl,
 kind,
 ...(kind === "facePhoto" && item.faceMetrics ? { metrics: item.faceMetrics } : {}),
 });
 }
 });
 });
 }
 } catch (e) {
 console.warn("Failed to read prescriptions/face photo from localStorage", e);
 }
 return prescriptions;
 };

 // Stripe: (re)create the PaymentIntent for the current selection
 useEffect(() => {
 if (method !== "stripe" || !token) return;
 if (selectedItems.length === 0) {
 setClientSecret("");
 return undefined;
 }
 let cancelled = false;
 setClientSecret("");
 fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/create-checkout-session`, {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
 body: JSON.stringify({
 cart: selectedItems.map(toApiItem),
 user,
 prescriptions: buildPrescriptions(selectedItems),
 }),
 })
 .then((res) => res.json())
 .then((data) => {
 if (cancelled) return;
 if (data.clientSecret) setClientSecret(data.clientSecret);
 })
 .catch((err) => {
 console.error("Failed to fetch Stripe client secret:", err);
 });
 return () => {
 cancelled = true;
 };
 }, [method, token, user, selectionSignature]);

 const buildShipping = () => ({
 name: asText(form.name).trim(),
 phone: asText(form.phone).trim(),
 address: {
 // city/postal/country are left to the courier profile on the server
 line1: normalizeAddress(form.line1),
 },
 });

 // PayPal: start the session and send the shopper to the approval screen
 const startPaypal = () => {
 if (!selectedItems.length) {
 addToastSafe(t("checkout.select_some_items", "Select at least one item to continue."), "error");
 return;
 }
 setPaypalBusy(true);
 fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/paypal/create-session`, {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
 body: JSON.stringify({
 cart: selectedItems.map(toApiItem),
 user,
 prescriptions: buildPrescriptions(selectedItems),
 }),
 })
 .then((r) => r.json())
 .then((d) => {
 if (d?.data?.approveUrl) {
 window.location.href = d.data.approveUrl;
 } else {
 addToastSafe(d?.message || "PayPal could not start.", "error");
 setPaypalBusy(false);
 }
 })
 .catch(() => {
 addToastSafe("PayPal could not start.", "error");
 setPaypalBusy(false);
 });
 };

 // Cash on delivery: validate the delivery details, then place the order
 const validateCodForm = () => {
 const errors = {};
 const name = asText(form.name).trim();
 const phone = asText(form.phone).trim();
 if (name.length < 2) {
 errors.name = t("checkout.required_field", "This field is required");
 }
 if (!phone) {
 errors.phone = t("checkout.required_field", "This field is required");
 } else if (!PHONE_RE.test(phone)) {
 errors.phone = t("checkout.invalid_phone", "Enter a valid phone number");
 }
 if (normalizeAddress(form.line1).length < 5) {
 errors.line1 = t("checkout.required_field", "This field is required");
 }
 return errors;
 };

 const placeCodOrder = () => {
 if (!selectedItems.length) {
 addToastSafe(t("checkout.select_some_items", "Select at least one item to continue."), "error");
 return;
 }
 const errors = validateCodForm();
 setFormErrors(errors);
 if (Object.keys(errors).length) {
 addToastSafe(t("checkout.form_incomplete", "Please complete the delivery details."), "error");
 return;
 }
 setCodBusy(true);
 fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/cod`, {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
 body: JSON.stringify({
 cart: selectedItems.map(toApiItem),
 user,
 prescriptions: buildPrescriptions(selectedItems),
 shipping: buildShipping(),
 }),
 })
 .then((r) => r.json())
 .then((d) => {
 if (d?.data?.orderNum) {
 // remove only the ordered lines, keep the rest of the bag
 selectedItems.forEach((item) => removeFromCart?.(item.id, item.customizations));
 router.push(`/checkout/success?ref=${encodeURIComponent(d.data.orderNum)}&method=cod`);
 } else {
 addToastSafe(d?.message || "Could not place the order.", "error");
 setCodBusy(false);
 }
 })
 .catch(() => {
 addToastSafe("Could not place the order.", "error");
 setCodBusy(false);
 });
 };

 // prefill the delivery form from the account (still editable)
 useEffect(() => {
 if (!user) return;
 setForm((prev) => {
 // the account address is spread over several fields — show it as the one
 // free-text address line the form now asks for
 const profileAddress = [
 asText(user.street),
 asText(user.city),
 asText(user.postalCode),
 asText(user.country),
 ]
 .map((part) => part.trim())
 .filter(Boolean)
 .join(", ");
 return {
 name:
 prev.name ||
 asText(`${asText(user.firstName)} ${asText(user.lastName)}`).trim(),
 phone: prev.phone || asText(user.phone),
 line1: prev.line1 || profileAddress,
 };
 });
 }, [user]);

 const setField = (name) => (event) => {
 const { value } = event.target;
 setForm((prev) => ({ ...prev, [name]: value }));
 setFormErrors((prev) => (prev[name] ? { ...prev, [name]: "" } : prev));
 };

 const toggleItem = (key) =>
 setSelected((prev) => ({ ...prev, [key]: prev[key] === false }));

 const toggleAll = () => {
 const next = {};
 cart.forEach((item) => {
 next[lineKey(item)] = !allSelected;
 });
 setSelected(next);
 };

 // Stripe's AddressElement rejects partial contacts, so only prefill it when
 // the account actually has a deliverable address
 const stripeContact = useMemo(() => {
 if (!user) return undefined;
 const text = (value) =>
 value === null || value === undefined ? "" : String(value).trim();
 const name = text(`${user.firstName || ""} ${user.lastName || ""}`);
 const address = {
 line1: text(user.street),
 city: text(user.city),
 postal_code: text(user.postalCode),
 country: text(user.country),
 };
 if (!name || !address.line1 || !address.city || !address.country) {
 return undefined;
 }
 const phone = text(user.phone);
 return {
 name,
 address,
 ...(phone ? { phone } : {}),
 };
 }, [user]);

 const appearance = useMemo(() => {
 const read = (name, fallback) => {
 if (typeof window === "undefined") return fallback;
 const raw = getComputedStyle(document.documentElement)
 .getPropertyValue(name)
 .trim();
 return raw ? `rgb(${raw})` : fallback;
 };
 return {
 theme: "flat",
 variables: {
 fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
 fontWeightNormal: "500",
 borderRadius: "12px",
 colorPrimary: read("--primary", "#0d7a66"),
 colorBackground: read("--card-background", "#ffffff"),
 colorText: read("--text-primary", "#1c1917"),
 colorTextSecondary: read("--text-secondary", "#57534e"),
 colorTextPlaceholder: read("--text-muted", "#8d857a"),
 colorDanger: "#b91c1c",
 },
 rules: {
 ".Input": {
 boxShadow: "none",
 border: "1px solid var(--colorBorder, #e7decd)",
 },
 ".Tab": { boxShadow: "none" },
 },
 };
 }, []);

 const totalPrice = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
 const tooLargeForCod = codMax > 0 && selectedTotal > codMax;
 const canPay = selectedItems.length > 0;

 if (!hasMounted) return <Spinner />;

 if (!cart.length) {
 return (
 <Layout title={t("cart.checkout") || "Checkout"}>
 <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
 <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-card-border bg-card-background text-primary">
 <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.6">
 <path d="M6 7h12l1.5 12.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5L6 7z" strokeLinejoin="round" />
 <path d="M9 7a3 3 0 016 0" strokeLinecap="round" />
 </svg>
 </div>
 <h1 className="font-display text-3xl text-text-primary">
 {t("checkout.empty_title", "Your bag is empty")}
 </h1>
 <p className="mt-3 text-sm text-text-secondary">
 {t("checkout.empty_body", "Add a frame or a lens to continue to checkout.")}
 </p>
 <Link
 href="/type/optical"
 className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-hover"
 >
 {t("cart.continue_shopping")}
 </Link>
 </div>
 </Layout>
 );
 }

 return (
 <Layout title={t("cart.checkout") || "Checkout"}>
 <div className="min-h-screen w-full bg-background text-text-primary">
 <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
 {/* Breadcrumb */}
 <nav aria-label="Breadcrumb" className="mb-6">
 <ol className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
 <li>
 <Link href="/" className="transition-colors hover:text-primary">
 {t("checkout.crumb_home", "Home")}
 </Link>
 </li>
 <li aria-hidden="true" className="text-gold">/</li>
 <li>
 <Link href="/cart" className="transition-colors hover:text-primary">
 {t("checkout.crumb_bag", "Bag")}
 </Link>
 </li>
 <li aria-hidden="true" className="text-gold">/</li>
 <li className="text-text-primary">{t("cart.checkout")}</li>
 </ol>
 </nav>

 <header className="mb-8 flex flex-col gap-3 sm:mb-10">
 <div className="flex items-center gap-3">
 <span className="h-px w-8 bg-gold/70" />
 <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
 {t("checkout.eyebrow", "Secure checkout")}
 </span>
 </div>
 <h1 className="font-display text-3xl leading-tight text-text-primary sm:text-4xl">
 {t("checkout.title", "Complete your order")}
 </h1>
 <p className="max-w-2xl text-sm text-text-secondary">
 {t("checkout.subtitle", "Review your pieces, tell us where to deliver them and choose how you would like to pay.")}
 </p>
 </header>

 <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
 {/* Items */}
 <section className="overflow-hidden rounded-[22px] border border-card-border bg-card-background shadow-sm lg:self-start lg:col-start-1 lg:row-start-1">
 <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border/70 px-5 py-4 sm:px-6">
 <div className="flex items-center gap-3">
 <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">
 {t("checkout.items_title", "Your items")}
 </h2>
 <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
 {cart.length}
 </span>
 </div>
 <button
 type="button"
 onClick={toggleAll}
 className="text-xs font-semibold uppercase tracking-[0.12em] text-primary transition-colors hover:text-primary-hover"
 >
 {allSelected
 ? t("checkout.deselect_all", "Deselect all")
 : t("checkout.select_all", "Select all")}
 </button>
 </div>

 <ul className="divide-y divide-card-border/70">
 {cart.map((item) => {
 const key = lineKey(item);
 const isSelected = selected[key] !== false;
 return (
 <li
 key={key}
 className={`flex gap-3 px-5 py-4 transition-colors sm:gap-4 sm:px-6 ${
 isSelected ? "bg-card-background" : "bg-background/40 opacity-70"
 }`}
 >
 <div className="pt-1">
 <Checkbox
 checked={isSelected}
 onChange={() => toggleItem(key)}
 label={`${t("checkout.select_item", "Select")} ${item.title}`}
 />
 </div>

 <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-card-border/70 bg-background sm:h-24 sm:w-24">
 <Image
 src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${imagePathFor(item)}`}
 alt={item.title}
 fill
 sizes="96px"
 className="object-contain p-1.5"
 />
 </div>

 <div className="flex min-w-0 flex-1 flex-col gap-2">
 <div className="flex flex-wrap items-start justify-between gap-2">
 <div className="min-w-0">
 <h3 className="truncate text-sm font-semibold text-text-primary sm:text-[15px]">
 {item.title}
 </h3>
 <p className="mt-0.5 text-xs text-text-muted">
 <PriceTag amount={item.price} />
 {item.quantity > 1 ? (
 <span className="ml-1 text-text-muted">
 {t("checkout.each", "(each)")}
 </span>
 ) : null}
 </p>
 </div>
 <button
 type="button"
 onClick={() => removeFromCart?.(item.id, item.customizations)}
 title={t("cart.remove_item", "Remove")}
 aria-label={`${t("cart.remove_item", "Remove")} ${item.title}`}
 className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-red-50 hover:text-red-500"
 >
 <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
 <path d="M4 7h16M9 7V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V7m-8 0l.8 12a1.5 1.5 0 001.5 1.4h5.4a1.5 1.5 0 001.5-1.4L17 7" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 </button>
 </div>

 {item.customizations && Object.keys(item.customizations).length > 0 ? (
 <p className="line-clamp-2 text-[11px] leading-relaxed text-text-secondary">
 {Object.entries(item.customizations)
 .map(([k, v]) => {
 const text = formatValue(v);
 return text ? `${formatLabel(k)}: ${text}` : "";
 })
 .filter(Boolean)
 .join(" · ")}
 </p>
 ) : null}

 <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
 <QtyStepper
 value={item.quantity}
 labels={{
 increase: t("checkout.increase", "Increase quantity"),
 decrease: t("checkout.decrease", "Decrease quantity"),
 }}
 onDecrease={() =>
 updateQuantity(item.id, item.quantity - 1, item.customizations)
 }
 onIncrease={() =>
 updateQuantity(item.id, item.quantity + 1, item.customizations)
 }
 />
 <span className="text-sm font-semibold tabular-nums text-text-primary">
 <PriceTag amount={item.price * item.quantity} />
 </span>
 </div>
 </div>
 </li>
 );
 })}
 </ul>

 <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border/70 bg-background/30 px-5 py-4 sm:px-6">
 <p className="text-xs text-text-secondary">
 {t("checkout.selected_count", {
 selected: selectedItems.length,
 total: cart.length,
 defaultValue: "{{selected}} of {{total}} items selected",
 })}
 </p>
 <p className="text-xs text-text-muted">
 {t("checkout.bag_total", "Bag total")}:{" "}
 <span className="font-semibold text-text-primary">
 <PriceTag amount={totalPrice} />
 </span>
 </p>
 </div>
 </section>

 {/* Summary */}
 <div className="lg:col-start-2 lg:row-start-1 lg:row-span-3">
  <div className="space-y-6 lg:sticky lg:top-6">
  <section className="rounded-[22px] border border-card-border bg-card-background p-5 shadow-sm sm:p-6">
  <div className="mb-5 flex items-center justify-between">
  <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">
  {t("checkout.summary_title", "Order summary")}
  </h2>
  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
  {selectedItems.length}/{cart.length}
  </span>
  </div>

  <dl className="space-y-3 text-sm">
  <div className="flex items-center justify-between text-text-secondary">
  <dt>{t("checkout.items_subtotal", "Items subtotal")}</dt>
  <dd className="font-medium text-text-primary">
  <PriceTag amount={selectedTotal} />
  </dd>
  </div>
  <div className="flex items-center justify-between text-text-secondary">
  <dt>{t("cart.shipping")}</dt>
  <dd className="text-xs font-medium text-text-muted">
  {method === "cod"
  ? t("checkout.paid_on_delivery", "Collected on delivery")
  : t("cart.calculated_at_checkout")}
  </dd>
  </div>
  </dl>

  <div className="my-5 border-t border-dashed border-card-border" />

  <div className="flex items-end justify-between">
  <span className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
  {t("cart.total")}
  </span>
  <span className="font-display text-2xl text-text-primary">
  <PriceTag amount={selectedTotal} />
  </span>
  </div>
  </section>
  </div>
 </div>

 <section className="rounded-[22px] border border-card-border bg-card-background p-5 shadow-sm sm:p-6 lg:col-start-1 lg:row-start-2">
 <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-text-primary">
 {t("checkout.pay_with", "Payment method")}
 </h2>

 {/* method picker — only the methods the admin enabled */}
 <div className="mb-5 grid grid-cols-3 gap-2">
 {methods.stripe && (
 <button
 type="button"
 onClick={() => setMethod("stripe")}
 className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition ${
 method === "stripe"
 ? "border-primary bg-primary/10 text-text-primary shadow-sm"
 : "border-card-border text-text-secondary hover:border-primary/50"
 }`}
 >
 <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
 <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
 <path d="M3 10h18" />
 </svg>
 {t("checkout.method_card", "Card")}
 </button>
 )}
 {methods.paypal && (
 <button
 type="button"
 onClick={() => setMethod("paypal")}
 className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition ${
 method === "paypal"
 ? "border-primary bg-primary/10 text-text-primary shadow-sm"
 : "border-card-border text-text-secondary hover:border-primary/50"
 }`}
 >
 <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
 <path d="M7 20l2-12h5.2a4 4 0 010 8H10" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 PayPal
 </button>
 )}
 {methods.cod && (
 <button
 type="button"
 onClick={() => setMethod("cod")}
 className={`group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-semibold transition ${
 method === "cod"
 ? "border-primary bg-primary/10 text-text-primary shadow-sm"
 : "border-card-border text-text-secondary hover:border-primary/50"
 }`}
 >
 <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary" fill="none" stroke="currentColor" strokeWidth="1.6">
 <path d="M3.5 9.5L12 4l8.5 5.5V19a1.5 1.5 0 01-1.5 1.5H5A1.5 1.5 0 013.5 19V9.5z" strokeLinejoin="round" />
 <path d="M9.5 20.5V14h5v6.5" />
 </svg>
 {t("checkout.method_cod", "Cash on delivery")}
 </button>
 )}
 </div>

 {!method ? (
 <p className="py-4 text-center text-sm text-text-muted">
 {t("checkout.loading_methods", "Loading payment options…")}
 </p>
 ) : null}

 {method === "stripe" && (
 <div className="space-y-4">
 {selectedItems.length === 0 ? (
 <p className="py-6 text-center text-sm text-text-muted">
 {t(
 "checkout.select_some_items",
 "Select at least one item to continue."
 )}
 </p>
 ) : clientSecret && stripeKey ? (
 <Elements
 key={clientSecret}
 options={{ clientSecret, appearance }}
 stripe={stripePromise}
 >
 <StripeCheckoutForm
 total={selectedTotal}
 userEmail={user?.email}
 shippingAddressData={stripeContact}
 />
 </Elements>
 ) : (
 <p className="py-6 text-center text-sm text-text-muted">
 {t("checkout.loading_payment", "Loading secure payment…")}
 </p>
 )}
 </div>
 )}

 {method === "paypal" && (
 <div className="space-y-4">
 <p className="text-sm text-text-secondary">
 {t(
 "checkout.paypal_note",
 "You will be redirected to PayPal to approve the payment, then brought back here."
 )}
 </p>
 <button
 type="button"
 onClick={startPaypal}
 disabled={paypalBusy || !canPay}
 className="w-full rounded-full bg-[#ffc439] px-4 py-3 text-sm font-bold text-[#111] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {paypalBusy ? (
 t("checkout.redirecting", "Redirecting…")
 ) : (
 <span className="inline-flex items-center justify-center gap-2">
 Pay with PayPal · <PriceTag amount={selectedTotal} />
 </span>
 )}
 </button>
 </div>
 )}

 {method === "cod" && (
 <div className="space-y-5">
 <div className="rounded-2xl border border-card-border/80 bg-background/40 p-4 sm:p-5">
 <div className="mb-4 flex items-start gap-3">
 <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
 <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
 <path d="M3.5 7.5h10v9h-10zM13.5 11h4l3 3v2.5h-7z" strokeLinejoin="round" />
 <circle cx="7" cy="18" r="1.6" />
 <circle cx="17.5" cy="18" r="1.6" />
 </svg>
 </span>
 <div>
 <h3 className="text-sm font-semibold text-text-primary">
 {t("checkout.delivery_title", "Delivery details")}
 </h3>
 <p className="text-xs text-text-secondary">
 {t(
 "checkout.delivery_hint",
 "We use these details to hand your order to the courier."
 )}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
 <Field
 label={t("checkout.full_name", "Full name")}
 name="name"
 autoComplete="name"
 placeholder="Youssef El Amrani"
 value={form.name}
 error={formErrors.name}
 onChange={setField("name")}
 />
 <Field
 label={t("checkout.phone", "Phone number")}
 name="phone"
 type="tel"
 inputMode="tel"
 autoComplete="tel"
 placeholder="+212 6 12 34 56 78"
 value={form.phone}
 error={formErrors.phone}
 onChange={setField("phone")}
 />
 <Field
 className="sm:col-span-2"
 label={t("checkout.address1", "Delivery address")}
 name="line1"
 multiline
 rows={3}
 autoComplete="street-address"
 placeholder={t(
 "checkout.address1_ph",
 "Street, building, city, postal code, country"
 )}
 value={form.line1}
 error={formErrors.line1}
 onChange={setField("line1")}
 />
 </div>
 </div>

 {settings?.payments?.cod?.note ? (
 <p className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-text-secondary">
 {settings.payments.cod.note}
 </p>
 ) : (
 <p className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-text-secondary">
 {t("checkout.cod_note", "Pay in cash when your order is delivered.")}
 </p>
 )}

 {tooLargeForCod ? (
 <p className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
 {t("checkout.cod_limit", {
 max: codMax,
 defaultValue:
 "Cash on delivery is limited to orders up to {{max}} — deselect a few items to continue.",
 })}
 </p>
 ) : null}

 <button
 type="button"
 onClick={placeCodOrder}
 disabled={codBusy || !canPay || tooLargeForCod}
 className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
 >
 {codBusy ? (
 t("checkout.placing_order", "Placing your order…")
 ) : (
 <>
 <LockIcon className="h-4 w-4" />
 {t("checkout.place_cod", "Place order · pay on delivery")} ·{" "}
 <PriceTag amount={selectedTotal} />
 </>
 )}
 </button>
 </div>
 )}

 <p className="mt-5 flex items-start gap-2 border-t border-card-border/70 pt-4 text-[11px] leading-relaxed text-text-muted">
 <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
 {t(
 "checkout.no_store_payments",
 "For your security we never store card or payment details on our servers."
 )}
 </p>
 </section>

 <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-text-muted lg:col-start-1 lg:row-start-3">
 <span>{t("checkout.trust_returns", "30-day easy returns")}</span>
 <span className="h-1 w-1 rounded-full bg-gold/60" />
 <span>{t("checkout.trust_warranty", "12-month warranty")}</span>
 <span className="h-1 w-1 rounded-full bg-gold/60" />
 <span>{t("checkout.trust_support", "Prescription experts on call")}</span>
 </div>

 </div>
 </div>
 </div>
 </Layout>
 );
}
