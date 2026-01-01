import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../app/api/auth/[...nextauth]/options";
import type { Session } from "next-auth";
import { User, UserDocument } from "./db/models/user";
import connectToDatabase from "./db/connect";
import { isValidObjectId } from "./utils/objectId";

// Helper function to get the current session on the server side
export async function getSession(): Promise<Session | null> {
  return await getServerSession(authOptions);
}

// Helper function to check if a user is authenticated on the server side
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

// Helper function to get the current user ID from the session
export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getSession();
  return session?.user?.id;
}

// Helper function to get the authentication token from a request
export async function getAuthToken(req: NextRequest) {
  return await getToken({ req });
}

// Helper function to verify user authorization in API routes
export async function verifyAuth() {
  const session = await getSession();
  
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  
  return { userId: session.user.id };
}

// Add the authentication header to fetch requests
export function addAuthHeader(headers: HeadersInit = {}) {
  return async () => {
    const session = await getSession();

    if (session?.user?.id) {
      return {
        ...headers,
        'user-id': session.user.id,
        'Authorization': `Bearer ${session.user.id}`
      };
    }

    return headers;
  };
}

/**
 * Result type for getCurrentUser function
 */
export type GetCurrentUserResult =
  | { user: UserDocument; error: null }
  | { user: null; error: { message: string; status: number } };

/**
 * Get the current authenticated user from the database
 * This function handles:
 * - Session validation
 * - ObjectId format validation
 * - Email fallback for OAuth users with non-ObjectId IDs
 * - User lookup with proper error handling
 *
 * @returns The user document if found, or an error object with message and status
 */
export async function getCurrentUser(): Promise<GetCurrentUserResult> {
  const session = await getSession();

  if (!session) {
    return {
      user: null,
      error: { message: 'Not authenticated', status: 401 }
    };
  }

  if (!session.user) {
    return {
      user: null,
      error: { message: 'Invalid session: no user data', status: 401 }
    };
  }

  await connectToDatabase();

  const userId = session.user.id;
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
  if (!user && session.user.email) {
    try {
      user = await User.findOne({ email: session.user.email });
      if (user) {
        console.log(`Found user by email fallback: ${session.user.email}, _id: ${user._id}`);
      }
    } catch (error) {
      console.error('Error finding user by email:', error);
    }
  }

  if (!user) {
    return {
      user: null,
      error: {
        message: 'User not found or invalid session',
        status: 401
      }
    };
  }

  return { user, error: null };
}

/**
 * Simplified version that throws on error - use in try/catch blocks
 * @throws Error if user is not found or session is invalid
 */
export async function requireCurrentUser(): Promise<UserDocument> {
  const result = await getCurrentUser();

  if (result.error) {
    const error = new Error(result.error.message) as Error & { status: number };
    error.status = result.error.status;
    throw error;
  }

  return result.user;
}