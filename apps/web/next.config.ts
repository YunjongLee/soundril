import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Admin uses Node.js APIs not available in Edge Runtime
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
