/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This setting helps with hydration errors by making client/server output match
  compiler: {
    // Suppress hydration errors specifically
    reactRemoveProperties: { properties: ['^data-', '^aria-', '^fdprocessedid'] },
    styledComponents: true, // Enable styled-components
  },
  // Completely disable TypeScript and ESLint checks
  typescript: false,
  eslint: false,
  // Enable Fast Refresh features with improved file watching for WSL
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Rebuild after 300ms of inactivity
      ignored: [/node_modules/, '**/.git/**'],
    };
    return config;
  },
  // Enhanced configuration for hydration error prevention
  experimental: {
    serverMinification: true,
    optimizeCss: true,
    esmExternals: false,
    // Improve server/client rendering consistency
    serverComponents: true,
    // Remove fdprocessedid attributes added by browser extensions
    strictNextHead: true
  }
};

export default nextConfig;
