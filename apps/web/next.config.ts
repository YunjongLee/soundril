import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Admin uses Node.js APIs not available in Edge Runtime
  serverExternalPackages: ["firebase-admin"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // jsmediatags tries to require react-native-fs, ignore it in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "react-native-fs": false,
      };
    }
    return config;
  },
};

export default nextConfig;
