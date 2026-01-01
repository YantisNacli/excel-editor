import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable serverless functions for Netlify
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
