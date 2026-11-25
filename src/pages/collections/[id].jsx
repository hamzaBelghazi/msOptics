import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Layout from "@/Components/Layout/Layout";
import ProductsCard, { ProductsCardSkeleton } from "@/Components/utils/ProductsCard";
import SectionHeading from "@/Components/ui/SectionHeading";
import Reveal from "@/Components/ui/Reveal";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { adminApi, imgUrl } from "@/Api/adminApi";
import { tField } from "@/Components/utils/tField";
import axios from "@/Api/axiosConfig";

export default function CollectionPage() {
  const router = useRouter();
  const { id } = router.query;
  const { t, i18n } = useTranslation();
  const [collection, setCollection] = useState(null);
  const colName = tField(collection, "name", i18n.language);
  const colDesc = tField(collection, "desc", i18n.language);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      adminApi.collections.get(id).catch(() => null),
      axios.get("/products", { params: { collections: id, limit: 48 } })
        .then((r) => r.data?.data?.data || [])
        .catch(() => []),
    ])
      .then(([col, items]) => {
        setCollection(col);
        setProducts(items);
        // the API answers for an id too; move the address bar to the slug once
        if (col?.slug && id !== col.slug) {
          router.replace(`/collections/${col.slug}`);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout title={colName || t("collection.title", "Collection")}>
      <div className="min-h-screen">
        {/* hero */}
        <section className="container mx-auto px-4 mt-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#141210] dark:bg-black text-white">
            <div className="aurora w-[380px] h-[380px] -left-24 -top-24 bg-primary/30 animate-aurora" />
            <div className="aurora w-[300px] h-[300px] -right-16 -bottom-20 bg-gold/25 animate-aurora" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-8 md:p-12">
              <div>
                <span className="eyebrow !text-gold-soft">{t("collection.eyebrow", "Curated edit")}</span>
                <h1 className="text-white mt-3">{loading ? "…" : colName || t("collection.title", "Collection")}</h1>
                {colDesc && (
                  <p className="text-white/65 mt-3 max-w-md">{colDesc}</p>
                )}
                <div className="mt-5 inline-flex items-center gap-2 glass !bg-white/10 !border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white">
                  ✦ {products.length} {t("collection.frames", "frames")}
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-xl min-h-[220px]">
                {collection?.collectionImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl("collection", collection.collectionImage)}
                    alt={colName || ""}
                    className="w-full h-64 md:h-80 object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* grid */}
        <section className="container mx-auto px-4 my-10">
          <SectionHeading
            eyebrow={t("collection.grid_eyebrow", "Shop the edit")}
            title={t("collection.grid_title", "Pieces")}
          />
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <ProductsCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p, i) => (
                <Reveal key={p._id} delay={(i % 4) * 0.07} y={40}>
                  <ProductsCard item={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="glass-card p-12 text-center max-w-md mx-auto">
              <span className="text-5xl">👓</span>
              <h3 className="font-display text-2xl text-text-primary mt-4">
                {t("collection.empty", "No pieces yet")}
              </h3>
            </div>
          )}
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
