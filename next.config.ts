// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "export", // <-- THIS LINE ENABLES STATIC EXPORTS
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        http: false,
        https: false,
        url: false,
        stream: false,
        crypto: false,
        zlib: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
