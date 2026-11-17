import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Load only the modules each import uses. lucide-react is on Next's default
    // list already; it is named here so the intent is explicit.
    optimizePackageImports: ["lucide-react", "motion"]
  }
};

export default nextConfig;
