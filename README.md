# Juntas Seguras - Financial Savings Pool App

A secure, transparent platform for managing community savings pools (juntas).

## Overview

Juntas Seguras allows groups of people to create and manage savings pools. Members contribute a set amount regularly, and each member gets a turn to receive the full pool amount. This app provides transparency, security, and ease of management for these traditional savings systems.

## Features

- Create and manage savings pools with customizable parameters
- Track contributions and payouts
- Member management with invite system
- In-app messaging for pool communication
- Transaction history and analytics
- Mobile-friendly interface

## Demo Instructions

This is a simplified demo version of the application. To try it out:

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up MongoDB:
   - See [MongoDB Setup Guide](MONGODB_SETUP.md) for detailed instructions
   - Recommended: Use MongoDB Atlas for cloud-hosted database (WSL compatible)
   - Alternative: Run MongoDB locally using Docker

4. Set up environment variables:
   - Create a `.env.local` file with:
   ```
   # For MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/juntas-app
   # Or for local MongoDB
   # MONGODB_URI=mongodb://localhost:27017/juntas-app
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-key
   ```
   
5. Test your database connection:
   ```
   npm run test-db
   ```

6. Start the development server:
   ```
   npm run dev
   ```

7. Seed the database with initial data:
   ```
   curl -X POST http://localhost:3000/api/seed
   ```

8. Login with demo credentials:
   - Email: `demo@example.com`
   - Password: `demo123`

## Tech Stack

- Next.js 15 with App Router
- React 18
- TypeScript
- MongoDB (with Mongoose)
- NextAuth.js for authentication
- Tailwind CSS for styling
- shadcn/ui components

## Working Demo Features

The current demo focuses on core functionality:

- User authentication (simplified)
- Pool creation
- Viewing pool details
- Member management
- Pool messaging

Peripheral features like advanced payment processing, two-factor authentication, and the support system are currently stubbed or mocked.

## Development

To run in development mode:

```
npm run dev
```

To build for production:

```
npm run build
npm start
```

## Deployment

To deploy this application to Vercel:

1. Set up MongoDB Atlas (see [MongoDB Setup Guide](MONGODB_SETUP.md))
2. Follow the [Vercel Deployment Guide](VERCEL_DEPLOYMENT.md) for step-by-step instructions
3. Make sure to set environment variables in the Vercel dashboard:
   - `MONGODB_URI` (your MongoDB Atlas connection string)
   - `NEXTAUTH_SECRET` (see .env.production file)
   - `NEXTAUTH_URL` (your Vercel deployment URL)

## License

This project is licensed under the MIT License - see the LICENSE file for details.