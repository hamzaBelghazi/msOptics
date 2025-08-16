import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import ProductsCard from "@/Components/utils/ProductsCard";
import Layout from "@/Components/Layout/Layout";
import { useTranslation } from "react-i18next";
import FloatingCartButton from "@/Components/utils/floatingCart";
import { genderOptions, frameTypeOptions, shapeOptions, materialOptions, colorOptions as colorOptionList } from "@/constants/productFilters";

export default function Category({ products , category }) {
  const router = useRouter();
  const { id } = router.query;
  const { t } = useTranslation();
  // State for accordion toggles
  const [activeAccordion, setActiveAccordion] = useState(null);
  // State to toggle sidebar visibility
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsFiltersOpen(window.innerWidth >= 1024); 
    };

    // Set initial state on component mount
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Cleanup event listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toggle accordion state
  const toggleAccordion = (accordionId) => {
    setActiveAccordion((prev) => (prev === accordionId ? null : accordionId));
  };

  // State for price range
  const [priceRange, setPriceRange] = useState([0, 200]);

  // Discrete filters
  const [selectedGenders, setSelectedGenders] = useState([]); 
  const [selectedFrameTypes, setSelectedFrameTypes] = useState([]); 
  const [selectedShapes, setSelectedShapes] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]); 

  const toggleFromList = (setter) => (value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  // Derived category name from id
  const categoryTitle = (id || "Category")
    ?.toString()
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Color filtering (store lowercase values)
  const colorOptions = colorOptionList;
  const [selectedColors, setSelectedColors] = useState([]);

  const toggleColor = (c) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const parseItemColors = (item) => {
    // colors can be ["Black,Blue"] or array of strings or single string
    const raw = Array.isArray(item?.colors) ? item.colors.join(",") : (item?.colors || "");
    return raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  };

  // Local list with server-backed pagination
  const [allProducts, setAllProducts] = useState(Array.isArray(products) ? products : []);
  const [apiPage, setApiPage] = useState(1);
  const API_LIMIT = 12;
  const [hasMoreApi, setHasMoreApi] = useState((Array.isArray(products) ? products.length : 0) >= API_LIMIT);

  useEffect(() => {
    // Keep SSR products as base on id change
    setAllProducts(Array.isArray(products) ? products : []);
    setApiPage(1);
    setHasMoreApi((Array.isArray(products) ? products.length : 0) >= API_LIMIT);
  }, [products]);

  // Sorting
  const [sortBy, setSortBy] = useState("relevance");
  const [viewCols, setViewCols] = useState(3); // 2, 3, or 4
  
  // Build query params for server-side filtering
  const mapSortToApi = (val) => {
    switch (val) {
      case 'price-asc':
      case 'price_low':
      case 'lowToHigh':
        return 'price';
      case 'price-desc':
      case 'price_high':
      case 'highToLow':
        return '-price';
      case 'popular':
        return '-views'; // alternatively '-soldCount'
      case 'newest':
      case 'date-desc':
        return '-createdAt';
      case 'date-asc':
        return 'createdAt';
      default:
        return ''; // relevance handled by backend default
    }
  };
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    // Colors, genders, frame types, shapes, materials as CSV
    if (selectedColors.length) params.set('colors', selectedColors.join(','));
    if (selectedGenders.length) params.set('productGender', selectedGenders.join(','));
    if (selectedFrameTypes.length) params.set('frameType', selectedFrameTypes.join(','));
    if (selectedShapes.length) params.set('shape', selectedShapes.join(','));
    if (selectedMaterials.length) params.set('frameMatirial', selectedMaterials.join(','));
    // Price range
    if (Array.isArray(priceRange)) {
      const [minP, maxP] = priceRange;
      if (minP != null) params.set('price[gte]', String(minP));
      if (maxP != null) params.set('price[lte]', String(maxP));
    }
    // Sorting
    const sortParam = mapSortToApi(sortBy);
    if (sortParam) params.set('sort', sortParam);
    return params.toString();
  };
  // Server-side filtering is authoritative; just reflect API results
  const filteredProducts = useMemo(() => {
    return Array.isArray(allProducts) ? allProducts : [];
  }, [allProducts]);

  const sortedProducts = useMemo(() => {
    const arr = Array.isArray(filteredProducts) ? [...filteredProducts] : [];
    return arr.sort((a, b) => {
        if (sortBy === "priceAsc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "priceDesc") return (b.price || 0) - (a.price || 0);
        if (sortBy === "titleAsc") return (a.title || "").localeCompare(b.title || "");
        if (sortBy === "titleDesc") return (b.title || "").localeCompare(a.title || "");
        return 0;
      });
  }, [filteredProducts, sortBy]);

  // Infinite scroll using server pagination (limit=20&page)
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  async function fetchNextPage() {
    try {
      if (fetchingRef.current || loadingMore) return;
      fetchingRef.current = true;
      setLoadingMore(true);
      const next = apiPage + 1;
      if (!id) return; // guard against undefined route param
      const filterQs = buildFilterParams();
      const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/categories/${id}?limit=${API_LIMIT}&page=${next}${filterQs ? `&${filterQs}` : ''}`;
      const res = await axios.get(url);
      const newItems = Array.isArray(res?.data?.products) ? res.data.products : [];
      if (newItems.length > 0) {
        // dedupe by _id/id when appending
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
      console.error('Failed to load more products', e);
      setHasMoreApi(false);
    } finally {
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }

  // Fetch page 1 from API whenever filters change
  useEffect(() => {
    if (!router?.isReady || !id) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        setLoadingMore(true);
        fetchingRef.current = true;
        const filterQs = buildFilterParams();
        const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/categories/${id}?limit=${API_LIMIT}&page=1${filterQs ? `&${filterQs}` : ''}`;
        const res = await axios.get(url, { signal: controller.signal });
        const items = Array.isArray(res?.data?.products) ? res.data.products : [];
        setAllProducts(items);
        setApiPage(1);
        setHasMoreApi(items.length >= API_LIMIT);
      } catch (err) {
        if (axios.isCancel?.(err)) return;
        console.error('Failed to fetch filtered products', err);
        setAllProducts([]);
        setApiPage(1);
        setHasMoreApi(false);
      } finally {
        setLoadingMore(false);
        fetchingRef.current = false;
      }
    };
    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router?.isReady, selectedColors.join(','), selectedGenders.join(','), selectedFrameTypes.join(','), selectedShapes.join(','), selectedMaterials.join(','), priceRange[0], priceRange[1], sortBy]);

  useEffect(() => {
    if (!router?.isReady) return;
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMoreApi && !loadingMore && !fetchingRef.current) {
          fetchNextPage();
        }
      });
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreApi, loadingMore, id, router?.isReady]);

  return (
    <Layout title={category?.name}>
      {/* Hero Section */}
      <section className="mt-6">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-2xl shadow-lg">
            <img
             src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/category/${category?.categoryImage}`}
              alt={category?.name}
              className="w-full h-48 sm:h-64 md:h-72 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10">
              <nav className="mb-2 text-white/80 text-xs sm:text-sm">
                <span className="hover:underline cursor-pointer" onClick={() => router.push("/")}>Home</span>
                <span className="mx-2">/</span>
                <span className="text-white font-medium">{category?.name}</span>
              </nav>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white drop-shadow">
                {category?.name}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="container mx-auto p-4 mt-8 flex gap-8 overflow-visible relative">
        {/* Mobile Backdrop */}
        {isFiltersOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setIsFiltersOpen(false)}
          />
        )}
        {/* Sidebar (Filters) */}
        <aside
          className={`transition-all duration-300 ${
            isFiltersOpen ? "w-full lg:w-72" : "w-0 overflow-hidden"
          } bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-md lg:sticky lg:top-24 h-fit z-40 lg:z-auto fixed lg:static bottom-0 top-0 right-0 lg:right-auto max-w-full sm:max-w-sm p-0`}
        >
          {/* Filter Header */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 dark:text-gray-200">Filters</h3>
            <button
              onClick={() => setIsFiltersOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-4 px-6 py-4">
            {/* Gender Filter */}
            <FilterAccordion
              title="Gender"
              isActive={activeAccordion === "gender"}
              onToggle={() => toggleAccordion("gender")}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
              }
            >
              {genderOptions.map((opt) => (
                <label key={opt.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-500"
                    checked={selectedGenders.includes(opt.value)}
                    onChange={() => toggleFromList(setSelectedGenders)(opt.value)}
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </FilterAccordion>

            {/* Color Filter */}
            <FilterAccordion
              title="Color"
              isActive={activeAccordion === "color"}
              onToggle={() => toggleAccordion("color")}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 3a1 1 0 000 2h1v11a1 1 0 102 0V5h2v11a1 1 0 102 0V5h1a1 1 0 100-2H4z" />
                </svg>
              }
            >
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleColor(c)}
                    className={`text-xs px-3 py-1 rounded-full border transition ${
                      selectedColors.includes(c)
                        ? "bg-primary text-white border-primary"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                    }`}
                    aria-pressed={selectedColors.includes(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {selectedColors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedColors([])}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Clear colors
                </button>
              )}
            </FilterAccordion>

            {/* Frame Type Filter */}
            <FilterAccordion
              title="Frame Type"
              isActive={activeAccordion === "frameType"}
              onToggle={() => toggleAccordion("frameType")}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4zM5 10a2 2 0 114 0 2 2 0 01-4 0zM15 10a2 2 0 114 0 2 2 0 01-4 0z" />
                </svg>
              }
            >
              {frameTypeOptions.map((opt) => (
                <label key={opt.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-500"
                    checked={selectedFrameTypes.includes(opt.value)}
                    onChange={() => toggleFromList(setSelectedFrameTypes)(opt.value)}
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </FilterAccordion>

            {/* Shape Filter */}
            <FilterAccordion
              title="Shape"
              isActive={activeAccordion === "shape"}
              onToggle={() => toggleAccordion("shape")}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 4a1 1 0 011-1h14a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm1 0v12h14V4H3z" />
                </svg>
              }
            >
              {shapeOptions.map((opt) => (
                <label key={opt.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-500"
                    checked={selectedShapes.includes(opt.value)}
                    onChange={() => toggleFromList(setSelectedShapes)(opt.value)}
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </FilterAccordion>

            {/* Material Filter */}
            <FilterAccordion
              title="Material"
              isActive={activeAccordion === "material"}
              onToggle={() => toggleAccordion("material")}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 1a9 9 0 100 18 9 9 0 000-18zM7 10a3 3 0 116 0 3 3 0 01-6 0z" />
                </svg>
              }
            >
              {materialOptions.map((opt) => (
                <label key={opt.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-500"
                    checked={selectedMaterials.includes(opt.value)}
                    onChange={() => toggleFromList(setSelectedMaterials)(opt.value)}
                  />
                  <span className="text-gray-700">{opt.label}</span>
                </label>
              ))}
            </FilterAccordion>

        

         

            {/* Price Filter */}
            <FilterAccordion
              title="Price"
              isActive={activeAccordion === "price"}
              onToggle={() => toggleAccordion("price")}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M8.707 7.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l2-2a1 1 0 00-1.414-1.414L10 6.586zM10 12a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              }
            >
              <div className="mt-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={priceRange[0]}
                  onChange={(e) =>
                    setPriceRange([parseInt(e.target.value), priceRange[1]])
                  }
                  className="w-full accent-indigo-500"
                />
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={priceRange[1]}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], parseInt(e.target.value)])
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
            </FilterAccordion>
          </div>
        </aside>

        {/* Products Section */}
        <div
          className={`transition-all duration-300 flex-1`}
        >
          {/* Filter Button (Visible on Small Screens) */}
          <button
            onClick={() => setIsFiltersOpen(true)}
            className="lg:hidden bg-primary text-white px-4 py-2 rounded-md mb-4 shadow hover:shadow-md"
          >
            {t("category.show_filters")}
          </button>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t("category.results_count_frames", { count: sortedProducts.length })}
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 dark:text-gray-300">{t("category.sort_by")}:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="relevance">Relevance</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="titleAsc">Title: A → Z</option>
                <option value="titleDesc">Title: Z → A</option>
              </select>
              {/* View density toggle */}
              <div className="hidden sm:flex items-center gap-1 ml-1 border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden">
                {[2,3,4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setViewCols(n)}
                    className={`px-2 py-2 text-xs ${viewCols===n?"bg-primary text-white":"bg-transparent text-gray-600 dark:text-gray-300"}`}
                    aria-label={`Show ${n} columns`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
              Price: {priceRange[0]} - {priceRange[1]}
            </span>
            {selectedColors.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                {c}
                <button onClick={() => toggleColor(c)} aria-label={`Remove ${c}`} className="ml-1 text-gray-500 hover:text-gray-700">×</button>
              </span>
            ))}
          </div>

          {sortedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl">
              <img src="/images/empty-state.png" alt="No items" className="w-24 h-24 mb-4 opacity-80" />
              <h3 className="text-lg font-semibold mb-1">{t("category.empty.title")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">{t("category.empty.subtitle")}</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${viewCols>=2?"sm:grid-cols-2":""} ${viewCols>=3?"lg:grid-cols-3":""} ${viewCols>=4?"xl:grid-cols-4":""} gap-6`}
            >
              {sortedProducts.map((item) => (
                <ProductsCard key={item._id || item.id} item={item} />
              ))}
            </div>
          )}

          {/* Sentinel and loading spinner for infinite scroll */}
          <div ref={sentinelRef} className="h-16" />
         
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
        </div>
      </section>
      <FloatingCartButton />
    </Layout>
  );
}

