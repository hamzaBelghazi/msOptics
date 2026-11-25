import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import ProductsCard, {
  ProductsCardSkeleton,
} from "../../Components/utils/ProductsCard";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import Layout from "@/Components/Layout/Layout";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { genderOptions, frameTypeOptions, shapeOptions, materialOptions, colorOptions as colorOptionList } from "@/constants/productFilters";

export default function Item() {
  const { t } = useTranslation();
  const [allProducts, setAllProducts] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null); // State for dropdown toggling
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // Filter state
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedFrameTypes, setSelectedFrameTypes] = useState([]);
  const [selectedShapes, setSelectedShapes] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);

  const toggleFromList = (setter) => (value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  // Get the `type` parameter from Next.js dynamic routing
  const router = useRouter();
  const type = router.query.type;

  // Server pagination
  const API_LIMIT = 12;
  const [apiPage, setApiPage] = useState(1);
  const [hasMoreApi, setHasMoreApi] = useState(true);
  const fetchingRef = useRef(false);
  const sentinelRef = useRef(null);
  const filtersRef = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Build server-side filter params
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (selectedGenders.length) params.set('productGender', selectedGenders.join(','));
    if (selectedFrameTypes.length) params.set('frameType', selectedFrameTypes.join(','));
    if (selectedShapes.length) params.set('shape', selectedShapes.join(','));
    if (selectedColors.length) params.set('colors', selectedColors.join(','));
    if (selectedMaterials.length) params.set('frameMatirial', selectedMaterials.join(','));
    return params.toString();
  };

  // Fetch first page whenever type or filters change
  useEffect(() => {
    if (!type) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setIsLoading(true);
        fetchingRef.current = true;
        setLoadingMore(true);
        const typeParam = type === 'sunglasses' ? 'sunglasses' : 'prescription';
        const qs = buildFilterParams();
        const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/${typeParam}?limit=${API_LIMIT}&page=1${qs ? `&${qs}` : ''}`;
        const res = await axios.get(url, { signal: controller.signal });
        const items = Array.isArray(res?.data?.products) ? res.data.products : [];
        setAllProducts(items);
        setApiPage(1);
        setHasMoreApi(items.length >= API_LIMIT);
      } catch (err) {
        if (axios.isCancel?.(err)) return;
        console.error(err);
        setAllProducts([]);
        setApiPage(1);
        setHasMoreApi(false);
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    };
    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, selectedGenders.join(','), selectedFrameTypes.join(','), selectedShapes.join(','), selectedColors.join(','), selectedMaterials.join(',')]);

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  // Generate skeleton array
  const skeletonArray = Array(8).fill(null);

  // Infinite scroll using server pagination
  const fetchNextPage = async () => {
    try {
      if (fetchingRef.current || loadingMore || !hasMoreApi) return;
      fetchingRef.current = true;
      setLoadingMore(true);
      const next = apiPage + 1;
      const typeParam = type === 'sunglasses' ? 'sunglasses' : 'prescription';
      const qs = buildFilterParams();
      const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/${typeParam}?limit=${API_LIMIT}&page=${next}${qs ? `&${qs}` : ''}`;
      const res = await axios.get(url);
      const newItems = Array.isArray(res?.data?.products) ? res.data.products : [];
      if (newItems.length > 0) {
        setAllProducts((prev) => {
          const seen = new Set(prev.map((p) => p?._id || p?.id));
          const toAdd = newItems.filter((p) => {
            const key = p?._id || p?.id;
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...prev, ...toAdd];
        });
        setApiPage(next);
      }
      setHasMoreApi(newItems.length >= API_LIMIT);
    } catch (e) {
      console.error(e);
      setHasMoreApi(false);
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!sentinelRef.current) return;
    // Avoid auto-triggering while first page is being fetched
    if (isLoading) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (
          entry.isIntersecting &&
          hasMoreApi &&
          !loadingMore &&
          !fetchingRef.current
        ) {
          fetchNextPage();
        }
      });
    }, { rootMargin: '600px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreApi, loadingMore, isLoading, type, selectedGenders.join(','), selectedFrameTypes.join(','), selectedShapes.join(','), selectedColors.join(','), selectedMaterials.join(',')]);

  // Close open filter dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (!openDropdown) return;
      const node = filtersRef.current;
      if (node && !node.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [openDropdown]);

  return (
    <Layout title={t("glassesType", { type: type })}>
      <div className="min-h-screen">
        {/* Banner Section */}
        <section className="container mx-auto px-4 mt-6">
          <div className="relative overflow-hidden rounded-[2rem] bg-[#141210] dark:bg-black text-white">
            <div className="aurora w-[380px] h-[380px] -left-24 -top-24 bg-primary/30 animate-aurora" />
            <div className="aurora w-[300px] h-[300px] -right-16 -bottom-20 bg-gold/25 animate-aurora" />
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center p-8 md:p-12">
              <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-xl">
                <Image
                  src={
                    type === "sunglasses"
                      ? "/images/sunglasses.svg"
                      : "/images/identifletters.jpg"
                  }
                  alt="Banner"
                  width={500}
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <div className="relative">
                <span className="eyebrow !text-gold-soft">
                  {t("shop.eyebrow", "The collection")}
                </span>
                <h1 className="text-white mt-3">
                  {type === "sunglasses" ? "Sunglasses" : "Optical"}
                </h1>
                <p className="text-white/65 mt-3 max-w-md">
                  {t("shop.subtitle", "Hand-finished frames, prescription-ready, delivered to your door.")}
                </p>
                <div className="mt-5 inline-flex items-center gap-2 glass !bg-white/10 !border-white/20 rounded-full px-4 py-2 text-xs font-bold text-white">
                  ✦ {allProducts.length} {t("shop.frames", "frames")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section ref={filtersRef} className="container mx-auto px-4 my-8">
          <div className="glass rounded-3xl px-4 py-3.5 flex flex-wrap justify-center gap-2.5 sticky top-20 z-30">
            {[
              { key: "gender", label: t("gender"), options: genderOptions, selected: selectedGenders, set: setSelectedGenders },
              { key: "frameType", label: t("Frame_type"), options: frameTypeOptions, selected: selectedFrameTypes, set: setSelectedFrameTypes },
              { key: "shape", label: t("Shapes"), options: shapeOptions, selected: selectedShapes, set: setSelectedShapes },
              { key: "color", label: t("Frame_colour"), options: colorOptionList.map((c) => ({ value: c, label: c })), selected: selectedColors, set: setSelectedColors },
              { key: "material", label: t("Frame_material"), options: materialOptions, selected: selectedMaterials, set: setSelectedMaterials },
            ].map((f) => (
              <div key={f.key} className="relative">
                <button
                  onClick={() => toggleDropdown(f.key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${
                    openDropdown === f.key || f.selected.length
                      ? "bg-primary text-white border-primary shadow"
                      : "bg-background text-text-secondary border-border hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {f.label}
                  {f.selected.length > 0 && (
                    <span className="ml-1.5 inline-grid place-items-center min-w-5 h-5 px-1 rounded-full bg-white/25 text-[11px] font-bold">
                      {f.selected.length}
                    </span>
                  )}
                </button>
                {openDropdown === f.key && (
                  <ul dir="ltr" className="absolute top-full left-0 mt-2 w-52 max-h-56 overflow-y-auto glass-strong rounded-2xl shadow-xl z-50 text-left p-1.5">
                    {f.options.map((opt) => (
                      <li key={opt.value}>
                        <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-primary/10 cursor-pointer text-sm text-text-primary transition-colors">
                          <input
                            type="checkbox"
                            value={opt.value}
                            checked={f.selected.includes(opt.value)}
                            onChange={(e) => toggleFromList(f.set)(e.target.value)}
                            className="w-4 h-4 rounded accent-[#0D7A66]"
                          />
                          <span>{opt.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Products Section */}
        <section className="container mx-auto px-4 my-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading ? (
              skeletonArray.map((_, index) => (
                <ProductsCardSkeleton key={index} />
              ))
            ) : (allProducts?.length || 0) > 0 ? (
              allProducts.map((item) => (
                <ProductsCard key={item._id} item={item} />
              ))
            ) : (
              <div className="col-span-full">
                <div className="glass-card p-12 text-center max-w-md mx-auto">
                  <span className="text-5xl">👓</span>
                  <h3 className="font-display text-2xl text-text-primary mt-4">
                    {t("No products found")}
                  </h3>
                  <p className="text-text-secondary mt-2">
                    {t("Try adjusting your filters or check back later")}
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* Sentinel and loading spinner for infinite scroll */}
          <div ref={sentinelRef} className="h-10" />
          {loadingMore && (
            <div className="flex items-center justify-center py-6">
              <span className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading more" />
            </div>
          )}
          {/* Fallback Load More button if observer doesn't trigger */}
          {!loadingMore && hasMoreApi && (
            <div className="flex items-center justify-center pt-4">
              <button
                type="button"
                onClick={fetchNextPage}
                className="btn-glass"
              >
                Load more
              </button>
            </div>
          )}
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
