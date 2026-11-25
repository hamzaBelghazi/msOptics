import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import PriceTag from "../utils/PriceTag";
import SectionHeading from "@/Components/ui/SectionHeading";
import Reveal from "@/Components/ui/Reveal";
import { tField } from "../utils/tField";

const HomeAccessories = ({ accessories: accs }) => {
  const { t, i18n } = useTranslation();
  if (!accs?.length) return null;

  return (
    <div>
      <SectionHeading
        eyebrow={t("accessories.eyebrow", "Finishing touches")}
        title={t("accessories.title")}
        subtitle={t("accessories.description")}
        href="/accessories"
        linkLabel={t("home.view_all", "View all")}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accs.map((item, i) => (
          <Reveal key={item._id} delay={(i % 3) * 0.08}>
            <Link href={`/accessories/${item._id}`} className="block group">
              <div className="glass-card overflow-hidden transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lg">
                <div className="relative h-72 w-full overflow-hidden">
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${item.images[0]}`}
                    alt={tField(item, "name", i18n.language)}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <span className="absolute top-3 right-3 grid place-items-center w-10 h-10 rounded-full glass !border-white/30 text-white transition-all duration-300 group-hover:bg-primary group-hover:border-primary">
                    <ArrowUpRight size={17} />
                  </span>
                  <span className="absolute bottom-3 left-3 glass rounded-full px-3.5 py-1.5 text-sm font-extrabold text-text-primary">
                    <PriceTag amount={item.price} />
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-semibold text-text-primary group-hover:text-primary transition-colors">
                    {tField(item, "name", i18n.language)}
                  </h3>
                </div>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
};

export default HomeAccessories;
