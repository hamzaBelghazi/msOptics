// pages/login.js
import axios from "axios";
import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import Layout from "@/Components/Layout/Layout";
import { AuthContext } from "@/Components/Context/AuthContext";
import { useToast } from "@/Components/Context/ToastContext";
import { useTranslation } from "react-i18next";
import Spinner from "@/Components/Spinner/Spinner";
import ButtonSpinner from "@/Components/Spinner/ButtonSpinner";

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
      <section className="min-h-screen grid p-2 md:p-10">
        {/* Main Content */}
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center min-h-[80vh]">
          {/* Form Section */}
          <form
            onSubmit={handleSubmit}
            className="bg-card-background p-8 rounded-lg shadow-md w-full max-w-md border border-border"
          >
            <h2 className="text-2xl font-bold text-center text-text-primary mb-6">
              {t("auth.login")}
            </h2>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 transform transition-all duration-300 ease-in-out opacity-100 translate-y-0">
                <p className="transition-opacity duration-300">
                  {errors.submit}
                </p>
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
                className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input-background text-text-primary"
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
                className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input-background text-text-primary"
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
                className="w-full bg-primary text-button-text py-2 px-4 rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isLoading ? <ButtonSpinner /> : t("auth.login_btn")}
              </button>
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

          {/* Right Section (Decorative Background with Animations) */}
          <div className="hidden md:block w-1/2 h-full relative rounded-lg ml-8 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40"></div>

            {/* Animated Circles */}
            <motion.div
              className="absolute w-32 h-32 bg-primary/10 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{ top: "10%", left: "20%" }}
            ></motion.div>

            <motion.div
              className="absolute w-24 h-24 bg-primary/20 rounded-full"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{ bottom: "20%", right: "10%" }}
            ></motion.div>

            {/* Animated Lines */}
            <motion.div
              className="absolute w-1 h-48 bg-primary/30"
              initial={{ height: 0 }}
              animate={{ height: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{ top: "10%", left: "50%" }}
            ></motion.div>

            <motion.div
              className="absolute w-48 h-1 bg-primary/30"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{ top: "50%", right: "10%" }}
            ></motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
