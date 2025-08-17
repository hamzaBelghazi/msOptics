/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "4000",
        pathname: "/img/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/img/**",
      },
      // Production API on Vercel (preview and prod deployments)
      {
        protocol: "https",
        hostname: "m-optics-*.vercel.app",
        pathname: "/img/**",
      },
      // Optional: if you have a stable API domain, expose via env
      ...(process.env.NEXT_PUBLIC_API_HOSTNAME
        ? [
            {
              protocol: "https",
              hostname: process.env.NEXT_PUBLIC_API_HOSTNAME,
              pathname: "/img/**",
            },
          ]
        : []),
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default nextConfig;
