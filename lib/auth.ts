import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import type { Session } from "next-auth";

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