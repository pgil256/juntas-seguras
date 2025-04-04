# MongoDB Atlas Setup Guide

This guide will help you set up a MongoDB Atlas cluster for your Juntas Seguras application.

## Step 1: Create a MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up for a free account
3. Complete the initial survey or skip it

## Step 2: Create a Cluster

1. Click "Build a Database"
2. Choose the FREE tier option (M0)
3. Select your preferred cloud provider (AWS, Google Cloud, Azure) and a region close to your users
4. Click "Create Cluster" (this may take a few minutes to provision)

## Step 3: Set Up Database Access

1. From the left sidebar, navigate to "Database Access" under SECURITY
2. Click "Add New Database User"
3. Choose "Password" as the authentication method
4. Create a username and a secure password (save these credentials!)
5. Set "Database User Privileges" to "Read and write to any database"
6. Click "Add User"

## Step 4: Set Up Network Access

1. From the left sidebar, navigate to "Network Access" under SECURITY
2. Click "Add IP Address"
3. For development, you can select "Allow Access from Anywhere" (not recommended for production)
4. For more security, add your specific IP address
5. For Vercel deployments, you'll need to allow access from Vercel's IP range
6. Click "Confirm"

## Step 5: Get Your Connection String

1. From the left sidebar, navigate to "Database" under DEPLOYMENT
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database user's password
6. Replace `myFirstDatabase` with `juntas-app`

## Step 6: Add to Vercel Environment Variables

When deploying to Vercel, add the following environment variables:

1. `MONGODB_URI`: Your full MongoDB connection string
2. `NEXTAUTH_SECRET`: A secure random string (generate with `openssl rand -base64 32`)
3. `NEXTAUTH_URL`: Your Vercel deployment URL (e.g., https://my-juntas-app.vercel.app)

## Checking Your Connection

You can verify your connection is working by:

1. Running the application locally with the MongoDB URI set
2. Checking the MongoDB Atlas dashboard to see active connections
3. Using the test script: `npm run test-db`