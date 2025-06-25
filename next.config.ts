// // next.config.ts
// import type { NextConfig } from 'next';

// // Set the repo name for GitHub Pages deployment
// // For local development, this will be ignored based on NODE_ENV
// const repoName = '/exam-helper';

// // Check if we're in development mode
// const isDev = process.env.NODE_ENV === 'development';

// const nextConfig: NextConfig = {
//   // Use static export for GitHub Pages
//   ...(isDev ? {} : { output: "export" }),

//   // Only use basePath and assetPrefix in production (for GitHub Pages)
//   ...(isDev ? {} : {
//     basePath: repoName,
//     assetPrefix: repoName,
//   }),

//   eslint: {
//     ignoreDuringBuilds: true,
//   },
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   webpack: (config, { isServer }) => {
//     if (!isServer) {
//       config.resolve.fallback = {
//         ...config.resolve.fallback,
//         fs: false,
//         http: false,
//         https: false,
//         url: false,
//         stream: false,
//         crypto: false,
//         zlib: false,
//         path: false,
//       };
//     }
//     return config;
//   },
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
