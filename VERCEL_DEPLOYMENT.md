# Vercel Deployment Guide for Juntas Seguras App

This guide walks you through deploying your Juntas Seguras application to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (you can sign up with GitHub, GitLab, or Email)
2. Your Juntas Seguras code in a Git repository (GitHub, GitLab, or Bitbucket)
3. A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) database (see MONGODB_SETUP.md)

## Step 1: Connect Your Repository to Vercel

1. Log in to [Vercel](https://vercel.com/)
2. Click "Add New..." > "Project"
3. Import your Git repository
4. Select the Juntas Seguras repository

## Step 2: Configure Project Settings

1. Vercel should auto-detect Next.js settings
2. Project Name: Enter a name for your deployment (e.g., "juntas-seguras")
3. Framework Preset: Ensure "Next.js" is selected
4. Root Directory: Leave as "/" if your repository root is the project root
5. Build Command: Should auto-fill with "next build" from your vercel.json

## Step 3: Environment Variables

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

## Step 4: Deploy

1. Click "Deploy"
2. Wait for the build and deployment to complete
3. Visit your new deployment URL to verify everything works

## Step 5: Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add a custom domain if you have one
3. Follow Vercel's instructions to configure DNS settings

## Step 6: Post-Deployment Verification

After deployment, verify that:

1. The application loads correctly
2. User registration works
3. User login works
4. MongoDB connection is successful (check logs for errors)
5. All features are functional

## Troubleshooting

If you encounter issues:

1. Check Vercel deployment logs for errors
2. Verify environment variables are correct
3. Make sure MongoDB Atlas network access includes Vercel's IP range
4. Check NextAuth.js configuration
5. Review server logs for specific errors

## CI/CD and Auto-Deployments

Vercel automatically deploys:
- When you push to your main branch
- When you create a PR (creates a preview deployment)

You can customize this behavior in your project's Git settings on Vercel.