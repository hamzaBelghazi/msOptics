// pages/checkout.js

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
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState("");
  const { cart } = useContext(CartContext);
  const { user , token} = useContext(AuthContext);
  const { t } = useTranslation();
  const [hasMounted, setHasMounted] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({});
  const router = useRouter();
  const getImagePath = (item) => {
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

  useEffect(() => {
    if (!cart.length) return;
    setHasMounted(true);
    if (hasMounted && !user) {
      router.push("/login");
    }
    const cartItems = cart.map((item) => ({
      id: item.id,
      type: item.type,
      customizations: item.customizations,
      quantity: item.quantity,
      price: item.price,
      title: item.title,
      image: item.image,
    }));

    // Collect prescription data (uploaded prescription and face photo PDF) from localStorage
    let prescriptions = [];
    try {
      if (typeof window !== "undefined") {
        cart.forEach((item) => {
          const cust = item?.customizations || {};
          const entries = [];
          if (cust.prescriptionRef) entries.push({ ref: cust.prescriptionRef, kind: "prescription" });
          if (cust.facePhotoRef) entries.push({ ref: cust.facePhotoRef, kind: "facePhoto" });
          entries.forEach(({ ref, kind }) => {
            const dataUrl = window.localStorage.getItem(ref) || "";
            if (dataUrl && dataUrl.length) {
              prescriptions.push({ ref, itemId: item.id, dataUrl, kind });
            }
          });
        });
      }
    } catch (e) {
      console.warn("Failed to read prescriptions/face photo from localStorage", e);
    }

    fetch(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/create-checkout-session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json"  , "Authorization": `Bearer ${token}`},

        body: JSON.stringify({
          cart: cartItems,
          user,
          prescriptions,
        }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        if (data.shipping) setShippingAddress(data.shipping);
      })
      .catch((err) => {
        console.error("Failed to fetch Stripe client secret:", err);
      });
  }, [cart, user, hasMounted]);

  const appearance = {
    theme: "flat",
    labels: "floating", // Enable floating labels
    variables: {
      fontFamily: "Sohne, system-ui, sans-serif",
      fontWeightNormal: "500",
      borderRadius: "8px",
      colorBackground: "rgb(var(--primary))",
      colorPrimary: "rgb(var(--primary))",
      accessibleColorOnColorPrimary: "#1A1B25",
      colorText: "rgb(var(--text-primary))",
      colorTextSecondary: "rgb(var(--text-primary))",
      colorTextPlaceholder: "#ABB2BF",
      tabIconColor: "white",
      logoColor: "dark",
    },
    rules: {
      ".Input": {
        backgroundColor: "rgb(var(--colorBackground)/ 0.5)",
        border: "1px solid var(--colorPrimary)",
        color: "var(--colorText)",
      },
      ".Label--floating": {
        color: "var(--colorTextSecondary)",
        backgroundColor: "#fff",
        "-webkit-text-fill-color": "var(--colorText)",
      },
    },
  };
  const options = {
    clientSecret,
    appearance,
  };

  const totalPrice = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  if (!hasMounted) return <Spinner />;
  if (!cart)
    return <p className="text-center text-muted">Your cart is empty.</p>;

  return (
    <Layout title="Checkout">
      <nav className="my-8 mx-2">
        <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <li>
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link
              href={`/cart`}
              className="hover:text-primary transition-colors"
            >
              Cart
            </Link>
          </li>
          <li>/</li>
          <li className="text-primary font-medium truncate">
            {t("cart.checkout")}
          </li>
        </ol>
      </nav>
      <div className="min-h-screen w-full bg-background text-text-primary px-4 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Cart Summary */}
        <div className="lg:col-span-2 h-fit bg-card-background border border-card-border rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-bold mb-6 border-b border-border pb-3">
            🛒 Cart
          </h2>

          {cart.length === 0 ? (
            <p className="text-center text-muted">Your cart is empty.</p>
          ) : (
            <ul className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {cart.map((item) => (
                <li
                  key={`${item.id}-${JSON.stringify(item.customizations)}`}
                  className="flex items-center gap-4 border border-muted/20 hover:border-primary rounded-md p-3 transition"
                >
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${getImagePath(item)}`}
                    alt={item.title}
                    width={80}
                    height={80}
                    className="w-20 h-20 object-contain rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {item.title}
                    </h3>
                    {item.customizations &&
                      Object.keys(item.customizations).length > 0 && (
                        <p className="text-sm text-muted truncate">
                          {Object.entries(item.customizations)
                            .map(([key, val]) => `${key}: ${val}`)
                            .join(", ")}
                        </p>
                      )}
                    <p className="mt-1 text-sm text-muted">
                      Qty: <span className="font-medium">{item.quantity}</span>
                    </p>
                  </div>
                  <div className="text-right font-semibold text-sm">
                    <PriceTag amount={item.price * item.quantity} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-border pt-4 flex justify-between font-bold text-xl">
            <span>Total:</span>
            <span>
              <PriceTag amount={totalPrice} />
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-card-background border border-card-border rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-bold mb-6 border-b border-border pb-3">
            💳 Payment
          </h2>

          {clientSecret ? (
            <Elements options={options} stripe={stripePromise}>
              <StripeCheckoutForm
                total={totalPrice}
                userEmail={user?.email}
                shippingAddressData={{
                  name: user?.firstName + " " + user?.lastName,
                  address: {
                    line1: user?.street,
                    city: user?.city,
                    state: user?.city,
                    postal_code: `${user.postalCode}`,
                    country: "MA",
                    phone: `${user?.phone}` || "",
                  },
                }}
              />
            </Elements>
          ) : cart.length === 0 ? (
            <p className="text-center text-muted">
              Add items to your cart to continue.
            </p>
          ) : (
            <p>Loading payment...</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
