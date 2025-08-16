import Layout from "@/Components/Layout/Layout";

import { useTranslation } from "react-i18next";
import Image from "next/image";
import FloatingCartButton from "@/Components/utils/floatingCart";

export default function About() {
  const { t } = useTranslation();

  return (
    <Layout title={t("about_us")}>
      {/* Hero Section */}
      <div className="relative h-[400px] flex items-center justify-center text-white">
        <Image
          src="/cover.png" 
          alt="About Us"
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 z-0"
        />
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="relative z-20 text-center">
          <h1 className="text-5xl font-bold mb-4">{t("about_us.title")}</h1>
          <p className="text-xl">{t("about_us.cta_subtitle")}</p>
        </div>
      </div>

      {/* Story Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative h-[400px] rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/about.png" // Replace with your store image
              alt="MHS Optics Store"
              layout="fill"
              objectFit="cover"
            />
          </div>

          {/* Content */}
          <div>
            <h2 className="text-3xl font-bold mb-6">
              {t("about_us.who_we_are")}
            </h2>
            <p className="text-gray-700 mb-4">
              {t("about_us.about_content_1")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("about_us.about_content_2")}
            </p>
            <p className="text-gray-700 mb-4">
              {t("about_us.about_content_3")}
            </p>
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-2">
                {t("about_us.visit_us")}
              </h3>
              <p className="text-gray-700">{t("about_us.store_address")}</p>
              <a
                href="https://maps.google.com" // Replace with your store's Google Maps link
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition-colors"
              >
                {t("about_us.get_directions")}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-500 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t("about_us.join_our_community")}
          </h2>
          <p className="text-gray-300 mb-8">{t("about_us.cta_subtitle")}</p>
          <a
            href="/inside/contact"
            className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition-colors"
          >
            {t("contact.title")}
          </a>
        </div>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
