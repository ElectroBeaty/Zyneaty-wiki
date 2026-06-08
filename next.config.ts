import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  serverActions: {
    bodySizeLimit: "100mb",
  },
};

export default nextConfig;