const FilterAccordion = ({ title, isActive, onToggle, icon, children }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full text-left flex justify-between items-center focus:outline-none"
      >
        {/* Title with Icon */}
        <div className="flex items-center space-x-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="font-medium text-gray-700 dark:text-gray-200">{title}</span>
        </div>

        {/* Chevron Icon (Rotates when active) */}
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
            isActive ? "rotate-180" : ""
          }`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Accordion Content */}
      <div
        className={`overflow-hidden grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 mt-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export async function getServerSideProps(context) {
  const { id } = context.params;

  try {
    // Forward filter/sort query params on SSR
    const q = context.query || {};
    const allowed = [
      'colors',
      'productGender',
      'frameType',
      'shape',
      'frameMatirial',
      'price[gte]',
      'price[lte]',
      'sort',
    ];
    const params = new URLSearchParams();
    for (const key of allowed) {
      if (q[key] == null) continue;
      const v = Array.isArray(q[key]) ? q[key].join(',') : String(q[key]);
      if (v) params.set(key, v);
    }
    params.set('limit', '12');
    params.set('page', '1');
    const qs = params.toString();
    const url = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/categories/${id}?${qs}`;
    const response = await axios.get(url);
    
    return {
      props: {
        category: response.data.category || [],
        products: response.data.products || [],
      },
    };
  } catch (error) {
    console.error(error);
    return {
      props: {
        category: [],
        products: [],
      },
    };
  }
}


