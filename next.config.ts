import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Fix: avoid false workspace root detection when other lockfiles exist above this project
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
