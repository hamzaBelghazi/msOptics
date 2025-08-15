import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import debounce from "lodash.debounce";

export default function useSearch() {
  const [category, setCategory] = useState([]); // All items (products + accessories)
  const [filter, setFilter] = useState([]); // Filtered items (starts empty)
  const [search, setSearch] = useState(""); // Search term
  const [gender, setGender] = useState([]); // Selected genders
  const [ftype, setFtype] = useState([]); // Selected frame types
  const [shape, setShape] = useState([]); // Selected shapes
  const [color, setColor] = useState([]); // Selected colors
  const [fMaterial, setFMaterial] = useState([]); // Selected materials
  const [isLoading, setIsLoading] = useState(true); // Loading state

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce((query) => setSearch(query), 300),
    []
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Function to update the search term with debounce
  const searchProduct = (query) => {
    debouncedSearch(query);
  };

  // Function to handle gender filter changes
  const changeGender = (e) => {
    if (e.target.checked) {
      setGender([...gender, e.target.value]);
    } else {
      setGender(gender.filter((item) => item !== e.target.value));
    }
  };

  // Function to handle frame type filter changes
  const changeFtype = (e) => {
    if (e.target.checked) {
      setFtype([...ftype, e.target.value]);
    } else {
      setFtype(ftype.filter((item) => item !== e.target.value));
    }
  };

  // Function to handle shape filter changes
  const changeShape = (e) => {
    if (e.target.checked) {
      setShape([...shape, e.target.value]);
    } else {
      setShape(shape.filter((item) => item !== e.target.value));
    }
  };

  // Function to handle color filter changes
  const changeColor = (e) => {
    if (e.target.checked) {
      setColor([...color, e.target.value]);
    } else {
      setColor(color.filter((item) => item !== e.target.value));
    }
  };

  // Function to handle frame material filter changes
  const changeFMaterial = (e) => {
    if (e.target.checked) {
      setFMaterial([...fMaterial, e.target.value]);
    } else {
      setFMaterial(fMaterial.filter((item) => item !== e.target.value));
    }
  };

  // Fetch products and accessories on initial load
  useEffect(() => {
    const getProducts = async () => {
      try {
        setIsLoading(true);
        const toArray = (payload) => {
          if (Array.isArray(payload)) return payload;
          if (payload && Array.isArray(payload.data)) return payload.data;
          if (payload && Array.isArray(payload.docs)) return payload.docs;
          if (payload && Array.isArray(payload.items)) return payload.items;
          if (payload && Array.isArray(payload.results)) return payload.results;
          // Fallback: find first array within object
          if (payload && typeof payload === "object") {
            for (const key of Object.keys(payload)) {
              const v = payload[key];
              if (Array.isArray(v)) return v;
              if (v && typeof v === "object") {
                const inner = toArray(v);
                if (Array.isArray(inner)) return inner;
              }
            }
          }
          return [];
        };
        // Fetch products
        const [prodRes, accRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/`),
          axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/accessories/`),
        ]);

        // Be resilient to different API envelope shapes
        const productsRaw =
          prodRes?.data?.data?.data ||
          prodRes?.data?.products ||
          prodRes?.data?.data?.products ||
          prodRes?.data?.data ||
          [];
        const accessoriesRaw =
          accRes?.data?.data?.data ||
          accRes?.data?.accessories ||
          accRes?.data?.data?.accessories ||
          accRes?.data?.data ||
          [];

        const products = toArray(productsRaw);
        const accessories = toArray(accessoriesRaw);

        // Mark types for rendering decisions
        const items = [
          ...products.map((p) => ({ ...p, __type: "product" })),
          ...accessories.map((a) => ({ ...a, __type: "accessory" })),
        ];

        setCategory(items);
        // Initial state should be empty until user searches or applies filters
        setFilter([]);
      } catch (error) {
        console.error(
          error.response?.data?.message || "Error fetching products"
        );
      } finally {
        setIsLoading(false);
      }
    };
    getProducts();
  }, []);

  // Apply filters whenever search, gender, frame type, shape, color, or material changes
  useEffect(() => {
    const items = Array.isArray(category) ? category : [];

    // If user hasn't entered a search and no filters are selected, keep empty results
    const hasAnyFilter =
      search.trim() !== "" ||
      gender.length > 0 ||
      ftype.length > 0 ||
      shape.length > 0 ||
      color.length > 0 ||
      fMaterial.length > 0;
    if (!hasAnyFilter) {
      setFilter([]);
      return;
    }

    // Split into products and accessories (strict by __type we attach at fetch time)
    const products = items.filter((it) => it.__type === "product");
    const accessories = items
      .filter((it) => it.__type === "accessory")
      .filter((a) => (a.status || "active").toLowerCase() === "active");

    // 1) Search filter (applies to both)
    const q = search.trim().toLowerCase();
    const searchProducts = q
      ? products.filter((p) => (p.title || "").toLowerCase().includes(q))
      : products;
    // If product filters are active and query is empty, hide accessories
    const productFiltersActive =
      gender.length > 0 || ftype.length > 0 || shape.length > 0 || color.length > 0 || fMaterial.length > 0;
    const searchAccessories = q
      ? accessories.filter((a) =>
          [a.name, a.shortDescription, a.description]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        )
      : (productFiltersActive ? [] : accessories);

    // 2) Product-only filters
    let filteredProducts = searchProducts;
    if (gender.length > 0) {
      filteredProducts = filteredProducts.filter((item) =>
        gender.includes((item.productGender || item.gender || "").toLowerCase())
      );
    }
    if (ftype.length > 0) {
      filteredProducts = filteredProducts.filter((item) =>
        ftype.includes((item.frameType || item.frame_type || "").toLowerCase())
      );
    }
    if (shape.length > 0) {
      filteredProducts = filteredProducts.filter((item) =>
        shape.includes((item.shape || "").toLowerCase())
      );
    }
    if (color.length > 0) {
      filteredProducts = filteredProducts.filter((item) =>
        color.includes((item.color || item.frameColour || item.frame_color || "").toLowerCase())
      );
    }
    if (fMaterial.length > 0) {
      filteredProducts = filteredProducts.filter((item) =>
        fMaterial.includes((item.material || item.frameMaterial || item.frame_material || "").toLowerCase())
      );
    }

    // Accessories currently only filtered by search
    const result = [...filteredProducts, ...searchAccessories];
    setFilter(result);
  }, [search, gender, ftype, shape, color, fMaterial, category]);

  // Function to clear all filters
  const clearFilters = () => {
    setSearch("");
    setGender([]);
    setFtype([]);
    setShape([]);
    setColor([]);
    setFMaterial([]);
  };

  return {
    filter,
    searchProduct,
    changeGender,
    changeFtype,
    changeShape,
    changeColor,
    changeFMaterial,
    clearFilters,
    isLoading,
  };
}
