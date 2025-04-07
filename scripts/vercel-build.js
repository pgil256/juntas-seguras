// Build script for Vercel that installs TypeScript and handles the build
const { execSync } = require('child_process');

console.log('Running full Next.js build for Vercel deployment...');

// Set environment variables to skip type checking and linting
process.env.NEXT_DISABLE_ESLINT = 'true';
process.env.SKIP_TYPE_CHECK = '1';
process.env.DISABLE_ESLINT_PLUGIN = 'true';

try {
  // First install TypeScript to ensure it's available
  console.log('Installing TypeScript...');
  execSync('npm install --no-save typescript@5.0.4', { stdio: 'inherit' });
  
  console.log('Building Next.js application with type and lint checks disabled...');
  
  // Run the standard Next.js build
  execSync('next build', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_DISABLE_ESLINT: 'true',
      SKIP_TYPE_CHECK: '1',
      DISABLE_ESLINT_PLUGIN: 'true'
    }
  });
  
  console.log('Next.js build completed successfully!');
} catch (error) {
  console.error('Build script failed:', error);
  process.exit(1); // Exit with error code to trigger build failure
}

console.log('Build process completed!');