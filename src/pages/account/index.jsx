import { useEffect, useContext, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "@/Components/Layout/Layout";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useTranslation } from "react-i18next";
import Spinner from "@/Components/Spinner/Spinner";
import AccountDetails from "@/Components/account/AccountDetails";
import Password from "@/Components/account/Password";
import axios from "axios";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import Image from "next/image";
import { useToast } from "@/Components/Context/ToastContext";

export default function Account() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoggedIn, user, token, setUserData } = useContext(AuthContext);
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");
  const [hasMounted, setHasMounted] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!isLoggedIn && hasMounted) {
      router.push("/login");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, hasMounted]);

  // Mount flag and hash-based tab activation
  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined") {
      if (window.location.hash === "#orders") {
        setActiveTab("orders");
      }
    }
  }, []);

  // Fetch orders when Orders tab becomes active
  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) return;
      setOrdersLoading(true);
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/my`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const list = res?.data?.data?.orders || [];
        setOrders(list);
      } catch (e) {
        console.error("Failed to load orders", e);
      } finally {
        setOrdersLoading(false);
      }
    };
    if (activeTab === "orders") fetchOrders();
  }, [activeTab, token]);

  const cancelOrder = async (orderId) => {
    if (!orderId || !token) return;
    try {
      setCancellingId(orderId);
      const res = await axios.patch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/${orderId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Optimistically update local state
      const refundId = res?.data?.data?.refundId;
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: "cancelled", refundId } : o))
      );
      const msg = res?.data?.message || t?.("account.refund_info") ||
        "A refund was issued for this order and should appear in your bank account within a few business days.";
      addToast?.(msg, "success");
    } catch (e) {
      const err = e?.response?.data?.message || "Failed to cancel order";
      addToast?.(err, "error");
    } finally {
      setCancellingId(null);
    }
  };

  const deleteOrder = async (orderId) => {
    if (!orderId || !token) return;
    try {
      setDeletingId(orderId);
      await axios.delete(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/orders/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOrders((prev) => prev.filter((o) => o._id !== orderId));
      addToast?.(t?.("account.order_deleted") || "Order removed.", "success");
    } catch (e) {
      const err = e?.response?.data?.message || "Failed to remove order";
      addToast?.(err, "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      const updatedUser = await axios.patch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/updateMe`,
        formData, // This is the actual body
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (updatedUser.data.status === "success") {
        setUserData(updatedUser.data.data.user);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleChangePassword = async (data) => {
    try {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const updatedUser = await axios.patch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/updateMyPassword`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: data,
        }
      );
      if (updatedUser.data.status === "success") {
        localStorage.setItem("token", updatedUser.data.token);
      }
    } catch (error) {
      throw new Error("Error updating password");
    }
  };

  if (!isLoggedIn) {
    return (
      <Layout title={"loading..."}>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout title={"loading..."}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Spinner />
            <p className="mt-4 text-text-secondary">{t("account.loading")}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("account.title")}>
      <section className="min-h-screen p-4 md:p-8">
        <div className="container mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              {t("account.title")}
            </h1>
            <p className="text-text-secondary">{t("account.subtitle")}</p>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Sidebar */}
            {/* Tab Navigation */}
            <div className="md:col-span-1">
              <div className="bg-card-background rounded-lg shadow-md py-4 md:px-4 border border-border">
                <div className="flex flex-wrap md:flex-col gap-2 justify-center md:justify-start">
                  <button
                    onClick={() => setActiveTab("profile")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === "profile"
                        ? "bg-primary text-button-text shadow"
                        : "bg-background border border-border text-text-primary hover:bg-primary/10"
                    }`}
                  >
                    <PersonIcon fontSize="small" />
                    <span className="hidden md:inline">
                      {t("account.profile")}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("password")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === "password"
                        ? "bg-primary text-button-text shadow"
                        : "bg-background border border-border text-text-primary hover:bg-primary/10"
                    }`}
                  >
                    <LockIcon fontSize="small" />
                    <span className="hidden md:inline">
                      {t("account.change_password")}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeTab === "orders"
                        ? "bg-primary text-button-text shadow"
                        : "bg-background border border-border text-text-primary hover:bg-primary/10"
                    }`}
                  >
                    <ReceiptLongIcon fontSize="small" />
                    <span className="hidden md:inline">
                      {t("account.orders")}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-3">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card-background rounded-lg shadow-md p-6 border border-border"
              >
                {activeTab === "profile" && (
                  <AccountDetails
                    user={user}
                    onUpdate={handleUpdateProfile}
                    setData={setUserData}
                  />
                )}

                {activeTab === "password" && (
                  <Password onChangePassword={handleChangePassword} />
                )}

                {activeTab === "orders" && (
                  <div id="orders">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">
                      {t("account.order_history")}
                    </h2>
                    {ordersLoading ? (
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Spinner /> <span>{t("account.loading")}</span>
                      </div>
                    ) : orders.length === 0 ? (
                      <p className="text-text-secondary">{t("account.no_orders") || "No orders yet."}</p>
                    ) : (
                      <ul className="space-y-4">
                        {orders.map((order) => (
                          <li key={order._id} className="border border-border rounded-lg p-4">
                            <div className="flex flex-wrap justify-between gap-2 text-sm text-text-secondary">
                              <span>#{order.orderNum || order._id}</span>
                              <span>{new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-text-primary font-medium">{t("account.total") || "Total"}: €{order.amount?.toFixed?.(2) ?? order.amount}</div>
                              <div className="flex items-center gap-3">
                                <div className="text-xs px-2 py-1 rounded bg-primary/10 text-primary capitalize">{order.status}</div>
                                {!["shipped", "delivered", "cancelled"].includes(order.status) && (
                                  <button
                                    onClick={() => cancelOrder(order._id)}
                                    disabled={cancellingId === order._id}
                                    className="text-xs px-3 py-1 rounded border border-border hover:bg-destructive/10 text-destructive disabled:opacity-50"
                                  >
                                    {cancellingId === order._id ? "Cancelling..." : "Cancel order"}
                                  </button>
                                )}
                                {order.status === "cancelled" && (
                                  <button
                                    onClick={() => deleteOrder(order._id)}
                                    disabled={deletingId === order._id}
                                    className="text-xs px-3 py-1 rounded border border-border hover:bg-muted text-text-secondary disabled:opacity-50"
                                  >
                                    {deletingId === order._id ? "Removing..." : "Remove order"}
                                  </button>
                                )}
                              </div>
                            </div>
                            {order.status === "cancelled" && (
                              <div className="mt-3 p-3 rounded border border-border bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                <p className="text-sm">{t("account.refund_info")}</p>
                                {order.refundId && (
                                  <p className="mt-1 text-xs opacity-80">
                                    Refund ID: <span className="font-mono">{order.refundId}</span>
                                  </p>
                                )}
                              </div>
                            )}
                            <div className="mt-3 divide-y divide-border">
                              {Array.isArray(order.products) && order.products.map((item, idx) => {
                                const attachments = (order.prescriptions || []).filter((p) => p.itemId === item.id);
                                const isLens = item.type === "lens";
                                return (
                                  <div key={idx} className="py-3 flex gap-3">
                                    {item.image ? (
                                      <Image
                                        src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/${item.type === "accessory" ? "accessories" : "products"}/${item.image}`}
                                        alt={item.title}
                                        className="w-16 h-16 object-contain rounded"
                                        height={64}
                                        width={64}
                                      />
                                    ) : (
                                      <div className="w-16 h-16 rounded bg-muted" />
                                    )}
                                    <div className="flex-1">
                                      <div className="flex justify-between">
                                        <div className="font-medium text-text-primary">{item.title}</div>
                                        <div className="text-sm text-text-secondary">x{item.quantity}</div>
                                      </div>
                                      <div className="text-sm text-text-secondary">€{(item.price * item.quantity).toFixed(2)}</div>
                                      {isLens && attachments.length > 0 && (
                                        <div className="mt-2 text-sm">
                                          <div className="font-medium text-text-primary mb-1">Attachments</div>
                                          <div className="flex flex-wrap gap-2">
                                            {attachments.map((a, i) => {
                                              const href = `${process.env.NEXT_PUBLIC_SERVER_URL}/${a.file}`;
                                              const isPdf = a.file?.toLowerCase?.().endsWith(".pdf");
                                              const label = a.kind === "facePhoto" ? "Face photo" : "Prescription";
                                              return (
                                                <a
                                                  key={i}
                                                  href={href}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded hover:bg-primary/5 text-sm"
                                                >
                                                  {label} {isPdf ? "(PDF)" : "(Image)"}
                                                </a>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
