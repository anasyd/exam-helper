// next.config.ts
import type { NextConfig } from 'next';

const repoName = '/exam-helper'; // <- Replace this with your repo name

const nextConfig: NextConfig = {
  output: "export",
  basePath: repoName, // <- THIS FIXES THE PATHS
  assetPrefix: repoName, // <- Ensures assets load correctly

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
