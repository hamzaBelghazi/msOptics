"use client";

import { motion } from "framer-motion";
import { HeadsetMic, Security, Build, ViewInAr } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <HeadsetMic className="w-12 h-12" />,
      title: t("features.items.quality.title"),
      description: t("features.items.quality.description"),
    },
    {
      icon: <Security className="w-12 h-12" />,
      title: t("features.items.service.title"),
      description: t("features.items.service.description"),
    },
    {
      icon: <Build className="w-12 h-12" />,
      title: t("features.items.warranty.title"),
      description: t("features.items.warranty.description"),
    },
    {
      icon: <ViewInAr className="w-12 h-12" />,
      title: t("features.items.shipping.title"),
      description: t("features.items.shipping.description"),
    },
  ];

  return (
    <section className="bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            {t("features.title")}
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            {t("home.features.title")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card-background rounded-lg p-6 border border-card-border hover:border-primary hover:shadow-lg transition-all duration-300"
            >
              <div className="text-primary mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-text-secondary">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
