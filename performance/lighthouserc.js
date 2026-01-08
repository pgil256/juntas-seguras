/**
 * Lighthouse CI Configuration
 *
 * Run with: lhci autorun
 *
 * This configuration defines performance, accessibility, best practices,
 * and SEO thresholds for the application.
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/auth/signin',
        'http://localhost:3000/auth/signup',
        'http://localhost:3000/help',
        'http://localhost:3000/help/documentation',
      ],
      // Number of runs per URL (for averaging)
      numberOfRuns: 3,
      // Settings for Lighthouse
      settings: {
        // Use mobile simulation for more stringent testing
        emulatedFormFactor: 'mobile',
        // Throttling settings (simulated slow 4G)
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        // Categories to audit
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
      // Start server before collecting
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 30000,
    },
    assert: {
      // Assertion configuration
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance assertions
        'categories:performance': ['error', { minScore: 0.7 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 4000 }],
        'interactive': ['warn', { maxNumericValue: 5000 }],

        // Accessibility assertions
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'aria-allowed-attr': 'error',
        'aria-hidden-body': 'error',
        'aria-required-attr': 'error',
        'aria-valid-attr': 'error',
        'aria-valid-attr-value': 'error',

        // Best practices assertions
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'is-on-https': 'off', // Disable for local testing
        'uses-http2': 'off', // Disable for local testing
        'no-vulnerable-libraries': 'warn',
        'js-libraries': 'off',
        'csp-xss': 'warn',

        // SEO assertions
        'categories:seo': ['error', { minScore: 0.9 }],
        'viewport': 'error',
        'font-size': 'error',
        'crawlable-anchors': 'warn',
        'robots-txt': 'off', // Disable for local testing
        'canonical': 'off', // May not be relevant for SPA

        // PWA assertions (optional)
        'installable-manifest': 'off',
        'splash-screen': 'off',
        'themed-omnibox': 'off',
        'content-width': 'warn',
      },
    },
    upload: {
      // Upload to temporary public storage for CI
      target: 'temporary-public-storage',
    },
  },
};
