import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: "/.well-known/assetlinks.json",
      headers: [{ key: "Content-Type", value: "application/json" }],
    },
    {
      source: "/.well-known/apple-app-site-association",
      headers: [{ key: "Content-Type", value: "application/json" }],
    },
  ],
};

export default nextConfig;
