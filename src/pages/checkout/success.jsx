import { useEffect, useContext, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/Components/Layout/Layout";
import { CartContext } from "@/Components/Context/CartContext";

export default function CheckoutSuccess() {
  const router = useRouter();
  const { cart, clearCart, removeFromCart } = useContext(CartContext);
  // React strict mode runs mount effects twice in development — the bag must
  // only be reconciled once or a second pass would clear the remaining items.
  const reconciled = useRef(false);

  useEffect(() => {
    if (!router.isReady || reconciled.current) return;
    reconciled.current = true;

    // Only the lines that were actually ordered should leave the bag; whatever
    // the shopper deselected at checkout stays there for later.
    let ordered = null;
    try {
      const raw = window.sessionStorage.getItem("checkout:ordered");
      if (raw) ordered = JSON.parse(raw);
    } catch (_) {}

    if (Array.isArray(ordered) && ordered.length) {
      ordered.forEach(({ id, customizations }) => {
        const match = (cart || []).find(
          (item) =>
            item.id === id &&
            JSON.stringify(item.customizations || {}) ===
              JSON.stringify(customizations || {})
        );
        if (match) removeFromCart?.(match.id, match.customizations);
      });
      try {
        window.sessionStorage.removeItem("checkout:ordered");
      } catch (_) {}
    } else {
      clearCart?.();
    }

    try {
      if (typeof window !== "undefined") {
        const prefixes = ["prescription:", "facePhoto:", "faceSheet:", "facePhotoMeta:"];
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && prefixes.some((p) => key.startsWith(p))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch (_) {}
  }, [router.isReady]);

  const paymentIntentId = router.query?.pi || router.query?.ref;
  const isCod = router.query?.method === "cod";

  return (
    <Layout title="Checkout Success">
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg rounded-[22px] border border-card-border bg-card-background p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">
            {isCod ? "Order confirmed" : "Payment received"}
          </p>
          <h1 className="mt-2 font-display text-3xl text-text-primary">
            {isCod ? "Thank you — your order is on its way" : "Thank you for your order"}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            {isCod
              ? "Your order is confirmed — have the amount ready when it arrives."
              : "Your payment went through and your order is being prepared."}
          </p>
          {paymentIntentId ? (
            <p className="mt-5 inline-block rounded-full border border-card-border bg-background/60 px-4 py-1.5 text-xs text-text-secondary">
              Ref: <span className="font-semibold text-text-primary">{paymentIntentId}</span>
            </p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/account#orders"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-hover"
            >
              View your orders
            </Link>
            <Link
              href="/type/optical"
              className="rounded-full border border-card-border px-6 py-3 text-sm font-semibold text-text-primary transition hover:border-primary/60 hover:text-primary"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
