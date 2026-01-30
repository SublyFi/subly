import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@subly/vault-sdk"],

  // Mark Privacy Cash SDK as external for server-only usage
  // This prevents the SDK from being bundled and allows Node.js to handle WASM
  serverExternalPackages: ["privacycash", "@lightprotocol/hasher.rs"],

  // Turbopack configuration (Next.js 16+)
  turbopack: {
    // No special configuration needed for server-external packages
  },

  // Webpack configuration (fallback for compatibility)
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add rule for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Prevent Node.js modules from being bundled on the client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
