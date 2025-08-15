"use client";

import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  const renderItems = (items) => {
    if (!items || !Array.isArray(items)) return null;
    return items.map((item, index) => <li key={index}>{item}</li>);
  };

  return (
    <Layout title={t("privacy.title") || "Privacy Policy"}>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          {t("privacy.title")}
        </h1>

        <div className="prose prose-lg max-w-none text-text-secondary">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("privacy.sections.information_collection.title")}
            </h2>
            <p>{t("privacy.sections.information_collection.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {renderItems(
                t("privacy.sections.information_collection.items", {
                  returnObjects: true,
                })
              )}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("privacy.sections.information_usage.title")}
            </h2>
            <p>{t("privacy.sections.information_usage.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {renderItems(
                t("privacy.sections.information_usage.items", {
                  returnObjects: true,
                })
              )}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("privacy.sections.information_sharing.title")}
            </h2>
            <p>{t("privacy.sections.information_sharing.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {renderItems(
                t("privacy.sections.information_sharing.items", {
                  returnObjects: true,
                })
              )}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("privacy.sections.your_rights.title")}
            </h2>
            <p>{t("privacy.sections.your_rights.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {renderItems(
                t("privacy.sections.your_rights.items", { returnObjects: true })
              )}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("privacy.sections.data_security.title")}
            </h2>
            <p>{t("privacy.sections.data_security.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("privacy.sections.contact.title")}
            </h2>
            <p>{t("privacy.sections.contact.description")}</p>
            <div className="mt-4">
              <p>{t("privacy.sections.contact.email")}</p>
              <p>{t("privacy.sections.contact.phone")}</p>
              <p>{t("privacy.sections.contact.address")}</p>
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
