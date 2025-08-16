import { useTranslation } from "react-i18next";
import { useState } from "react";
import Image from "next/image";
import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useToast } from "@/Components/Context/ToastContext";

export default function Contact() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  // Honeypot field (should remain empty)
  const [hpt, setHpt] = useState("");

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = t("contact.form.validation.name") || "Name is required";
    if (!form.email?.trim()) e.email = t("contact.form.validation.email") || "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t("contact.form.validation.email_format") || "Invalid email";
    if (!form.subject?.trim()) e.subject = t("contact.form.validation.subject") || "Subject is required";
    if (!form.message?.trim() || form.message.trim().length < 10) e.message = t("contact.form.validation.message") || "Message must be at least 10 characters";
    return e;
  };

  const onChange = (ev) => {
    const { name, value } = ev.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_SERVER_URL + "/api/contacts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone?.trim() || undefined,
          subject: form.subject.trim(),
          message: form.message.trim(),
          hpt: hpt || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || `Request failed (${res.status})`);
      }
      addToast(t("contact.form.success"), "success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      setHpt("");
    } catch (err) {
      addToast(err.message || t("contact.form.error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title={t("contact.title")}>
      {/* Hero Section */}
      <div className="relative h-[400px] flex items-center justify-center text-white">
        <Image
          src="/cover.png"
          alt="Contact Us"
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 z-0"
        />
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="relative z-20 text-center">
          <h1 className="text-5xl font-bold mb-4">{t("contact.title")}</h1>
          <p className="text-xl">{t("contact.subtitle")}</p>
        </div>
      </div>

      {/* Contact Form and Details Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h2 className="text-3xl font-bold mb-6">
              {t("contact.form.title")}
            </h2>
            <form className="space-y-6" onSubmit={onSubmit} noValidate>
              {/* Honeypot field - leave empty */}
              <input
                type="text"
                name="company"
                autoComplete="off"
                value={hpt}
                onChange={(e) => setHpt(e.target.value)}
                style={{ display: "none" }}
                tabIndex={-1}
                aria-hidden="true"
              />
              <div>
                <label
                  htmlFor="name"
                  className="block text-gray-700 font-medium mb-2"
                >
                  {t("contact.form.name")}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder={t("contact.form.name_placeholder")}
                  value={form.name}
                  onChange={onChange}
                  required
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-gray-700 font-medium mb-2"
                >
                  {t("contact.form.email")}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.email ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder={t("contact.form.email_placeholder")}
                  value={form.email}
                  onChange={onChange}
                  required
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-gray-700 font-medium mb-2">
                    {t("contact.form.phone")}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("contact.form.phone_placeholder")}
                    value={form.phone}
                    onChange={onChange}
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-gray-700 font-medium mb-2">
                    {t("contact.form.subject")}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.subject ? "border-red-400" : "border-gray-300"
                    }`}
                    placeholder={t("contact.form.subject_placeholder")}
                    value={form.subject}
                    onChange={onChange}
                    required
                  />
                  {errors.subject && (
                    <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="block text-gray-700 font-medium mb-2"
                >
                  {t("contact.form.message")}
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows="5"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.message ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder={t("contact.form.message_placeholder")}
                  value={form.message}
                  onChange={onChange}
                  required
                ></textarea>
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600">{errors.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors"
                disabled={submitting}
              >
                {submitting ? t("contact.form.submitting") || "Sending..." : t("contact.form.submit")}
              </button>
            </form>
          </div>

          {/* Contact Details and Map */}
          <div>
            <h2 className="text-3xl font-bold mb-6">
              {t("contact.info.title")}
            </h2>
            <div className="bg-gray-100 p-6 rounded-lg">
              <p className="text-gray-700 mb-4">
                <strong>{t("contact.info.address.title")}:</strong>{" "}
                {t("contact.info.address.line1")},{" "}
                {t("contact.info.address.line2")}
              </p>
              <p className="text-gray-700 mb-4">
                <strong>{t("contact.info.phone.title")}:</strong>{" "}
                {t("contact.info.phone.number")}
              </p>
              <p className="text-gray-700 mb-4">
                <strong>{t("contact.info.email.title")}:</strong>{" "}
                {t("contact.info.email.address")}
              </p>
              <div className="mt-4">
                <h3 className="font-semibold mb-2">
                  {t("contact.info.hours.title")}
                </h3>
                <p className="text-gray-700">
                  {t("contact.info.hours.weekdays")}
                </p>
                <p className="text-gray-700">
                  {t("contact.info.hours.weekend")}
                </p>
                <p className="text-gray-700">
                  {t("contact.info.hours.sunday")}
                </p>
              </div>
            </div>

            {/* Map */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">
                {t("contact.map.title")}
              </h3>
              <div className="h-[300px] rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2519.123456789012!2d4.352123!3d50.850456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTDCsDUxJzAxLjYiTiA0wrAyMScwNy42IkU!5e0!3m2!1sen!2sbe!4v1234567890123!5m2!1sen!2sbe"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
