// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Necesario para poder usar paquetes ESM como @react-pdf/renderer con Webpack
    esmExternals: "loose",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
