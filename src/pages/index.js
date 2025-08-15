import React, { useEffect } from "react";
import { useState } from "react";
import axios from "axios";
import Layout from "@/Components/Layout/Layout";
import HeroSection from "@/Components/Home/HeroSection";
import Features from "@/Components/Home/Features";
import ProductGrid from "@/Components/Home/ProductGrid";
import FeaturedProducts from "@/Components/Home/FeaturedProducts";
import Testimonials from "@/Components/Home/Testimonials";
import AboutUs from "@/Components/Home/AboutUs";
import FAQSection from "@/Components/Home/Faq";
import InstagramFeed from "@/Components/Home/SocialFeeds";
import Categories from "@/Components/Home/Categories";

import { useTranslation } from "react-i18next";
import HomeAccessories from "@/Components/Home/Accessories";
import FloatingCartButton from "@/Components/utils/floatingCart";



export default function Home() {
  const { t } = useTranslation();
  const [data, setData] = useState();

  useEffect(() => {
    const getProducts = async () => {
      try {

        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/getoverview`
        );
        
        setData(response.data);
      } catch (error) {
        console.error(
          "Error fetching data:",
          error.response?.data?.message || error.message
        );
      }
    };
    getProducts();
  }, []);

  return (
    <Layout title={t("home.title")} announcement={data?.announces}>
      <div className="space-y-16 bg-background">
        {/* Hero Section */}
        <HeroSection />

        {/* Features Section */}
        <Features />

        <Categories categories={data?.categories} />

        {/* Featured Products */}
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t("home.featured_products")}
          </h2>
          <FeaturedProducts products={data?.products} />
        </section>

        {/* Product Grid */}
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t("home.trending.title")}
          </h2>
          <ProductGrid products={data?.products} />
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t("home.testimonials.title")}
          </h2>
          <Testimonials />
        </section>

        {/* Accessories Section */}
        <section className="container mx-auto px-4 py-12">
          <HomeAccessories accessories={data?.accessories} />
        </section>

        {/* About Us */}
        <section className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t("about_us.title")}
          </h2>
          <AboutUs />
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4">
          <FAQSection />
        </section>

        {/* Instagram Feed */}
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold text-center text-text-primary mb-8">
            {t("home.social_feed")}
          </h2>
          <InstagramFeed />
        </section>
      </div>
      <FloatingCartButton />
    </Layout>
  );
}
