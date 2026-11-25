// pages/login.js
import axios from "axios";
import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "@/Components/Layout/Layout";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useToast } from "@/Components/Context/ToastContext";
import { useTranslation } from "react-i18next";
import Spinner from "@/Components/Spinner/Spinner";
import ButtonSpinner from "@/Components/Spinner/ButtonSpinner";
import GoogleLoginButton from "@/Components/Auth/GoogleLoginButton";
import Logo from "@/Components/ui/Logo";

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoggedIn, login } = useContext(AuthContext);
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/");
    }
  }, [isLoggedIn, router]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setErrors({}); // Clear all errors when typing
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setErrors({}); // Clear all errors when typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Basic validation
    const validationErrors = {};
    if (!email) validationErrors.email = t("auth.email_required");
    if (!password) validationErrors.password = t("auth.password_required");

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/login`,
        {
          email,
          password,
        }
      );

      if (response.data.status === "success") {
        login(response.data.data.user, response.data.token);
        addToast(t("auth.login_success"), "success");
        router.push("/");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || t("auth.login_error");
      setErrors({ submit: errorMessage });
      addToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoggedIn) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("auth.login")}>
      <section className="relative min-h-screen grid p-4 md:p-10 overflow-hidden">
        <div className="aurora w-[420px] h-[420px] -left-32 top-10 bg-primary/15 animate-aurora" />
        <div className="aurora w-[360px] h-[360px] -right-24 bottom-0 bg-gold/15 animate-aurora" />
        {/* Main Content */}
        <div className="relative container mx-auto flex flex-col md:flex-row items-center justify-center gap-8 min-h-[80vh]">
          {/* Form Section */}
          <form
            onSubmit={handleSubmit}
            className="glass-card p-8 md:p-10 w-full max-w-md"
          >
            <span className="eyebrow justify-center">Welcome back</span>
            <h2 className="text-3xl text-center text-text-primary mt-2 mb-6">
              {t("auth.login")}
            </h2>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 px-4 py-3 rounded-2xl mb-4 text-sm">
                <p>{errors.submit}</p>
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-primary"
              >
                {t("auth.email")}
              </label>
              <input
                type="email"
                id="email"
                placeholder={t("auth.email_placeholder")}
                value={email}
                onChange={handleEmailChange}
                className="mt-1.5 block w-full px-4 py-3 border border-input-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-input-background text-text-primary transition-all"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-primary"
              >
                {t("auth.password")}
              </label>
              <input
                type="password"
                id="password"
                placeholder={t("auth.password_placeholder")}
                value={password}
                onChange={handlePasswordChange}
                className="mt-1.5 block w-full px-4 py-3 border border-input-border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-input-background text-text-primary transition-all"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="mb-4 text-right">
              <Link
                href="/forgot-password"
                className="text-primary hover:text-primary-hover transition-colors text-sm"
              >
                {t("auth.forgot_password")}
              </Link>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-luxe w-full !py-3.5 disabled:opacity-50"
              >
                {isLoading ? <ButtonSpinner /> : t("auth.login_btn")}
              </button>
            </div>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <span className="px-4 text-xs font-bold tracking-widest uppercase text-text-muted">{t("auth.or")}</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            {/* Google Login Button */}
            <div className="mb-4">
              <GoogleLoginButton disabled={isLoading} />
            </div>

            {/* Register Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-text-secondary">
                {t("auth.dont_have_account")}{" "}
                <Link
                  href="/register"
                  className="text-primary hover:text-primary-hover transition-colors"
                >
                  {t("auth.register")}
                </Link>
                .
              </p>
            </div>
          </form>

          {/* Right Section (Editorial panel) */}
          <div className="hidden md:flex w-1/2 min-h-[540px] relative rounded-[2rem] overflow-hidden bg-[#141210] dark:bg-black text-white">
            <div className="aurora w-[300px] h-[300px] -left-16 -top-16 bg-primary/30 animate-aurora" />
            <div className="aurora w-[260px] h-[260px] -right-12 -bottom-12 bg-gold/25 animate-aurora" />
            {/* oversized watermark */}
            <span className="absolute -bottom-8 -right-2 font-display font-bold text-[11rem] leading-none text-white/5 select-none">
              MHS
            </span>
            <div className="relative flex flex-col justify-between p-10 w-full">
              <Logo size={44} tone="light" />
              <div>
                <p className="font-display text-3xl leading-snug italic text-white/95">
                  “Elegance is refusal — see everything, settle for nothing.”
                </p>
                <div className="flex gap-6 mt-6 text-sm">
                  {[
                    ["4.9★", t("auth.social_proof.rating", "loved by customers")],
                    ["2yr", t("auth.social_proof.warranty", "full warranty")],
                    ["30d", t("auth.social_proof.returns", "free returns")],
                  ].map(([v, l]) => (
                    <div key={l}>
                      <p className="font-display text-2xl text-gold-soft">{v}</p>
                      <p className="text-white/55 text-xs mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
