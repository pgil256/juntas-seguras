/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add output: 'export' for static site generation fallback
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  // Disable image optimization for static export
  images: process.env.STATIC_EXPORT === 'true' ? { unoptimized: true } : {},
  // Disable webpack measurement for faster builds
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;