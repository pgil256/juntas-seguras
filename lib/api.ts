import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './auth';
import connectToDatabase from './db/connect';

/**
 * Helper function to handle API requests with proper authentication and database connection
 * This reduces boilerplate in API route handlers
 */
export async function handleApiRequest<T>(
  request: NextRequest,
  handler: (data: { userId: string }) => Promise<T>,
  options: {
    requireAuth?: boolean;
    methods?: string[];
  } = { requireAuth: true, methods: ['GET', 'POST', 'PUT', 'DELETE'] }
) {
  try {
    // Check HTTP method
    const method = request.method;
    if (options.methods && !options.methods.includes(method)) {
      return NextResponse.json(
        { error: `Method ${method} Not Allowed` },
        { status: 405 }
      );
    }

    // Connect to the database
    await connectToDatabase();

    // Check authentication if required
    let userId = '';
    if (options.requireAuth !== false) {
      const authResult = await verifyAuth();
      
      if ('error' in authResult) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      userId = authResult.userId;
    }

    // Call the handler function
    const result = await handler({ userId });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API error:', error);
    
    // Return appropriate error response
    if (error.status && error.message) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

/**
 * Helper to create API errors with status codes
 */
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number = 500) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}