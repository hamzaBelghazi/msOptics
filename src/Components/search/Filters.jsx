import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { genderOptions, frameTypeOptions, shapeOptions, materialOptions, colorOptions as colorOptionList } from "@/constants/productFilters";

export default function Filters(props) {
  const {
    changeGender,
    changeFtype,
    changeShape,
    changeColor,
    changeFMaterial,
  } = props;

  const { t } = useTranslation();

  // Options are centralized to match backend schema
  const genders = genderOptions; // [{ value, label }]
  const frameTypes = frameTypeOptions; // [{ value, label }]
  const shapes = shapeOptions; // [{ value, label }]
  const colors = colorOptionList; // [string]
  const frameMaterials = materialOptions; // [{ value, label }]

  // State for toggling dropdowns
  const [openDropdown, setOpenDropdown] = useState(null);
  const filtersRef = useRef(null);

  // Function to toggle dropdowns
  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (!openDropdown) return;
      const node = filtersRef.current;
      if (node && !node.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [openDropdown]);

  return (
    <section ref={filtersRef} className="container mx-auto my-8">
      <div className="flex flex-wrap justify-center gap-4">
        {/* Gender */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("gender")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
          >
            {t("product.gender")}
          </button>
          {openDropdown === "gender" && (
            <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
              {genders.map((item) => (
                <li key={item.value} className="px-4 py-2 hover:bg-gray-800">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={item.value}
                      onChange={(e) => changeGender(e)}
                      className="form-checkbox text-primary"
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Frame Type */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("frameType")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
          >
            {t("product.frame_type")}
          </button>
          {openDropdown === "frameType" && (
            <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
              {frameTypes.map((item) => (
                <li key={item.value} className="px-4 py-2 hover:bg-gray-800">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={item.value}
                      onChange={(e) => changeFtype(e)}
                      className="form-checkbox text-primary"
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Shape */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("shape")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
          >
            {t("product.shape")}
          </button>
          {openDropdown === "shape" && (
            <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
              {shapes.map((item) => (
                <li key={item.value} className="px-4 py-2 hover:bg-gray-800">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={item.value}
                      onChange={(e) => changeShape(e)}
                      className="form-checkbox text-primary"
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Colors */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("color")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
          >
            {t("product.frame_colour")}
          </button>
          {openDropdown === "color" && (
            <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 max-h-96 text-white rounded-md shadow-lg z-50 overflow-auto">
              {colors.map((color) => (
                <li key={color} className="px-4 py-2 hover:bg-gray-800">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={color}
                      onChange={(e) => changeColor(e)}
                      className="form-checkbox text-primary"
                    />
                    <span>{color}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Material */}
        <div className="relative">
          <button
            onClick={() => toggleDropdown("material")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md focus:outline-none hover:bg-gray-700 transition-colors"
          >
            {t("product.frame_material")}
          </button>
          {openDropdown === "material" && (
            <ul className="absolute top-full left-0 mt-2 w-48 bg-gray-900 text-white rounded-md shadow-lg z-50">
              {frameMaterials.map((item) => (
                <li key={item.value} className="px-4 py-2 hover:bg-gray-800">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value={item.value}
                      onChange={(e) => changeFMaterial(e)}
                      className="form-checkbox text-primary"
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
