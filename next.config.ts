import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["silvia278.github.io"],
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
