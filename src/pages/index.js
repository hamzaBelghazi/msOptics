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
import MarqueeStrip from "@/Components/Home/MarqueeStrip";
import StatsBand from "@/Components/Home/StatsBand";
import CraftSection from "@/Components/Home/CraftSection";
import LookbookPanels from "@/Components/Home/LookbookPanels";
import BestsellersRail from "@/Components/Home/BestsellersRail";
import TryOnBand from "@/Components/Home/TryOnBand";
import NewsletterSignup from "@/Components/Home/NewsLetter";
import FloatingCartButton from "@/Components/utils/floatingCart";
import GoogleOneTap from "@/Components/Auth/GoogleOneTap";
import { useContext } from "react";
import { AuthContext } from "@/Components/Context/AuthContext";

export default function Home() {
  const { t } = useTranslation();
  const [data, setData] = useState();
  const { isLoggedIn } = useContext(AuthContext);

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
      <div className="bg-background">
        {/* Hero Section */}

        <HeroSection />

        <MarqueeStrip />

        {/* Features Section */}
        <div className="pt-4">
          <Features />
        </div>
        {data?.categories.length > 0 && (
          <Categories categories={data?.categories} />
        )}

        {/* Featured Products */}
        {data?.products.length > 0 && (
          <section className="py-6">
            <FeaturedProducts products={data?.products} />
          </section>
        )}

        {/* Stats band */}
        <StatsBand />

        {/* Craft split */}
        <CraftSection />

        {/* Product Grid */}
        {data?.products.length > 0 && (
          <section className="py-6">
            <ProductGrid products={data?.products} />
          </section>
        )}

        {/* Bestsellers rail */}
        {data?.products.length > 0 && <BestsellersRail products={data?.products} />}

        {/* Lookbook panels */}
        <LookbookPanels />

        {/* Testimonials */}
        {data?.products.length > 0 && (
          <section className="py-10">
            <Testimonials />
          </section>
        )}

        {/* Accessories Section */}
        {data?.accessories.length > 0 && (
          <section className="container mx-auto px-4 py-10">
            <HomeAccessories accessories={data?.accessories} />
          </section>
        )}

        {/* Virtual try-on band */}
        <TryOnBand />

        {/* About Us */}

        <section className="py-10">
          <AboutUs />
        </section>

        {/* Newsletter */}
        <section className="py-6">
          <NewsletterSignup />
        </section>

        {/* FAQ Section */}
        <section className="py-10">
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

      {/* Google One Tap Authentication */}
      {!isLoggedIn && <GoogleOneTap />}
    </Layout>
  );
}
