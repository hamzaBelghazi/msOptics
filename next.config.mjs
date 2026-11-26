/** @type {import('next').NextConfig} */
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uploads are served by the API at <NEXT_PUBLIC_SERVER_URL>/img/**, so the
// optimizer has to allow that exact origin. Deriving it from the env means a
// new deployment domain never needs this file edited (and never 400s).
const apiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SERVER_URL
      ? new URL(process.env.NEXT_PUBLIC_SERVER_URL)
      : null;
  } catch {
    return null;
  }
})();

const apiImagePattern = apiOrigin
  ? {
      protocol: apiOrigin.protocol.replace(":", ""),
      hostname: apiOrigin.hostname,
      ...(apiOrigin.port ? { port: apiOrigin.port } : {}),
      pathname: "/img/**",
    }
  : null;

// The build bakes the API origin into the client bundle, so the same origin is
// already allowed in .next/required-server-files.json. Keep those entries too:
// at runtime the env can be absent or come from a committed .env pointing at
// localhost, which would otherwise 400 every uploaded photo.
const bakedImagePatterns = (() => {
  // Never trust a previous build while building a new one.
  if (process.env.NEXT_PHASE === "phase-production-build") return [];
  try {
    const baked = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, ".next/required-server-files.json"),
        "utf8",
      ),
    );
    const patterns = baked?.config?.images?.remotePatterns;
    return Array.isArray(patterns)
      ? patterns.filter((p) => p?.pathname === "/img/**")
      : [];
  } catch {
    return [];
  }
})();

const patternKey = (p) =>
  [p.protocol, p.hostname, p.port || "", p.pathname].join("|");

const baseImagePatterns = [
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
  // Exact production host
  {
    protocol: "https",
    hostname: "m-optics.vercel.app",
    pathname: "/img/**",
  },
  // Production backend host (images served from /img/**)
  {
    protocol: "https",
    hostname: "back.mhsoptics.com",
    pathname: "/img/**",
  },
  // Google profile images for OAuth
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/**",
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
];

const remotePatterns = [
  ...(apiImagePattern ? [apiImagePattern] : []),
  ...bakedImagePatterns,
  ...baseImagePatterns,
].filter(
  (p, i, all) => all.findIndex((q) => patternKey(q) === patternKey(p)) === i,
);

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns,
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
