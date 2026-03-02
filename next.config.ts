import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark pubky as an external package for server builds to avoid WASM issues
  serverExternalPackages: ["@synonymdev/pubky"],
  // Empty turbopack config to acknowledge Turbopack usage
  turbopack: {},
  // Disable Next.js Router Cache — ensures navigating back to an edit page
  // always gets a fresh render instead of a stale cached RSC payload
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
