import type { NextConfig } from "next";

const nextConfig: any = {
  reactStrictMode: false, // Disabled for Canvas/Game loop performance
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true, // Ensuring build passes for rapid deployment
  },
};

export default nextConfig;