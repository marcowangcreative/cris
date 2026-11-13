import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is opened at 127.0.0.1 in this environment. Without this,
  // Next blocks the client bundle and the page stays a static shell.
  allowedDevOrigins: ["127.0.0.1"],
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
