import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "react-i18next";

const Categories = ({ categories }) => {
  const { t } = useTranslation();

  return (
    <section className="container mx-auto px-4 py-12">
      {/* Section Title */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-text-primary">
          {t("Shop by Category")}
        </h2>
        <p className="mt-2 text-gray-400">
          {t("Explore our wide range of products by category.")}
        </p>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {categories?.map((category) => (
          <Link
            key={category?._id}
            href={`/category/${category?._id}`}
            className="group relative overflow-hidden rounded-lg shadow-md transition-transform duration-300 hover:scale-105"
          >
            {/* Category Image */}
            <div className="relative w-full h-48">
              <Image
                src={
                  process.env.NEXT_PUBLIC_SERVER_URL +
                  "/img/category/" +
                  category?.categoryImage
                }
                alt={category?.name}
                fill
                style={{ objectFit: "cover" }}
                className="group-hover:opacity-90"
              />
            </div>
            {/* Overlay with Category Name */}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <h3 className="text-white text-lg font-semibold">
                {category?.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default Categories;
