import React, { useState, useEffect, useRef, useContext } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import Layout from "@/Components/Layout/Layout";
import { useRouter } from "next/router";
import axios from "axios";
import Image from "next/image";
import PdModal from "@/Components/utils/PdModal";
import { CartContext } from "@/Components/Context/CartContext";
import PriceTag from "@/Components/utils/PriceTag";
import PrescriptionUpload from "@/Components/product/PrescriptionUpload";
import FacePdfModal from "@/Components/utils/PhotoUtility";
 

const LensCustomizer = ({ product: initialProduct, error }) => {

  const { addToCart } = useContext(CartContext);

  const addToCartHandler = () => {
    // Add the frame
    addToCart(product, 1, {}); // no customizations for frame

    // Prepare lens object
    const lensItem = {
      _id: `${product.id}-lens`, // unique ID so it doesn’t merge with frame
      title: `${selectedLensType || "Lens"}`,
      price: thicknessPrice + advancedTypePrice, // lens price is thickness + advanced type
      images: [], // or an icon if available
      refraction: selectedThickness?.refraction,
      type: "lens",
    };

    // Customizations for the lens
    const lensCustomizations = {
      lensType: selectedLensType,
      sphere: `R ${rightPower} / L ${leftPower}`,
      cylinder: `R ${rightCylinder} / L ${leftCylinder}`,
      axis: `R ${rightAxis} / L ${leftAxis}`,
      pd: useTwoPDs ? `R ${rightPd} / L ${leftPd}` : pd,
      thickness: selectedThickness?.subtitle,
      advancedLensType: selectedAdvancedType,
      ...(prescriptionRef ? { prescriptionRef } : {}),
      ...(facePhotoRef ? { facePhotoRef } : {}),
    };

    addToCart(lensItem, 1, lensCustomizations);
  };

  const { t } = useTranslation();
  const [product, setProduct] = useState(initialProduct || {});
  const [openModal, setOpenModal] = useState(false); // PD modal
  const [showFaceModal, setShowFaceModal] = useState(false); // Face photo modal
  const [facePhotoRef, setFacePhotoRef] = useState("");
  const [isAutomaticMeasurePd, setIsAutomaticMeasurePd] = useState(false);

  const router = useRouter();
  const { id } = router.query;
  // Get lens options from product data
  const lensTypes = product?.lenses?.lensType || [];
  const thicknessOptions = product?.lenses?.thickness || [];
  const advancedLensTypes = product?.lenses?.advancedLensType || [];

  const [useTwoPDs, setUseTwoPDs] = useState(false);
  const [rightPower, setRightPower] = useState("");
  const [leftPower, setLeftPower] = useState("");
  const [rightCylinder, setRightCylinder] = useState("");
  const [leftCylinder, setLeftCylinder] = useState("");
  const [rightAxis, setRightAxis] = useState("");
  const [leftAxis, setLeftAxis] = useState("");
  const [pd, setPd] = useState("");
  const [rightPd, setRightPd] = useState("");
  const [leftPd, setLeftPd] = useState("");
  const [selectedLensType, setSelectedLensType] = useState("");
  const [selectedThickness, setSelectedThickness] = useState(null);
  const [selectedAdvancedType, setSelectedAdvancedType] = useState("");

  // Default: preselect first thickness option when product loads
  useEffect(() => {
    if (!selectedThickness && Array.isArray(thicknessOptions) && thicknessOptions.length > 0) {
      const first = thicknessOptions[0];
      setSelectedThickness(first);
      // Also update price to reflect default selection
      if (typeof first?.price !== 'undefined') {
        setThicknessPrice(parseFloat(first.price || 0));
      }
    }
  }, [thicknessOptions]);
  const [thicknessPrice, setThicknessPrice] = useState(0);
  const [advancedTypePrice, setAdvancedTypePrice] = useState(0);
  const [totalPrice, setTotalPrice] = useState(Number(product?.price));
  const [paramTab, setParamTab] = useState("manual"); 
  const [prescriptionRef, setPrescriptionRef] = useState("");
  const [axisOptions, setAxisOptions] = useState([]);
  const [isPhoto , setIsPhoto]= useState(false);
  const [facePhotoData, setFacePhotoData] = useState(null);


  const takePhotoHandler = (photo) => {
    setIsPhoto(true);
    setFacePhotoData(photo);
  };

  useEffect(() => {
    
    const options = [];
    for (let i = 0; i <= 180; i++) {
      options.push(
        <SelectItem
          key={i}
          value={i.toString()}
          className="text-gray-300 hover:bg-gray-800 focus:bg-gray-800 focus:text-blue-500"
        >
          {i}
        </SelectItem>
      );
    }
    setAxisOptions(options);
  }, []);

  useEffect(() => {
    // Update total price when component options change
    const basePrice = parseFloat(product.price);
    setTotalPrice(basePrice + thicknessPrice + advancedTypePrice);
  }, [thicknessPrice, advancedTypePrice, product?.price]);

  const handleThicknessChange = (thickness) => {
    setSelectedThickness(thickness);
    setThicknessPrice(parseFloat(thickness.price || 0));
  };
  const handleAdvancedTypeChange = (type) => {
    setSelectedAdvancedType(type.subtitle);
    setAdvancedTypePrice(parseFloat(type.price || 0));
  };

  const handleLensTypeChange = (type) => {
    setSelectedLensType(type.subtitle);
  };

  const handleToggleTwoPDs = () => {
    setUseTwoPDs(!useTwoPDs);
    if (!useTwoPDs) {
      // Reset PD values when switching to dual PD
      setPd("");
    } else {
      // Reset dual PD values when switching to single PD
      setRightPd("");
      setLeftPd("");
    }
  };

  const generatePowerOptions = () => {
    const options = [];
    for (let i = -12; i <= 12; i += 0.25) {
      const value = i.toFixed(2);
      options.push(
        <SelectItem key={value} value={value}>
          {i >= 0 ? `+${value}` : value}
        </SelectItem>
      );
    }
    return options;
  };

  const generateCylinderOptions = () => {
    const options = [];
    for (let i = -6; i <= 6; i += 0.25) {
      const value = i.toFixed(2);
      options.push(
        <SelectItem key={value} value={value}>
          {i >= 0 ? `+${value}` : value}
        </SelectItem>
      );
    }
    return options;
  };

  const generateAxisOptions = () => {
    const options = [];
    for (let i = 0; i <= 180; i++) {
      options.push(
        <SelectItem key={i} value={i.toString()}>
          {i}
        </SelectItem>
      );
    }
    return options;
  };

  const generatePdOptions = () => {
    const options = [];
    for (let i = 54; i <= 74; i++) {
      options.push(
        <SelectItem key={i} value={i.toString()}>
          {i}
        </SelectItem>
      );
    }
    return options;
  };

  const generateTwoPdOptions = () => {
    const options = [];
    for (let i = 27; i <= 37; i++) {
      options.push(
        <SelectItem key={i} value={i.toString()}>
          {i}
        </SelectItem>
      );
    }
    return options;
  };

  return (
    <Layout title={t("customizeLens")}>
      <div className="min-h-screen">
        {/* Navigation */}
        <div className="border-b border-gray-200">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center text-sm">
              <a
                href={`/product/${product.id}`}
                className="text-blue-500 hover:underline"
              >
                {t("backToProduct")}
              </a>
              <span className="mx-2 text-gray-400">/</span>
              <p className="font-medium text-gray-700">{t("customizeLens")}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - Options */}
            <div className="lg:w-2/3 space-y-8">
              {/* Lens Types */}
              <div className="bg-card-background rounded-lg shadow-sm p-6 border border-card-border">
                <h2 className="text-xl font-bold mb-4 capitalize text-text-primary tracking-tight">
                  {t("lensesType")}
                </h2>
                <div className="space-y-4">
                  {lensTypes.map((type, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 hover:border-primary transition-all duration-300 ${
                        selectedLensType === type.subtitle
                          ? "border-primary bg-card-background/80 shadow-lg scale-[1.02]"
                          : "border-card-border bg-card-background"
                      }`}
                    >
                      <label className="flex items-center cursor-pointer">
                        <Input
                          type="radio"
                          name="lens"
                          value={type.subtitle.split(" ")[0]}
                          id={type.subtitle.split(" ")[0]}
                          className="h-4 mt-1"
                          checked={selectedLensType === type.subtitle}
                          onChange={() => handleLensTypeChange(type)}
                        />
                        <div className="desc-wrapper">
                          <div className="flex items-center">
                            <div className="w-12 h-12 flex items-center mx-1 justify-center text-blue-500">
                              <div className="relative w-10 h-10 flex-shrink-0 bg-background rounded-lg overflow-hidden">
                                {type.icon ? (
                                  <Image
                                    src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/lenses/${type.icon}`}
                                    alt={type.subtitle}
                                    fill
                                    className="object-contain p-2"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    priority={true}
                                    loading="eager"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-text-secondary/20">
                                    <svg
                                      className="w-12 h-12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1"
                                    >
                                      <path d="M6 3h11l4 5-9 9-9-9 4-5z" />
                                      <path d="M13.236 8.38A3.988 3.988 0 0017 12a3.988 3.988 0 00-3.764 3.62" />
                                      <path d="M10.764 15.62A3.988 3.988 0 007 12a3.988 3.988 0 003.764-3.62" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium mx-1 text-lg text-text break-words">
                                {type.subtitle}
                              </span>
                              <p className="text-gray-400 mx-1 text-sm break-words">
                                {type.desc}
                              </p>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div className="bg-card-background rounded-xl shadow-md p-6 border border-card-border/50 backdrop-blur-sm">
                <div className="flex flex-wrap gap-2 items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-text-primary tracking-tight">
                    {t("parameters")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParamTab("manual")}
                      className={`px-3 py-1.5 text-xs md:text-sm rounded-full transition-colors ${
                        paramTab === "manual"
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {t("prescription.tabs.manual")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setParamTab("upload")}
                      className={`px-3 py-1.5 text-xs md:text-sm rounded-full transition-colors ${
                        paramTab === "upload"
                          ? "bg-primary text-white"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {t("prescription.tabs.upload")}
                    </button>
                  </div>
                </div>

                {paramTab === "manual" ? (
                <>
                <div className="overflow-x-auto rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-card-border/30">
                        <th className="text-left py-4 px-4 text-text-secondary font-medium tracking-tight text-xs md:text-sm uppercase"></th>
                        <th className="text-center py-4 px-4 text-text-secondary font-medium tracking-tight whitespace-nowrap text-xs md:text-sm uppercase">
                          {t("sphere")}
                        </th>
                        <th className="text-center py-4 px-4 text-text-secondary font-medium tracking-tight whitespace-nowrap text-xs md:text-sm uppercase">
                          {t("cylinder")}
                        </th>
                        <th className="text-center py-4 px-4 text-text-secondary font-medium tracking-tight whitespace-nowrap text-xs md:text-sm uppercase">
                          {t("axis")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-card-border/20 hover:bg-card-background/50 transition-colors duration-200">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                            <span className="text-text-primary font-medium tracking-tight whitespace-nowrap text-xs md:text-sm">
                              {t("rightEye")}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Select
                            value={rightPower}
                            onValueChange={setRightPower}
                          >
                            <SelectTrigger className="group w-full bg-background/50 border-card-border/30 text-text-primary hover:bg-background/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 font-medium text-xs md:text-sm transition-all duration-200 rounded-lg shadow-sm hover:shadow-md">
                              <SelectValue
                                placeholder={t("selectPower")}
                                className="placeholder:text-text-secondary/50"
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-card-background/95 backdrop-blur-sm border-primary/10 rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 p-1">
                              <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                                {generatePowerOptions()}
                              </div>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={rightCylinder}
                            onValueChange={setRightCylinder}
                          >
                            <SelectTrigger className="group w-full bg-background/50 border-card-border/30 text-text-primary hover:bg-background/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 font-medium text-xs md:text-sm transition-all duration-200 rounded-lg shadow-sm hover:shadow-md">
                              <SelectValue
                                placeholder={t("selectCylinder")}
                                className="placeholder:text-text-secondary/50"
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-card-background/95 backdrop-blur-sm border-primary/10 rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 p-1">
                              <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                                {generateCylinderOptions()}
                              </div>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={rightAxis}
                            onValueChange={setRightAxis}
                          >
                            <SelectTrigger className="w-full bg-background border-card-border text-text-primary hover:bg-background/80 focus:ring-0 focus:ring-offset-0 font-medium text-xs md:text-sm">
                              <SelectValue placeholder={t("selectAxis")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card-background border-card-border">
                              {axisOptions}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                      <tr className="border-b border-card-border">
                        <td className="py-3 px-4 text-text-primary font-medium tracking-tight whitespace-nowrap text-xs md:text-sm">
                          {t("leftEye")}
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={leftPower}
                            onValueChange={setLeftPower}
                          >
                            <SelectTrigger className="w-full bg-background border-card-border text-text-primary hover:bg-background/80 focus:ring-0 focus:ring-offset-0 font-medium text-xs md:text-sm">
                              <SelectValue placeholder={t("selectPower")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card-background border-card-border">
                              {generatePowerOptions()}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Select
                            value={leftCylinder}
                            onValueChange={setLeftCylinder}
                          >
                            <SelectTrigger className="w-full bg-background border-card-border text-text-primary hover:bg-background/80 focus:ring-0 focus:ring-offset-0 font-medium text-xs md:text-sm">
                              <SelectValue placeholder={t("selectCylinder")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card-background border-card-border">
                              {generateCylinderOptions()}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-4">
                          <Select value={leftAxis} onValueChange={setLeftAxis}>
                            <SelectTrigger className="w-full bg-background border-card-border text-text-primary hover:bg-background/80 focus:ring-0 focus:ring-offset-0 font-medium text-xs md:text-sm">
                              <SelectValue placeholder={t("selectAxis")} />
                            </SelectTrigger>
                            <SelectContent className="bg-card-background border-card-border">
                              {axisOptions}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Pupillary Distance */}
                <div className="mt-8 pt-6 border-t border-card-border/20">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 bg-primary/20 rounded-full"></div>
                      <h3 className="font-semibold text-text-primary tracking-tight text-sm md:text-base">
                        {t("pupillaryDistance")}
                      </h3>
                    </div>
                    <button
                      onClick={handleToggleTwoPDs}
                      className="px-4 py-1.5 text-xs md:text-sm text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-colors duration-300 font-medium"
                    >
                      {useTwoPDs ? t("useSinglePD") : t("useDualPD")}
                    </button>
                  </div>

                  {useTwoPDs ? (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-background/30 p-4 rounded-lg border border-card-border/20">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 bg-primary/20 rounded-full"></div>
                          <label className="block text-xs md:text-sm text-text-secondary font-medium tracking-tight">
                            {t("rightEye")}
                          </label>
                        </div>
                        <Select value={rightPd} onValueChange={setRightPd}>
                          <SelectTrigger className="w-full bg-background/50 border-card-border/30 text-text-primary hover:bg-background/70 focus:ring-1 focus:ring-primary/20 focus:ring-offset-0 font-medium text-xs md:text-sm transition-all duration-200">
                            <SelectValue placeholder={t("selectPD")} />
                          </SelectTrigger>
                          <SelectContent className="bg-card-background/95 backdrop-blur-sm border-card-border/30">
                            {generateTwoPdOptions()}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="bg-background/30 p-4 rounded-lg border border-card-border/20">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1 h-4 bg-primary/20 rounded-full"></div>
                          <label className="block text-xs md:text-sm text-text-secondary font-medium tracking-tight">
                            {t("leftEye")}
                          </label>
                        </div>
                        <Select value={leftPd} onValueChange={setLeftPd}>
                          <SelectTrigger className="w-full bg-background/50 border-card-border/30 text-text-primary hover:bg-background/70 focus:ring-1 focus:ring-primary/20 focus:ring-offset-0 font-medium text-xs md:text-sm transition-all duration-200">
                            <SelectValue placeholder={t("selectPD")} />
                          </SelectTrigger>
                          <SelectContent className="bg-card-background/95 backdrop-blur-sm border-card-border/30">
                            {generateTwoPdOptions()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <Select value={pd} onValueChange={setPd}>
                        <SelectTrigger className="group w-full bg-background/50 border-card-border/30 text-text-primary hover:bg-background/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 font-medium text-xs md:text-sm transition-all duration-200 rounded-lg shadow-sm hover:shadow-md">
                          <SelectValue
                            placeholder={t("selectPD")}
                            className="placeholder:text-text-secondary/50"
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-card-background/95 backdrop-blur-sm border-primary/10 rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 p-1">
                          <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
                            {generatePdOptions()}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                </>
                ) : (
                  <div className="space-y-4">
                    <PrescriptionUpload
                      productId={product?.id}
                      onChange={setPrescriptionRef}
                    />
                 
      <button className="bg-primary text-text-primary px-4 py-2 rounded-lg" onClick={() => setShowFaceModal(true)}>Take a Photo</button>
      {isPhoto && (
        <div className="flex items-center gap-3 mt-2 ">
          <a
            href={facePhotoData}
            download="face-photo.jpg"
            className="bg-background text-text-primary px-4 py-2 rounded-lg"
          >
             <img
            src={facePhotoData}
            alt="Face preview"
            className="h-16 w-16 object-cover rounded border border-gray-200"
          />
          </a>
        </div>
      )}
     
 
                    <p className="text-xs text-text-secondary">
                      {t("prescription.or")} {t("prescription.tabs.manual")}.
                    </p>
                  </div>
                )}
              </div>
              {/* PD Measurement Guide */}
              <div className="mt-6 p-4 bg-background/50 rounded-lg border border-card-border">
                <h3 className="text-lg font-medium text-text-primary mb-3 tracking-tight">
                  {t("howToMeasurePD")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary">{t("pdDesc")}</p>
                    <div className="space-y-2">
                      <h4 className="font-medium text-text-primary">
                        {t("pdMeasurementMethods")}
                      </h4>
                      <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
                        <li>{t("pdMethod1")}</li>
                        <li>{t("pdMethod2")}</li>
                        <li>{t("pdMethod3")}</li>
                      </ul>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <a
                        href="/pd-ruler.pdf"
                        download
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors duration-300"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        {t("downloadPDRuler")}
                      </a>
                      <button
                        onClick={() => setOpenModal(true)}
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors duration-300"
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        {t("openMeasurementTool")}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="aspect-square rounded-lg border border-card-border p-4">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          className="w-full h-full text-text-secondary/20"
                          viewBox="0 0 100 100"
                        >
                          <circle
                            cx="35"
                            cy="50"
                            r="10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <circle
                            cx="65"
                            cy="50"
                            r="10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <line
                            x1="35"
                            y1="50"
                            x2="65"
                            y2="50"
                            stroke="currentColor"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                          <text
                            x="50"
                            y="40"
                            textAnchor="middle"
                            className="text-xs"
                          >
                            PD
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thickness */}
              <div className="bg-card-background rounded-lg shadow-sm p-6 border border-card-border">
                <h2 className="text-xl font-bold mb-4 text-text-primary tracking-tight">
                  {t("thickness")}
                </h2>
                <div className="flex flex-col gap-4">
                  {thicknessOptions.map((thickness, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg hover:border-primary transition-all duration-300 ${
                        selectedThickness?._id === thickness._id
                          ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02] bg-card-background"
                          : "border-card-border bg-card-background"
                      }`}
                    >
                      <label className="cursor-pointer block h-full">
                        <input
                          type="radio"
                          name="thickness"
                          value={thickness.subtitle.split(" ")[0]}
                          id={thickness.subtitle.split(" ")[0]}
                          className="sr-only"
                          onChange={() => handleThicknessChange(thickness)}
                          required
                        />
                        <div className="flex p-4 gap-6 items-start md:items-center">
                          {/* Image */}
                          <div className="relative w-10 h-10 flex-shrink-0 bg-background rounded-lg overflow-hidden">
                            {thickness.photo ? (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/lenses/${thickness.photo}`}
                                alt={thickness.subtitle}
                                fill
                                className="object-contain p-2"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority={true}
                                loading="eager"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-secondary/20">
                                <svg
                                  className="w-12 h-12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                >
                                  <path d="M6 3h11l4 5-9 9-9-9 4-5z" />
                                  <path d="M13.236 8.38A3.988 3.988 0 0017 12a3.988 3.988 0 00-3.764 3.62" />
                                  <path d="M10.764 15.62A3.988 3.988 0 007 12a3.988 3.988 0 003.764-3.62" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="space-y-2 flex-wrap flex justify-between items-center flex-1">
                            <div>
                              <h3 className="text-lg font-semibold text-text-primary tracking-tight break-words">
                                {thickness.subtitle}
                              </h3>
                              <div className="text-text-secondary text-sm">
                                <div className="flex items-center text-text-secondary text-sm">
                                  <span className="font-medium">
                                    Refraction Index:
                                  </span>
                                  <span className="ml-2">
                                    {thickness.refraction}
                                  </span>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-text-secondary break-words">
                                  {thickness.desc}
                                </p>
                              </div>
                            </div>
                            {/* Price */}
                            <div className="pt-2">
                              <p className="text-primary font-bold tracking-tight text-lg">
                                <PriceTag amount={thickness.price} />
                          
                              </p>
                              <span className="text-text-secondary text-xs">{t("pricePerPair")}</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Frame Overview */}
              <div className="bg-card-background rounded-lg shadow-sm p-6 border border-card-border">
                <h2 className="text-xl font-bold mb-4 text-text-primary">
                  {t("frameOverview")}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col items-center text-center p-4 bg-card-background rounded-lg border border-card-border hover:border-primary hover:bg-card-background/80 transition-all duration-300">
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12" y2="17"></line>
                      </svg>
                    </div>
                    <p className="text-xs break-normal font-semibold text-text-primary">
                      {t("antiReflective")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-card-background rounded-lg shadow-sm p-6 border border-card-border">
                <h2 className="text-xl font-bold mb-6 text-text-primary tracking-tight">
                  {t("benefits")}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="flex flex-col items-center text-center p-4 bg-card-background/50 rounded-lg border border-card-border hover:border-primary hover:bg-card-background/80 transition-all duration-300">
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line
                          x1="18.36"
                          y1="18.36"
                          x2="19.78"
                          y2="19.78"
                        ></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {t("uvFilter")}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {t("uvFilterDesc")}
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center p-4 bg-card-background/50 rounded-lg border border-card-border hover:border-primary hover:bg-card-background/80 transition-all duration-300">
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {t("hardened")}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {t("hardenedDesc")}
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center p-4 bg-card-background/50 rounded-lg border border-card-border hover:border-primary hover:bg-card-background/80 transition-all duration-300">
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2M3 16V6a2 2 0 012-2h14a2 2 0 012 2v10"></path>
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {t("selfCleaningCoating")}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {t("selfCleaningCoatingDesc")}
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center p-4 bg-card-background/50 rounded-lg border border-card-border hover:border-primary hover:bg-card-background/80 transition-all duration-300">
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path>
                        <path d="M12 22V2"></path>
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {t("superhydrophobicCoating")}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {t("superhydrophobicCoatingDesc")}
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center p-4 bg-card-background/50 rounded-lg border border-card-border hover:border-primary hover:bg-card-background/80 transition-all duration-300">
                    <div className="w-16 h-16 mb-3 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12" y2="17"></line>
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {t("antiReflective")}
                    </h3>
                    <p className="text-xs text-text-secondary">
                      {t("antiReflectiveDesc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Advanced Lens Type */}
              <div className="bg-card-background rounded-lg shadow-sm p-6 border border-card-border">
                <h2 className="text-xl font-bold mb-4 text-text-primary">
                  {t("advancedLensType")}
                </h2>
                <div className="space-y-4">
                  {advancedLensTypes.map((type, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg hover:border-primary transition-all duration-300 ${
                        selectedAdvancedType === type.subtitle
                          ? "border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02] bg-card-background/80"
                          : "border-card-border bg-card-background"
                      }`}
                    >
                      <label className="cursor-pointer block h-full">
                        <input
                          type="radio"
                          name="advanced-lens"
                          value={type.subtitle}
                          checked={selectedAdvancedType === type.subtitle}
                          className="sr-only"
                          onChange={() => {
                            setSelectedAdvancedType(type.subtitle);
                            setAdvancedTypePrice(type.price);
                            setTotalPrice(
                              Number(product.price) +
                                thicknessPrice +
                                type.price
                            );
                          }}
                          required
                        />
                        <div className="flex p-6 gap-6 items-start">
                          <div className="relative w-10 h-10 flex-shrink-0 bg-background rounded-lg overflow-hidden">
                            {type.image ? (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/lenses/${type.image}`}
                                alt={type.subtitle}
                                fill
                                className="object-contain p-2"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority={true}
                                loading="eager"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-secondary/20">
                                <svg
                                  className="w-12 h-12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1"
                                >
                                  <path d="M6 3h11l4 5-9 9-9-9 4-5z" />
                                  <path d="M13.236 8.38A3.988 3.988 0 0017 12a3.988 3.988 0 00-3.764 3.62" />
                                  <path d="M10.764 15.62A3.988 3.988 0 007 12a3.988 3.988 0 003.764-3.62" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 flex justify-between items-center flex-wrap">
                            <div>
                              <h3 className="text-lg font-semibold text-text-primary mb-2">
                                {type.subtitle}
                              </h3>
                              <p className="text-sm text-gray-400">
                                {type.desc}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              <p className="font-bold text-xl text-primary">
                                <PriceTag amount={type.price} />
                              </p>
                              <span className="text-text-secondary text-xs">{t("pricePerPair")}</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side - Product Summary */}
            <div className="lg:w-1/3">
              <div className="bg-card-background rounded-lg shadow-sm p-6 border border-card-border md:sticky md:top-24">
                <h2 className="text-xl font-bold mb-4 text-text-primary tracking-tight break-words">
                  {product.title}
                </h2>
                <div className="mb-6 aspect-square rounded-lg overflow-hidden bg-background flex items-center justify-center">
                  <div className="p-6 w-full">
                    {product.images.length === 0 ? (
                      <svg
                        className="w-full h-full text-text-secondary"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 3h11l4 5-9 9-9-9 4-5z"></path>
                        <path d="M13.236 8.38A3.988 3.988 0 0017 12a3.988 3.988 0 00-3.764 3.62"></path>
                        <path d="M10.764 15.62A3.988 3.988 0 007 12a3.988 3.988 0 003.764-3.62"></path>
                      </svg>
                    ) : (
                      <Image
                        src={
                          process.env.NEXT_PUBLIC_SERVER_URL +
                          "/img/products/" +
                          product.images[0]
                        }
                        width={120}
                        height={120}
                        alt={product.title}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>

                <div className="border-t border-card-border pt-4 mb-6">
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-text-secondary tracking-tight">
                      {t("frames")}
                    </span>
                    <span className="font-bold text-text-primary tracking-tight">
                      <PriceTag amount={product.price} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-card-border">
                    <span className="font-medium text-text-secondary tracking-tight">
                      {t("thickness")}
                    </span>
                    <span className="font-bold text-text-primary tracking-tight">
                      + <PriceTag amount={thicknessPrice} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-card-border">
                    <span className="font-medium text-text-secondary tracking-tight">
                      {t("advancedLensType")}
                    </span>
                    <span className="font-bold text-text-primary tracking-tight">
                      + <PriceTag amount={advancedTypePrice} />
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 mt-2 border-t border-card-border text-lg">
                    <span className="font-semibold text-text-primary tracking-tight">
                      {t("total")}
                    </span>
                    <span className="font-bold text-text-primary tracking-tight">
                      <PriceTag amount={totalPrice} />
                    </span>
                  </div>
                </div>

                <Button
                  onClick={addToCartHandler}
                  className="w-full py-6 text-lg uppercase font-medium bg-primary hover:bg-primary/90 text-button-text transition-colors duration-300 tracking-wide"
                >
                  {t("product.page.add_to_cart")}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {showFaceModal && (
          <FacePdfModal
            onClose={() => setShowFaceModal(false)}
            productId={product?.id}
            onSaved={(key) => setFacePhotoRef(key)}
            onTakePhoto={takePhotoHandler}
          />
        )}

        <PdModal
          openModal={openModal}
          setOpenModal={setOpenModal}
          isAutomaticMeasurePd={isAutomaticMeasurePd}
          setIsAutomaticMeasurePd={setIsAutomaticMeasurePd}
        />
      </div>
    </Layout>
  );
};
export default LensCustomizer;


export async function getServerSideProps(context) {
  const { id } = context.params;
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_SERVER_URL}/api/products/${id}`
    );
    return {
      props: {
        product: response.data.data.data,
      },
    };
  } catch (error) {
    const err = {};
    if (error.response?.data?.message) {
      err.api = error.response.data.message;
    } else {
      err.network = error.message;
    }
    return {
      props: {
        error: err,
      },
    };
  }
}
