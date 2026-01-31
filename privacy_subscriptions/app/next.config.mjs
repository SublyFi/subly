/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Solana web3.js compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  // Enable experimental features if needed
  experimental: {
    // Optimize for Solana packages
    optimizePackageImports: ['@solana/web3.js', 'lucide-react'],
  },
};

export default nextConfig;
