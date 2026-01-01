/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Don't ignore TypeScript errors - we want to catch them
    ignoreBuildErrors: false,
  },
  eslint: {
    // Set to false for production to catch linting errors during build
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  // Image optimization
  images: {
    domains: ['res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
  },
  // Disable webpack measurement for faster builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Fix for case sensitivity issues in WSL2
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Disable case sensitive paths plugin in development
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'CaseSensitivePathsPlugin'
      );
    }
    return config;
  },
};

module.exports = nextConfig;