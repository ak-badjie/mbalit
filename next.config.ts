import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.replit.dev", "*.replit.app", "*.riker.replit.dev", "*.kirk.replit.dev"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
