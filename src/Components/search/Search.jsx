import React from "react";
import ProductsCard from "../utils/ProductsCard";
import AccessoryCard from "../utils/AccessoryCard";
import Filters from "./Filters";
import useSearch from "./useSearch";

export default function Search() {
 const {
 filter,
 searchProduct,
 changeGender,
 changeFtype,
 changeShape,
 changeColor,
 changeFMaterial,
 clearFilters,
 isLoading,
 } = useSearch();

 return (
 <>
 {/* Search Input Section */}
 <section className="container mx-auto mt-8 px-4">
 <div className="flex items-center justify-center">
 <form className="w-full max-w-2xl relative">
 <input
 type="search"
 placeholder="Search products and accessories..."
 onChange={(e) => searchProduct(e.target.value)} // Pass the search term to the hook
 className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-card-background text-text-primary placeholder-text-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
 />
 <button
 type="reset"
 onClick={clearFilters} // Clear all filters
 className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary bg-transparent hover:bg-primary/10/40 dark:hover:bg-white/10 rounded-md p-1 transition"
 >
 <svg
 xmlns="http://www.w3.org/2000/svg"
 fill="none"
 viewBox="0 0 24 24"
 strokeWidth={1.5}
 stroke="currentColor"
 className="w-5 h-5"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 </form>
 </div>
 </section>

 {/* Filters Section */}
 <div className="container mx-auto px-4 mt-6">
 <Filters
 changeGender={changeGender}
 changeFtype={changeFtype}
 changeShape={changeShape}
 changeColor={changeColor}
 changeFMaterial={changeFMaterial}
 />
 </div>

 {/* Loading Spinner */}
 {isLoading && (
 <div className="flex justify-center items-center py-24">
 <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent border-primary"></div>
 </div>
 )}

 {/* Products Section */}
 {!isLoading && (
 <section className="container mx-auto my-8 px-4 max-h-[42vh] overflow-y-auto">
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
 {filter.length > 0 ? (
 filter.map((item) => {
 const key = item._id || item.id;
 const isAccessory = item.__type === "accessory" || item.name !== undefined;
 return isAccessory ? (
 <AccessoryCard key={key} item={item} />
 ) : (
 <ProductsCard key={key} item={item} />
 );
 })
 ) : (
 <div className="col-span-full flex flex-col items-center justify-center min-h-[30vh] border border-dashed border-border rounded-xl py-12">
 <img src="/images/empty-state.png" alt="No items" className="w-20 h-20 mb-4 opacity-80" />
 <h2 className="text-lg font-semibold text-text-primary mb-1">No items found</h2>
 <p className="text-sm text-text-secondary ">Try adjusting your search or filters</p>
 </div>
 )}
 </div>
 </section>
 )}
 </>
 );
}
