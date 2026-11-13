import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Session, demo data, and webhooks are request-specific. Cache Components
  // prerender a static shell, which fights this portal, so they stay off.
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
