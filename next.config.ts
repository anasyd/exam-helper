import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
