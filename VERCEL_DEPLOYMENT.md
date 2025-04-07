# Vercel Deployment Guide for Juntas Seguras App

This guide walks you through deploying your Juntas Seguras application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (you can sign up with GitHub, GitLab, or Email)
2. Your Juntas Seguras code in a Git repository (GitHub, GitLab, or Bitbucket)
3. A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database (see MONGODB_SETUP.md)

## Option 1: Minimal Deployment (Recommended for Initial Setup)

This method deploys a minimal static landing page that will allow you to verify your deployment is working before proceeding with a full deployment.

1. Log in to [Vercel](https://vercel.com/)
2. Click "Add New..." > "Project"
3. Import your Git repository
4. Select the Juntas Seguras repository
5. Configure Project Settings:
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next`
   - Install Command: `npm install`
   - Environment Variables: Add the ones listed in Step 3 below

This will deploy a minimal landing page, which serves as a placeholder while you work on the full application deployment.

## Option 2: Full Deployment

Once you've verified the minimal deployment works, you can proceed with the full deployment.

### Step 1: Connect Your Repository to Vercel

1. Log in to [Vercel](https://vercel.com/)
2. Click "Add New..." > "Project"
3. Import your Git repository
4. Select the Juntas Seguras repository

### Step 2: Configure Project Settings

1. Vercel should auto-detect Next.js settings
2. Project Name: Enter a name for your deployment (e.g., "juntas-seguras")
3. Framework Preset: Ensure "Next.js" is selected
4. Root Directory: Leave as "/" if your repository root is the project root
5. Build Command: Use `npm run build:no-lint`
6. Output Directory: `.next`
7. Install Command: `npm install`

### Step 3: Environment Variables

Click "Environment Variables" and add the following:

1. **MONGODB_URI**
   - Value: Your MongoDB Atlas connection string (from MONGODB_SETUP.md)
   - Scope: All (Production, Preview, Development)

2. **NEXTAUTH_SECRET**
   - Value: A secure random string (generate with `openssl rand -base64 32`)
   - Scope: All (Production, Preview, Development)

3. **NEXTAUTH_URL**
   - Value: Your Vercel deployment URL (e.g., https://juntas-seguras.vercel.app)
   - Scope: Production
   - Add a second entry with Preview URLs for Preview environments if needed

4. **NODE_ENV**
   - Value: "production"
   - Scope: Production

5. **SKIP_TYPE_CHECK**
   - Value: "1"
   - Scope: All

6. **NEXT_DISABLE_ESLINT**
   - Value: "1"
   - Scope: All

7. **DISABLE_ESLINT_PLUGIN**
   - Value: "true"
   - Scope: All

### Step 4: Deploy

1. Click "Deploy"
2. Wait for the build and deployment to complete
3. Visit your new deployment URL to verify everything works

## Troubleshooting

If you encounter issues during deployment, try these steps:

1. **Build failures related to ESLint or TypeScript**:
   - Verify that environment variables SKIP_TYPE_CHECK, NEXT_DISABLE_ESLINT, and DISABLE_ESLINT_PLUGIN are set correctly
   - Try deploying with the minimal build option first

2. **MongoDB connection issues**:
   - Ensure your MongoDB Atlas cluster is running
   - Verify that the connection string in the MONGODB_URI environment variable is correct
   - Check that your IP whitelist in MongoDB Atlas includes Vercel's IPs (or set it to allow all IPs for testing)

3. **Authentication issues**:
   - Make sure NEXTAUTH_URL matches your actual deployment URL
   - Verify NEXTAUTH_SECRET is properly set

4. **Static assets not loading**:
   - Check that images and other static assets are properly placed in the public directory

5. **404 errors for API routes**:
   - Ensure all API routes follow Next.js format and are in the correct location

## Check Build Logs

For detailed debugging:

1. Go to your project dashboard on Vercel
2. Click on the latest deployment
3. Go to the "Build Logs" tab to see what went wrong during the build process

## Revert to Minimal Deployment

If you're still having issues with the full deployment, you can temporarily revert to the minimal deployment:

1. Go to your project on Vercel
2. Go to "Settings" > "General"
3. Under "Build & Development Settings", change:
   - Build Command to: `npm run vercel-build`
   - Output Directory to: `.next`
4. Save and redeploy

## Progressive Enhancement

Once your minimal deployment is working, you can progressively enhance your application:

1. First, fix any TypeScript or ESLint errors in your local development environment
2. Then try deploying with build:no-lint to bypass linting but still build the full app
3. Finally, move to the standard next build process when all issues are resolved