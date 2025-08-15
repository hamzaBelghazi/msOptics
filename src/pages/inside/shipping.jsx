import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { useTranslation } from "react-i18next";

export default function ShippingDelivery() {
  const { t } = useTranslation();

  return (
    <Layout title={t("shipping.title") || "Shipping & Delivery"}>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-4xl font-bold text-center mb-8">
          {t("shipping.title") || "Shipping & Delivery"}
        </h1>
        <section className="bg-purple-900 shadow-lg rounded-lg p-6 space-y-4">
          <p className="text-gray-400">
            {t("shipping.intro") ||
              "We offer reliable shipping options to ensure your order arrives on time and in perfect condition."}
          </p>
          <h2 className="text-2xl font-semibold mt-4">
            {t("shipping.options_title") || "Shipping Options"}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-400">
            <li>
              {t("shipping.option1") ||
                "Standard Shipping (3-5 business days)"}
            </li>
            <li>
              {t("shipping.option2") || "Express Shipping (1-2 business days)"}
            </li>
            <li>
              {t("shipping.option3") || "International Shipping (7-14 days)"}
            </li>
          </ul>
          <h2 className="text-2xl font-semibold mt-4">
            {t("shipping.delivery_time_title") || "Delivery Time"}
          </h2>
          <p className="text-gray-400">
            {t("shipping.delivery_time_content") ||
              "Delivery times vary depending on your location and selected shipping method."}
          </p>
          <h2 className="text-2xl font-semibold mt-4">
            {t("shipping.costs_title") || "Shipping Costs"}
          </h2>
          <p className="text-gray-400">
            {t("shipping.costs_content") ||
              "Shipping costs are calculated at checkout based on destination and package weight."}
          </p>
          <p className="text-gray-400 italic">
            {t("shipping.note") ||
              "Note: Delivery times may be affected by holidays and unforeseen events."}
          </p>
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
