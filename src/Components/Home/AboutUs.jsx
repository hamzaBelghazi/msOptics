import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function AboutUs() {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-2">
      <div className="md:w-1/2">
        <Image
          src="/about.png" 
          alt="About Us"
          width={500}
          height={400}
          className="rounded-lg"
        />
      </div>
      <div className="md:w-1/2 md:pl-8 mt-8 md:mt-0">
        <h2 className="text-3xl font-bold mb-4">{t("about_us.title")}</h2>
        <p className="text-text-secondary mb-4">
          {t("about_us.description")}
        </p>
        <Link href="/inside/about" className="text-blue-600 hover:underline">
          {t("about_us.learn_more")}
        </Link>
      </div>
    </div>
  );
}
