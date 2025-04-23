// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Skip ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // (Optional) Skip TypeScript errors during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Client-side only
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
