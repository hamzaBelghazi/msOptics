import { useEffect, useContext } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/Components/Layout/Layout";
import { CartContext } from "@/Components/Context/CartContext";

export default function CheckoutSuccess() {
  const router = useRouter();
  const { clearCart } = useContext(CartContext);

  useEffect(() => {
     clearCart?.();

    try {
      if (typeof window !== "undefined") {
        const prefixes = ["prescription:", "facePhoto:"];
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
  }, []);

  const paymentIntentId = router.query?.pi;

  return (
    <Layout title="Checkout Success">
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-semibold text-green-600">Payment Successful</h1>
          <p className="mt-2 text-text-muted">Thank you for your purchase!</p>
          {paymentIntentId ? (
            <p className="mt-2 text-xs text-text-secondary">Ref: {paymentIntentId}</p>
          ) : null}
          <div className="mt-6">
            <Link
              href="/account#orders"
              className="inline-block bg-primary hover:bg-primary/90 text-button-text px-5 py-3 rounded-md transition"
            >
              View your orders
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
