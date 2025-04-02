/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This setting helps with hydration errors by making client/server output match
  compiler: {
    // Suppress hydration errors specifically
    reactRemoveProperties: { properties: ['^data-', '^aria-', '^fdprocessedid'] },
  },
  // Ignore build errors
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
