import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import SectionHeading from "@/Components/ui/SectionHeading";
import Reveal from "@/Components/ui/Reveal";
import { tField } from "@/Components/utils/tField";
import { categoryHref } from "@/Api/links";

const Categories = ({ categories }) => {
  const { t, i18n } = useTranslation();
  if (!categories?.length) return null;

  return (
    <section className="container mx-auto px-4 py-14 md:py-20">
      <SectionHeading
        eyebrow={t("home.categories.eyebrow", "Collections")}
        title={
          <>
            {t("home.categories.title")} <span className="text-gradient">{t("home.categories.accent", "")}</span>
          </>
        }
        subtitle={t("home.categories.subtitle")}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {categories?.map((category, i) => (
          <Reveal key={category?._id} delay={(i % 5) * 0.08} y={44}>
            <Link
              href={categoryHref(category)}
              className="group relative block overflow-hidden rounded-3xl border border-white/20 shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1.5 h-56 md:h-64"
            >
              <Image
                src={process.env.NEXT_PUBLIC_SERVER_URL + "/img/category/" + category?.categoryImage}
                alt={tField(category, "name", i18n.language)}
                fill
                style={{ objectFit: "cover" }}
                className="transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-gold-soft">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="text-white font-display font-semibold text-lg leading-tight">
                    {tField(category, "name", i18n.language)}
                  </h3>
                </div>
                <span className="grid place-items-center w-10 h-10 rounded-full glass !border-white/30 text-white shrink-0 transition-all duration-300 group-hover:bg-primary group-hover:border-primary">
                  <ArrowUpRight size={17} />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default Categories;
