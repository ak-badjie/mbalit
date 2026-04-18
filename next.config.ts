import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.replit.app"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
