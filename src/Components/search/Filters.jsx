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

  const pill =
    "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 border bg-background text-text-secondary border-border hover:border-primary/50 hover:text-primary";

  const menu =
    "absolute top-full left-0 mt-2 w-52 max-h-64 overflow-y-auto glass-strong rounded-2xl shadow-xl z-50 p-1.5";

  const row =
    "flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-primary/10 cursor-pointer text-sm text-text-primary transition-colors";

  const groups = [
    { key: "gender", label: t("product.gender"), list: genders, onChange: (e) => changeGender(e) },
    { key: "frameType", label: t("product.frame_type"), list: frameTypes, onChange: (e) => changeFtype(e) },
    { key: "shape", label: t("product.shape"), list: shapes, onChange: (e) => changeShape(e) },
    { key: "color", label: t("product.frame_colour"), list: colors.map((c) => ({ value: c, label: c })), onChange: (e) => changeColor(e) },
    { key: "material", label: t("product.frame_material"), list: frameMaterials, onChange: (e) => changeFMaterial(e) },
  ];

  return (
    <section ref={filtersRef} className="container mx-auto my-8 px-4">
      <div className="glass rounded-3xl px-4 py-3.5 flex flex-wrap justify-center gap-2.5">
        {groups.map((g) => (
          <div key={g.key} className="relative">
            <button onClick={() => toggleDropdown(g.key)} className={pill}>
              {g.label}
            </button>
            {openDropdown === g.key && (
              <ul className={menu}>
                {g.list.map((item) => (
                  <li key={item.value}>
                    <label className={row}>
                      <input
                        type="checkbox"
                        value={item.value}
                        onChange={g.onChange}
                        className="w-4 h-4 rounded accent-[#0D7A66]"
                      />
                      <span>{item.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
