import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autoriser l'accès au dev server et HMR depuis les IP locales / tunnels de preview
  allowedDevOrigins: ["172.19.64.1", "localhost", "127.0.0.1", "*.e2b.app"],
};

export default nextConfig;
