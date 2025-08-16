"use client";

import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function CookiePolicy() {
  const { t } = useTranslation();

  return (
    <Layout title={t("cookies.title")}>
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          {t("cookies.title")}
        </h1>

        <div className="prose prose-lg max-w-none text-text-secondary">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.what_are_cookies.title")}
            </h2>
            <p>{t("cookies.sections.what_are_cookies.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.how_we_use.title")}
            </h2>
            <p>{t("cookies.sections.how_we_use.description")}</p>
            <ul className="list-disc pl-6 mt-2">
              {t("cookies.sections.how_we_use.items", {
                returnObjects: true,
              }).map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.types.title")}
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-medium text-text-primary mb-2">
                  {t("cookies.sections.types.essential.title")}
                </h3>
                <p>{t("cookies.sections.types.essential.description")}</p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-text-primary mb-2">
                  {t("cookies.sections.types.analytics.title")}
                </h3>
                <p>{t("cookies.sections.types.analytics.description")}</p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-text-primary mb-2">
                  {t("cookies.sections.types.preference.title")}
                </h3>
                <p>{t("cookies.sections.types.preference.description")}</p>
              </div>
              <div>
                <h3 className="text-xl font-medium text-text-primary mb-2">
                  {t("cookies.sections.types.marketing.title")}
                </h3>
                <p>{t("cookies.sections.types.marketing.description")}</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.managing.title")}
            </h2>
            <p>
              {t("cookies.sections.managing.description")}{" "}
              <a
                href="https://www.aboutcookies.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover transition-colors"
              >
                www.aboutcookies.org
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.third_party.title")}
            </h2>
            <p>{t("cookies.sections.third_party.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.updates.title")}
            </h2>
            <p>{t("cookies.sections.updates.description")}</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">
              {t("cookies.sections.contact.title")}
            </h2>
            <p>{t("cookies.sections.contact.description")}</p>
            <div className="mt-4">
              <p>{t("cookies.sections.contact.email")}</p>
              <p>{t("cookies.sections.contact.phone")}</p>
              <p>{t("cookies.sections.contact.address")}</p>
            </div>
          </section>

          <section>
            <p className="text-sm text-text-muted">
              {t("cookies.last_updated")} {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
