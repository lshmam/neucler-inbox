import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
  },
  // @ts-ignore
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
