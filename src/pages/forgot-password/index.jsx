import { useState } from "react";
import Layout from "@/Components/Layout/Layout";
import { useToast } from "@/Components/Context/ToastContext";
import { useTranslation } from "react-i18next";
import axios from "axios";

export default function ForgotPassword() {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!email) {
      setErrors({ email: t("auth.email_required") || "Email is required" });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/forgotPassword`, { email });
      addToast(t("auth.forgot.sent") || "If that email exists, we've sent reset instructions.", "success");
      setEmail("");
    } catch (err) {
      const msg = err?.response?.data?.message || t("auth.forgot.error") || "Failed to send reset email";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title={t("auth.forgot.title") || "Forgot Password"}>
      <section className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card-background border border-border rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">{t("auth.forgot.title")}</h1>
          <p className="text-text-secondary mb-6">{t("auth.forgot.subtitle")}</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block mb-1">{t("auth.email")}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e)=>{ setEmail(e.target.value); setErrors({}); }}
                className={`w-full rounded border px-3 py-2 bg-white text-black ${errors.email ? 'border-red-400' : 'border-border'}`}
                placeholder={t("auth.email_placeholder") || "you@example.com"}
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-70"
            >
              {submitting ? (t("auth.forgot.sending") || "Sending...") : (t("auth.forgot.send") || "Send Reset Link")}
            </button>
          </form>
        </div>
      </section>
    </Layout>
  );
}
