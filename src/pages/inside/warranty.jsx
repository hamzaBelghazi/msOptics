import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function Warranty() {
  const { t } = useTranslation();

  return (
    <Layout title={t("warranty.title") || "Warranty"}>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          {t("warranty.title")}
        </h1>
        <section className="bg-purple-950 shadow-lg rounded-lg p-6 space-y-4">
          <p className="text-gray-400">{t("warranty.intro")}</p>
          <h2 className="text-2xl font-semibold mt-4">{t("warranty.coverageTitle")}</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>{t("warranty.coverage1")}</li>
            <li>{t("warranty.coverage2")}</li>
            <li>{t("warranty.coverage3")}</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-4">
            {t("warranty.exclusionsTitle")}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>{t("warranty.exclusion1")}</li>
            <li>{t("warranty.exclusion2")}</li>
          </ul>
          <p className="text-gray-400 italic">{t("warranty.note_warranty")}</p>
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
