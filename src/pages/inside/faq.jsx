import Layout from "@/Components/Layout/Layout";
import Accordion from "@/Components/utils/Accordion";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function FAQ() {
  const { t } = useTranslation();

  return (
    <Layout title={t("faq.title")}>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-center mb-8">{t("faq.title")}</h1>
        <div className="space-y-4 max-w-[720px] mx-auto">
          {(() => {
            const raw = t("faq.items", { returnObjects: true });
            const items = Array.isArray(raw) ? raw : Object.values(raw || {});
            return items.map((item, index) => (
              <Accordion
                key={index}
                question={item.question}
                answer={item.answer}
              />
            ));
          })()}
        </div>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
