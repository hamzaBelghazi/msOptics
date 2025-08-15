import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import PriceTag from "../utils/PriceTag";

const HomeAccessories = ({ accessories: accs }) => {
  const { t } = useTranslation();



  return (
    <section className="w-full py-12 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-text-primary mb-8 text-center">
          {t("accessories.title")}
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-2xl mx-auto">
          {t("accessories.description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {accs && accs.map((item) => (
            <Link
              href={`/accessories/${item._id}`}
              key={item._id}
              className="block"
            >
              <div className="group bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:transform hover:-translate-y-1 border border-gray-100">
                <div className="relative h-72 w-full overflow-hidden">
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors duration-300 z-10" />
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/accessories/${item.images[0]}`}
                    alt={item.name}
                    fill
                    className="object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 bg-gradient-to-b from-white to-gray-50">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-lg font-medium text-primary">
                    <PriceTag amount={item.price} />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeAccessories;
