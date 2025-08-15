"use client";

import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function TermsOfService() {
  const { t } = useTranslation();

  return (
    <Layout title={t("terms.title") || "Terms of Service"}>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          {t("terms.title")}
        </h1>

        <div className="prose prose-lg max-w-none text-text-secondary">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.acceptance.title")}
            </h2>
            <p>{t("terms.sections.acceptance.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.use_of_services.title")}
            </h2>
            <p>{t("terms.sections.use_of_services.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {t("terms.sections.use_of_services.items", {
                returnObjects: true,
              }).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.product_information.title")}
            </h2>
            <p>{t("terms.sections.product_information.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.orders_payment.title")}
            </h2>
            <p>{t("terms.sections.orders_payment.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {t("terms.sections.orders_payment.items", {
                returnObjects: true,
              }).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.intellectual_property.title")}
            </h2>
            <p>{t("terms.sections.intellectual_property.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.limitation_liability.title")}
            </h2>
            <p>{t("terms.sections.limitation_liability.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.changes_terms.title")}
            </h2>
            <p>{t("terms.sections.changes_terms.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("terms.sections.contact.title")}
            </h2>
            <p>{t("terms.sections.contact.description")}</p>
            <div className="mt-4">
              <p>{t("terms.sections.contact.email")}</p>
              <p>{t("terms.sections.contact.phone")}</p>
              <p>{t("terms.sections.contact.address")}</p>
            </div>
          </section>

          <section>
            <p className="text-sm text-text-muted">
              {t("privacy.last_updated")} {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
