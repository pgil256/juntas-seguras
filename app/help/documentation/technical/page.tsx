'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Terminal, Code, Server, Database, Globe, Lock, LayoutGrid, Cpu } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent } from '../../../../components/ui/card';
import { Separator } from '../../../../components/ui/separator';

export default function TechnicalDocumentationPage() {
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Technical Guide</h2>
        <p className="text-gray-700">
          This technical documentation provides advanced information about the Juntas Seguras platform architecture, APIs, and developer resources.
        </p>

        <div className="space-y-6 mt-8">
          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <LayoutGrid className="h-5 w-5 mr-2 text-blue-600" />
              Platform Architecture
            </h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras is built with modern web technologies to ensure security, performance, and scalability:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Frontend:</span> Next.js 14 with React Server Components and App Router
              </li>
              <li>
                <span className="font-medium">Styling:</span> Tailwind CSS with shadcn/ui components
              </li>
              <li>
                <span className="font-medium">Backend:</span> Next.js API Routes running on Vercel's serverless functions
              </li>
              <li>
                <span className="font-medium">Database:</span> MongoDB Atlas for secure, scalable data storage
              </li>
              <li>
                <span className="font-medium">Authentication:</span> NextAuth.js with JWT and OAuth providers
              </li>
              <li>
                <span className="font-medium">Deployment:</span> Vercel's global edge network
              </li>
            </ul>
            
            <div className="my-6 rounded-lg overflow-hidden border border-gray-200">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-700">Architecture Diagram</p>
              </div>
              <div className="p-4 bg-white">
                <div className="bg-white p-4 rounded border border-gray-200">
                  <div className="space-y-4">
                    <div className="border-2 border-blue-500 rounded-lg p-3 text-center">
                      <p className="font-medium text-blue-700">Client Browser</p>
                      <p className="text-xs text-gray-500">Next.js App</p>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="h-8 w-px bg-gray-300"></div>
                    </div>
                    
                    <div className="border-2 border-green-500 rounded-lg p-3 text-center">
                      <p className="font-medium text-green-700">Vercel Edge Network</p>
                      <p className="text-xs text-gray-500">CDN & Serverless Functions</p>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="h-8 w-px bg-gray-300"></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border-2 border-purple-500 rounded-lg p-3 text-center">
                        <p className="font-medium text-purple-700">API Routes</p>
                        <p className="text-xs text-gray-500">Next.js API</p>
                      </div>
                      <div className="border-2 border-yellow-500 rounded-lg p-3 text-center">
                        <p className="font-medium text-yellow-700">Auth Service</p>
                        <p className="text-xs text-gray-500">NextAuth.js</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="h-8 w-px bg-gray-300"></div>
                    </div>
                    
                    <div className="border-2 border-red-500 rounded-lg p-3 text-center">
                      <p className="font-medium text-red-700">MongoDB Atlas</p>
                      <p className="text-xs text-gray-500">Database Cluster</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Code className="h-5 w-5 mr-2 text-blue-600" />
              API Documentation
            </h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras provides internal APIs for app functionality. These are not currently publicly accessible but are documented here for reference:
            </p>
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-start">
                  <div className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium mr-3">
                    GET
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">/api/pools</p>
                    <p className="text-xs text-gray-500 mt-1">Returns a list of pools the authenticated user is a member of</p>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Response Format:</p>
                      <pre className="mt-1 p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`{
  "pools": [
    {
      "id": "pool123",
      "name": "Family Savings",
      "members": 8,
      "amount": 2400,
      "cycle": "monthly",
      "status": "active"
    },
    ...
  ]
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-start">
                  <div className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium mr-3">
                    POST
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">/api/pools/create</p>
                    <p className="text-xs text-gray-500 mt-1">Creates a new savings pool</p>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Request Format:</p>
                      <pre className="mt-1 p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`{
  "name": "Emergency Fund",
  "description": "For unexpected expenses",
  "amount": 1200,
  "memberLimit": 12,
  "cycleType": "monthly",
  "startDate": "2025-05-01"
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-start">
                  <div className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs font-medium mr-3">
                    PUT
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">/api/pools/{'{poolId}'}</p>
                    <p className="text-xs text-gray-500 mt-1">Updates an existing pool's information</p>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Path Parameters:</p>
                      <p className="text-xs text-gray-500">poolId - The unique identifier of the pool</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Note:</span> All API endpoints require authentication. Include the Authentication header with a valid JWT token for all requests.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Database className="h-5 w-5 mr-2 text-blue-600" />
              Database Schema
            </h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras uses MongoDB collections with the following structure:
            </p>
            <div className="mt-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">User Collection</h4>
                <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`{
  "_id": ObjectId("..."),
  "name": "String",
  "email": "String",
  "hashedPassword": "String",
  "profileImage": "String",
  "emailVerified": Boolean,
  "phoneNumber": "String",
  "phoneVerified": Boolean,
  "twoFactorEnabled": Boolean,
  "createdAt": Date,
  "updatedAt": Date,
  "settings": {
    "language": "String",
    "notifications": Object,
    "timezone": "String"
  }
}`}
                </pre>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Pool Collection</h4>
                <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`{
  "_id": ObjectId("..."),
  "name": "String",
  "description": "String",
  "creatorId": ObjectId("..."),  // Reference to User
  "amount": Number,
  "memberLimit": Number,
  "currentMembers": Number,
  "cycleType": "String",  // monthly, biweekly, etc.
  "status": "String",     // active, completed, cancelled
  "startDate": Date,
  "endDate": Date,
  "createdAt": Date,
  "updatedAt": Date
}`}
                </pre>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Membership Collection</h4>
                <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`{
  "_id": ObjectId("..."),
  "userId": ObjectId("..."),   // Reference to User
  "poolId": ObjectId("..."),   // Reference to Pool
  "role": "String",            // admin, member
  "status": "String",          // active, pending, removed
  "joinDate": Date,
  "cyclePosition": Number,     // Position in rotation
  "payoutReceived": Boolean,
  "createdAt": Date,
  "updatedAt": Date
}`}
                </pre>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Lock className="h-5 w-5 mr-2 text-blue-600" />
              Security Implementation
            </h3>
            <p className="mt-2 text-gray-700">
              Security is paramount for financial applications. Here's how we implement security measures:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Password Storage:</span> Passwords are hashed using bcrypt with salt rounds
              </li>
              <li>
                <span className="font-medium">Authentication:</span> JWT tokens with short expiration times and secure HTTP-only cookies
              </li>
              <li>
                <span className="font-medium">Data Encryption:</span> Sensitive data is encrypted at rest and in transit
              </li>
              <li>
                <span className="font-medium">CSRF Protection:</span> Anti-CSRF tokens for form submissions
              </li>
              <li>
                <span className="font-medium">Input Validation:</span> Server-side validation for all API endpoints
              </li>
              <li>
                <span className="font-medium">Rate Limiting:</span> API rate limiting to prevent brute force attacks
              </li>
            </ul>
            
            <div className="mt-4 p-4 bg-red-50 rounded-md border border-red-100">
              <p className="text-sm text-red-800">
                <span className="font-medium">Security Warning:</span> Never store API keys, passwords, or other sensitive information in client-side code. Always use environment variables for secrets.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Cpu className="h-5 w-5 mr-2 text-blue-600" />
              Performance Optimization
            </h3>
            <p className="mt-2 text-gray-700">
              Juntas Seguras is optimized for performance with the following techniques:
            </p>
            <ul className="mt-2 space-y-3 text-gray-700 list-disc pl-5">
              <li>
                <span className="font-medium">Static Generation:</span> Pre-rendering static content with Next.js
              </li>
              <li>
                <span className="font-medium">Server Components:</span> Using React Server Components to reduce client-side JavaScript
              </li>
              <li>
                <span className="font-medium">Image Optimization:</span> Next.js Image component for automatic optimization
              </li>
              <li>
                <span className="font-medium">Code Splitting:</span> Automatic code splitting by route
              </li>
              <li>
                <span className="font-medium">Database Indexes:</span> MongoDB indexes for frequently queried fields
              </li>
              <li>
                <span className="font-medium">Edge Caching:</span> Vercel's edge caching for static assets
              </li>
            </ul>
            
            <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Performance Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs font-medium text-gray-500">First Contentful Paint</p>
                  <p className="text-lg font-bold text-green-600">0.8s</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs font-medium text-gray-500">Time to Interactive</p>
                  <p className="text-lg font-bold text-green-600">1.2s</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs font-medium text-gray-500">Largest Contentful Paint</p>
                  <p className="text-lg font-bold text-green-600">1.4s</p>
                </div>
                <div className="p-3 bg-white rounded border">
                  <p className="text-xs font-medium text-gray-500">Cumulative Layout Shift</p>
                  <p className="text-lg font-bold text-green-600">0.02</p>
                </div>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Terminal className="h-5 w-5 mr-2 text-blue-600" />
              Development Environment Setup
            </h3>
            <p className="mt-2 text-gray-700">
              For developers who need to work on the Juntas Seguras platform:
            </p>
            <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Environment Requirements</h4>
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                <li>Node.js (v18 or higher)</li>
                <li>npm or yarn</li>
                <li>MongoDB (local instance or Atlas connection)</li>
                <li>Git</li>
              </ul>
              
              <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">Installation Steps</h4>
              <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`# Clone repository
git clone https://github.com/organization/juntas-seguras.git

# Install dependencies
cd juntas-seguras
npm install

# Setup environment variables
cp .env.example .env.local

# Run development server
npm run dev`}
              </pre>
              
              <h4 className="text-sm font-medium text-gray-900 mt-4 mb-2">Environment Variables</h4>
              <pre className="p-2 bg-gray-800 text-gray-100 rounded text-xs overflow-x-auto">
{`MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000`}
              </pre>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Tip:</span> See MONGODB_SETUP.md and VERCEL_DEPLOYMENT.md in the repository root for detailed setup instructions.
              </p>
            </div>
          </section>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200">
          <Link href="/help/documentation/troubleshooting">
            <Button
              variant="outline"
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous: Troubleshooting
            </Button>
          </Link>
          <Link href="/help/contact">
            <Button
              className="flex items-center"
            >
              Contact Support
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}