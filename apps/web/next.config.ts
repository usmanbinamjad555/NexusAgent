import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@nexus-agent/types", "@nexus-agent/agents"],
};

export default nextConfig;
