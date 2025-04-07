// Simple static build script for Vercel
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Creating static Next.js build for Vercel...');

// Create minimal Next.js output structure for static deployment
const outputDir = path.resolve(process.cwd(), '.next');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a static HTML page
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const staticHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Juntas Seguras</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
</head>
<body class="bg-blue-50 min-h-screen flex flex-col">
  <nav class="bg-white shadow-lg">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex justify-between">
        <div class="flex space-x-7">
          <div class="flex items-center py-4">
            <span class="font-semibold text-2xl text-blue-600">Juntas Seguras</span>
          </div>
        </div>
      </div>
    </div>
  </nav>

  <div class="container mx-auto px-4 py-12 flex-grow flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-3xl w-full">
      <h1 class="text-3xl font-bold text-gray-800 mb-6 text-center">Welcome to Juntas Seguras</h1>
      <p class="text-lg text-gray-600 mb-8 text-center">
        A secure platform for managing community savings pools
      </p>
      
      <div class="grid md:grid-cols-2 gap-4 mb-8">
        <div class="bg-blue-50 p-4 rounded-lg">
          <h2 class="text-xl font-semibold text-blue-700 mb-2">Secure Transactions</h2>
          <p class="text-gray-600">All transactions are secured with state-of-the-art encryption and security protocols.</p>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <h2 class="text-xl font-semibold text-green-700 mb-2">Community Building</h2>
          <p class="text-gray-600">Build financial resilience within your community through trust and transparency.</p>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
          <h2 class="text-xl font-semibold text-purple-700 mb-2">Flexible Pools</h2>
          <p class="text-gray-600">Create pools with customizable terms to match your community's needs and financial goals.</p>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
          <h2 class="text-xl font-semibold text-orange-700 mb-2">Transparent Process</h2>
          <p class="text-gray-600">Everyone can see payment schedules, contribution history, and upcoming payouts.</p>
        </div>
      </div>
      
      <div class="text-center mt-8">
        <p class="text-gray-600 mb-4">Our full application is under deployment. Please check back soon!</p>
        <div class="flex justify-center space-x-4">
          <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">
            Sign up
          </button>
          <button class="bg-white hover:bg-gray-100 text-blue-600 font-bold py-2 px-6 rounded-lg border border-blue-600">
            Learn more
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <footer class="bg-white py-6">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex flex-col items-center">
        <p class="text-gray-500 text-sm">
          &copy; 2025 Juntas Seguras. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</body>
</html>
`;

fs.writeFileSync(path.join(publicDir, 'index.html'), staticHtml);

// Create serverless function to redirect all routes to index.html
// Create necessary directories
const serverlessDir = path.join(outputDir, 'serverless');
const pagesDir = path.join(serverlessDir, 'pages');
fs.mkdirSync(pagesDir, { recursive: true });

// Create index.js that serves the static HTML
const indexJs = `
module.exports = {
  render: (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(\`${staticHtml}\`);
  }
};
`;

fs.writeFileSync(path.join(pagesDir, 'index.js'), indexJs);

// Create server directory and required manifest files
const serverDir = path.join(outputDir, 'server');
fs.mkdirSync(serverDir, { recursive: true });

// Create pages-manifest.json pointing to our serverless page
const pagesManifest = {
  '/': 'serverless/pages/index.js'
};
fs.writeFileSync(path.join(serverDir, 'pages-manifest.json'), JSON.stringify(pagesManifest, null, 2));

// Create other required manifest files
const buildManifest = {
  polyfillFiles: [],
  devFiles: [],
  ampDevFiles: [],
  lowPriorityFiles: [],
  rootMainFiles: [],
  pages: {
    '/': []
  },
  ampFirstPages: []
};
fs.writeFileSync(path.join(outputDir, 'build-manifest.json'), JSON.stringify(buildManifest, null, 2));

const prerenderManifest = {
  version: 4,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: "previewModeId",
    previewModeSigningKey: "previewModeSigningKey",
    previewModeEncryptionKey: "previewModeEncryptionKey"
  }
};
fs.writeFileSync(path.join(outputDir, 'prerender-manifest.json'), JSON.stringify(prerenderManifest, null, 2));

const routesManifest = {
  version: 3,
  pages404: true,
  basePath: '',
  redirects: [],
  headers: [],
  dynamicRoutes: [],
  staticRoutes: [
    {
      page: '/',
      regex: '^/(?:/)?$',
      routeKeys: {},
      namedRegex: '^/(?:/)?$'
    }
  ],
  dataRoutes: [],
  rewrites: []
};
fs.writeFileSync(path.join(outputDir, 'routes-manifest.json'), JSON.stringify(routesManifest, null, 2));

console.log('Static build created successfully!');