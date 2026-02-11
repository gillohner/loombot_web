import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark pubky as an external package for server builds to avoid WASM issues
  serverExternalPackages: ["@synonymdev/pubky"],
  // Empty turbopack config to acknowledge Turbopack usage
  turbopack: {},
};

export default nextConfig;
