#!/usr/bin/env node

const fs = require('fs');
const { spawnSync } = require('child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.stdio || 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

console.log('Running pre-deployment checks for Juntas Seguras app...');

console.log('Checking dependencies...');
const requiredPackages = ['next', 'mongoose', 'next-auth', 'bcryptjs'];
const missingPackages = requiredPackages.filter((name) => {
  try {
    require.resolve(`${name}/package.json`, { paths: [process.cwd()] });
    return false;
  } catch {
    return true;
  }
});

if (missingPackages.length > 0) {
  console.error(`ERROR: Missing dependencies: ${missingPackages.join(', ')}. Run 'npm install' first.`);
  process.exit(1);
}
console.log('OK: Dependencies check passed');

console.log('Running TypeScript check...');
if (!run('npx', ['tsc', '--noEmit'])) {
  console.warn('WARNING: TypeScript check found errors. Consider fixing them before deployment.');
} else {
  console.log('OK: TypeScript check passed');
}

console.log('Checking environment variables...');
const envFile = '.env.production';
const requiredVars = ['MONGODB_URI', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET'];

if (!fs.existsSync(envFile)) {
  console.error(`ERROR: ${envFile} file not found!`);
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');
const missingVars = requiredVars.filter((name) => {
  const pattern = new RegExp(`^${name}=`, 'm');
  return !pattern.test(envContent);
});

if (missingVars.length > 0) {
  for (const name of missingVars) {
    console.error(`ERROR: ${name} is missing in ${envFile}`);
  }
  console.error('Please add all required environment variables before deploying.');
  process.exit(1);
}
console.log('OK: Environment variables check passed');

console.log('Running build check...');
if (!run('npm', ['run', 'build'])) {
  console.error('ERROR: Build failed. Fix build errors before deploying.');
  process.exit(1);
}
console.log('OK: Build check passed');

console.log('All checks completed. Ready for deployment!');
console.log('');
console.log('REMINDER: When deploying to Vercel, add these environment variables:');
console.log('- MONGODB_URI (your MongoDB Atlas connection string)');
console.log('- NEXTAUTH_SECRET (from .env.production)');
console.log('- NEXTAUTH_URL (your Vercel deployment URL)');
console.log('');
console.log('See VERCEL_DEPLOYMENT.md for more details.');
