// pages/register.js
import axios from "axios";
import { useContext, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import { signupValidation } from "@/Components/utils/registerValidation";
import Link from "next/link";
import Layout from "@/Components/Layout/Layout";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import ButtonSpinner from "@/Components/Spinner/ButtonSpinner";
import { AuthContext } from "@/Components/Context/AuthContext";

export default function Register() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const auth = useContext(AuthContext);
  const [firstname, setFirstName] = useState("");
  const [lastname, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const data = {
      firstName: firstname,
      lastName: lastname,
      passwordConfirm: confirmPassword,
      email: email,
      password: password,
    };

    const error = signupValidation(data);
    setErrors(error);

    if (Object.keys(error).length !== 0) {
      return;
    }

    setIsLoading(true);
    axios
      .post(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/signup`, data)
      .then((response) => {
        console.log(response.data);
        auth.login(response.data.data.user, response.data.token);
        router.push("/"); // Redirect to home page after registration
      })
      .catch((error) => {
        const err = {};
        err.api = error.response?.data?.message || error.message;
        setErrors(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <Layout>
      <section className="min-h-screen p-10 grid grid-col-2">
        {/* Logo */}
        <div className="container mx-auto text-center py-8">
          <Link href="/">
            <Image
              src={"/images/logo.png"}
              alt="Logo"
              width={160}
              height={50}
              className="mx-auto cursor-pointer"
            />
          </Link>
        </div>

        {/* Main Content */}
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-center min-h-[80vh]">
          {/* Form Section */}
          <form
            onSubmit={handleSubmit}
            className="bg-card-background p-8 rounded-lg shadow-md w-full max-w-md"
          >
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Signup
            </h2>

            {/* Error Message */}
            {errors.api && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{errors.api}</p>
              </div>
            )}

            {/* First Name */}
            <div className="mb-4">
              <label
                htmlFor="firstname"
                className="block text-sm font-medium text-text-primary"
              >
                {t("auth.first_name")}
              </label>
              <input
                type="text"
                id="firstname"
                placeholder={t("auth.firstName_placeholder")}
                value={firstname}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input-background text-text-primary"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="mb-4">
              <label
                htmlFor="lastname"
                className="block text-sm font-medium text-text-primary"
              >
                {t("auth.last_name")}
              </label>
              <input
                type="text"
                id="lastname"
                placeholder={t("auth.lastName_placeholder")}
                value={lastname}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input-background text-text-primary"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>

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
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input-background text-text-primary"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label
                htmlFor="confirmpassword"
                className="block text-sm font-medium text-text-primary"
              >
                {t("auth.confirm_pass_label")}
              </label>
              <input
                type="password"
                id="confirmpassword"
                placeholder={t("auth.password_repeat_placeholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-input-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input-background text-text-primary"
              />
              {errors.passwordConfirm && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.passwordConfirm}
                </p>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="mb-4 text-center">
              <label className="text-sm text-text-secondary">
                {t("auth.register_notice")}{" "}
                <Link
                  href="/inside/terms"
                  className="text-primary hover:text-primary-hover transition-colors"
                >
                  {t("auth.terms_condition")}
                </Link>
                .
              </label>
            </div>

            {/* Submit Button */}
            <div className="text-center">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-button-text py-2 px-4 rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {isLoading ? <ButtonSpinner /> : t("auth.Signup_btn")}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-text-secondary">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-primary hover:text-primary-hover transition-colors"
                >
                  Login
                </Link>
                .
              </p>
            </div>
          </form>
          {/* Right Section (Decorative Background) */}

          <div className="hidden md:block w-1/2 h-full relative rounded-lg ml-8 overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-300 to-purple-500"></div>

            {/* Animated Circles */}
            <motion.div
              className="absolute w-32 h-32 bg-white/20 rounded-full"
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
              className="absolute w-24 h-24 bg-white/30 rounded-full"
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
              className="absolute w-1 h-48 bg-white/50"
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
              className="absolute w-48 h-1 bg-white/50"
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
