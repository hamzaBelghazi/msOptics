"use client";
// The shopper returns here from PayPal's approval screen. Capture the payment
// server-side, then hand off to the success page.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from "@/Components/Context/ToastContext";
import Spinner from "@/Components/Spinner/Spinner";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useContext } from "react";

export default function PaypalReturnPage() {
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const { addToast } = useToast();
  const [error, setError] = useState("");
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const { ref, token: paypalToken } = router.query;
    if (!ref) return;
    fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/paypal/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ref, orderId: paypalToken }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.status === "success") {
          router.replace(`/checkout/success?ref=${encodeURIComponent(d.data?.orderNum || ref)}&method=paypal`);
        } else {
          setError(d?.message || "PayPal could not finish the payment.");
        }
      })
      .catch(() => setError("PayPal could not finish the payment."));
  }, [router.query]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
      {error ? (
        <>
          <p className="text-lg text-red-500 font-medium">{error}</p>
          <button
            onClick={() => router.push("/checkout")}
            className="text-sm underline text-text-secondary"
          >
            Back to checkout
          </button>
        </>
      ) : (
        <>
          <Spinner />
          <p className="text-text-secondary text-sm">Finishing your PayPal payment…</p>
        </>
      )}
    </div>
  );
}
