import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function ReturnPolicy() {
  const { t } = useTranslation();

  return (
    <Layout title={t("returns.title") || "Return Policy"}>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          {t("returns.title")}
        </h1>
        <section className="bg-purple-950 shadow-lg rounded-lg p-6 space-y-4">
          <p className="text-gray-400">{t("returns.intro")}</p>
          <h2 className="text-2xl font-semibold mt-4">
            {t("returns.conditionsTitle")}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>{t("returns.condition1")}</li>
            <li>{t("returns.condition2")}</li>
            <li>{t("returns.condition3")}</li>
          </ul>
          <h2 className="text-2xl font-semibold mt-4">{t("returns.processTitle")}</h2>
          <ol className="list-decimal pl-6 space-y-2 text-gray-400">
            <li>{t("returns.step1")}</li>
            <li>{t("returns.step2")}</li>
            <li>{t("returns.step3")}</li>
          </ol>
          <p className="text-gray-400 italic">{t("returns.note_returns")}</p>
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}

// export async function getStaticProps({ locale }) {
//   return {
//     props: {
//       ...(await serverSideTranslations(locale, ["return-policy"])),
//     },
//   };
// }
