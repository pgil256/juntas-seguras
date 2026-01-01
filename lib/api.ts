import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, getSession } from './auth';
import connectToDatabase from './db/connect';
import { User, UserDocument } from './db/models/user';
import { isValidObjectId } from './utils/objectId';

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

/**
 * Find a user by session ID with email fallback
 * This handles:
 * - Valid MongoDB ObjectIds
 * - Invalid ObjectId formats (e.g., OAuth provider IDs)
 * - Email fallback lookup for OAuth users
 *
 * @param userId - The user ID from the session
 * @returns The user document or null if not found
 */
export async function findUserById(userId: string): Promise<UserDocument | null> {
  let user: UserDocument | null = null;

  // Try to find by MongoDB ObjectId if valid format
  if (isValidObjectId(userId)) {
    try {
      user = await User.findById(userId);
    } catch (error) {
      console.error('Error finding user by ObjectId:', error);
    }
  }

  // Fallback: try finding by email (handles OAuth users with provider IDs)
  if (!user) {
    const session = await getSession();
    if (session?.user?.email) {
      try {
        user = await User.findOne({ email: session.user.email });
        if (user) {
          console.log(`Found user by email fallback: ${session.user.email}, _id: ${user._id}`);
        }
      } catch (error) {
        console.error('Error finding user by email:', error);
      }
    }
  }

  return user;
}

/**
 * Find a user by session ID with email fallback, throws ApiError if not found
 *
 * @param userId - The user ID from the session
 * @returns The user document
 * @throws ApiError with status 401 if user not found
 */
export async function requireUserById(userId: string): Promise<UserDocument> {
  const user = await findUserById(userId);

  if (!user) {
    throw new ApiError('User not found or invalid session', 401);
  }

  return user;
}