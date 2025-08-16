import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@/Components/Layout/Layout";
import { useToast } from "@/Components/Context/ToastContext";
import { useTranslation } from "react-i18next";
import axios from "axios";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const { addToast } = useToast();
  const { t } = useTranslation();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setErrors({});
  }, [password, passwordConfirm]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!password) v.password = t("auth.password_required") || "Password is required";
    if (!passwordConfirm) v.passwordConfirm = t("auth.password_confirm_required") || "Confirm your password";
    if (password && passwordConfirm && password !== passwordConfirm) v.passwordConfirm = t("auth.passwords_must_match") || "Passwords must match";
    if (Object.keys(v).length) { setErrors(v); return; }

    if (!token) { addToast("Invalid or missing token", "error"); return; }

    setSubmitting(true);
    try {
      await axios.patch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/resetPassword/${token}`, {
        password,
        passwordConfirm
      });
      addToast(t("auth.reset.success") || "Password has been reset. You can now log in.", "success");
      router.replace("/login");
    } catch (err) {
      const msg = err?.response?.data?.message || t("auth.reset.error") || "Failed to reset password";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title={t("auth.reset.title")}>
      <section className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card-background border border-border rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">{t("auth.reset.title") || "Reset Password"}</h1>
          <p className="text-text-secondary mb-6">{t("auth.reset.subtitle") || "Enter your new password."}</p>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="password" className="block mb-1">{t("auth.new_password") || "New Password"}</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e)=> setPassword(e.target.value)}
                className={`w-full rounded border px-3 py-2 bg-white text-black ${errors.password ? 'border-red-400' : 'border-border'}`}
                placeholder={t("auth.new_password_placeholder") || "••••••••"}
              />
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="passwordConfirm" className="block mb-1">{t("auth.confirm_password") || "Confirm Password"}</label>
              <input
                id="passwordConfirm"
                type="password"
                value={passwordConfirm}
                onChange={(e)=> setPasswordConfirm(e.target.value)}
                className={`w-full rounded border px-3 py-2 bg-white text-black ${errors.passwordConfirm ? 'border-red-400' : 'border-border'}`}
                placeholder={t("auth.confirm_password_placeholder") || "••••••••"}
              />
              {errors.passwordConfirm && <p className="text-sm text-red-500 mt-1">{errors.passwordConfirm}</p>}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-70"
            >
              {submitting ? (t("auth.reset.saving") || "Saving...") : (t("auth.reset.save") || "Save New Password")}
            </button>
          </form>
        </div>
      </section>
    </Layout>
  );
}
