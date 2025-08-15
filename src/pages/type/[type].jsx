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
        <section className="container mx-auto mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <Image
                src={
                  type === "sunglasses"
                    ? "/images/sunglasses.svg"
                    : "/images/identifletters.jpg"
                }
                alt="Banner"
                width={500}
                height={300}
                className="w-full h-auto rounded-lg mix-blend-color-burn"
              />
            </div>
            <div className="flex items-center justify-center relative">
              <h1 className="text-4xl text-gray-300 font-bold z-10">
                {type === "sunglasses" ? "Sunglasses" : "Optical"}
              </h1>
              {/* Animated Circles */}
              <motion.div
                className="absolute w-32 h-32 bg-white/20 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{ top: "10%", left: "20%" }}
              ></motion.div>

              <motion.div
                className="absolute w-24 h-24 bg-white/30 rounded-full"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{ bottom: "20%", right: "10%" }}
              ></motion.div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section ref={filtersRef} className="container mx-auto my-8">
          <div className="flex flex-wrap justify-center gap-4">
            {/* Gender Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("gender")}
                className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
              >
                {t("gender")}
              </button>
              {openDropdown === "gender" && (
                <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
                  {genderOptions.map((opt) => (
                    <li key={opt.value} className="px-4 py-2 hover:bg-gray-800">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={selectedGenders.includes(opt.value)}
                          onChange={(e) => toggleFromList(setSelectedGenders)(e.target.value)}
                          className="form-checkbox text-primary"
                        />
                        <span>{opt.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Frame Type Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("frameType")}
                className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
              >
                {t("Frame_type")}
              </button>
              {openDropdown === "frameType" && (
                <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
                  {frameTypeOptions.map((opt) => (
                    <li key={opt.value} className="px-4 py-2 hover:bg-gray-800">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={selectedFrameTypes.includes(opt.value)}
                          onChange={(e) => toggleFromList(setSelectedFrameTypes)(e.target.value)}
                          className="form-checkbox text-primary"
                        />
                        <span>{opt.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Shapes Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("shape")}
                className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
              >
                {t("Shapes")}
              </button>
              {openDropdown === "shape" && (
                <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
                  {shapeOptions.map((opt) => (
                    <li key={opt.value} className="px-4 py-2 hover:bg-gray-800">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={selectedShapes.includes(opt.value)}
                          onChange={(e) => toggleFromList(setSelectedShapes)(e.target.value)}
                          className="form-checkbox text-primary"
                        />
                        <span>{opt.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Colors Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("color")}
                className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
              >
                {t("Frame_colour")}
              </button>
              {openDropdown === "color" && (
                <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
                  {colorOptionList.map((color) => (
                    <li key={color} className="px-4 py-2 hover:bg-gray-800">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={color}
                          checked={selectedColors.includes(color)}
                          onChange={(e) => toggleFromList(setSelectedColors)(e.target.value)}
                          className="form-checkbox text-primary"
                        />
                        <span>{color}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Material Filter */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown("material")}
                className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
              >
                {t("Frame_material")}
              </button>
              {openDropdown === "material" && (
                <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
                  {materialOptions.map((opt) => (
                    <li key={opt.value} className="px-4 py-2 hover:bg-gray-800">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={selectedMaterials.includes(opt.value)}
                          onChange={(e) => toggleFromList(setSelectedMaterials)(e.target.value)}
                          className="form-checkbox text-primary"
                        />
                        <span>{opt.label}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="container mx-auto my-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {isLoading ? (
              // Show skeleton loading state
              skeletonArray.map((_, index) => (
                <ProductsCardSkeleton key={index} />
              ))
            ) : (allProducts?.length || 0) > 0 ? (
              // Show actual products
              allProducts.map((item) => (
                <ProductsCard key={item._id} item={item} />
              ))
            ) : (
              // Show empty state
              <div className="col-span-full text-center py-12">
                <h3 className="text-2xl text-gray-300 mb-4">
                  {t("No products found")}
                </h3>
                <p className="text-gray-400">
                  {t("Try adjusting your filters or check back later")}
                </p>
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
            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={fetchNextPage}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition"
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
