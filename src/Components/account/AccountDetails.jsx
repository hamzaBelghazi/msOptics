import {  useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useToast } from "@/Components/Context/ToastContext";
import { CountryDropdown, RegionDropdown } from "react-country-region-selector";
import Image from "next/image";

export default function AccountDetails({ user, onUpdate }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    street: user?.street || "",
    city: user?.city || "",
    postalCode: user?.postalCode || "",
    country: user?.country || "",
    region: user?.region || "",
    image: user?.image || "",
  });

  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName) {
      newErrors.firstName = t("account.first_name_required");
    }
    if (!formData.lastName) {
      newErrors.lastName = t("account.last_name_required");
    }
    if (!formData.email) {
      newErrors.email = t("account.email_required");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t("account.email_invalid");
    }
    if (formData.phone && !/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = t("account.phone_invalid");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const form = new FormData();

      // Append all fields except image
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "image" && value !== undefined && value !== null) {
          form.append(key, value.toString());
        }
      });

      // Only append selected image file
      if (selectedFile) {
        form.append("image", selectedFile);
      }

      await onUpdate(form);

      setIsEditing(false);
      addToast(t("account.update_success"), "success");
    } catch (error) {
      console.error("Update failed:", error);
      addToast(t("account.update_error"), "error");
    }
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   if (!validateForm()) return;

  //   try {
  //     const data = formData;
  //     data.image = selectedFile;
  //     console.log("Submitting data:", data);
  //     await onUpdate(data);
  //     setIsEditing(false);
  //     addToast(t("account.update_success"), "success");
  //     setData(formData);
  //   } catch (error) {
  //     addToast(t("account.update_error"), "error");
  //   }
  // };

  const selectStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    marginBottom: "20px",
    fontSize: "14px",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center space-x-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
          {user.image && (
            <Image
              src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/users/${user.image}`}
              alt="User Image"
              layout="fill"
              objectFit="cover"
              className="rounded-full"
            />
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-text-primary">
            {user?.name}
          </h2>
          <p className="text-text-secondary">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">
            {t("account.personal_info")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Upload Image
              </label>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300
            ${isDragActive ? "border-primary bg-primary/5" : "border-border bg-background"}
          `}
              >
                <input
                  type="file"
                  accept="image/*"
                  name="image"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />

                {!previewUrl ? (
                  <div>
                    <p className="text-sm text-text-secondary">
                      Drag and drop your image here, or click to browse
                    </p>
                  </div>
                ) : (
                  <div className="w-32 h-32 relative">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.first_name")}
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.last_name")}
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.email")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.phone")}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">
            {t("account.address_info")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.street")}
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.city")}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                {t("account.postal_code")}
              </label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-3 py-2 border border-input-border rounded-md bg-input-background text-text-primary disabled:opacity-50"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Country
              </label>
              <CountryDropdown
                value={formData?.country}
                onChange={(val) => {
                  setFormData((prev) => {
                    const updated = {
                      ...prev,
                      country: val,
                      region: "",
                    };
                    return updated;
                  });
                }}
                valueType="short"
                labelType="full"
                defaultOptionLabel={user?.country || "Select a country"}
                disabled={!isEditing}
                style={selectStyle}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-text-primary mb-2">
                Region
              </label>
              <RegionDropdown
                country={formData?.country}
                value={formData?.region}
                onChange={(val) => {
                  setFormData((prev) => ({ ...prev, region: val }));
                }}
                disableWhenEmpty
                countryValueType="short"
                disabled={!isEditing}
                style={selectStyle}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    firstName: user?.firstName || "",
                    lastName: user?.lastName || "",
                    email: user?.email || "",
                    phone: user?.phone || "",
                    street: user?.street || "",
                    city: user?.city || "",
                    postalCode: user?.postalCode || "",
                    country: user?.country || "",
                    region: user?.region || "",
                  });
                }}
                className="px-4 py-2 text-text-primary hover:text-text-primary/80 transition-colors"
              >
                {t("account.cancel")}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-button-text rounded-md hover:bg-primary-hover transition-colors"
              >
                {t("account.save_changes")}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-button-text rounded-md hover:bg-primary-hover transition-colors"
            >
              {t("account.edit_profile")}
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
}
