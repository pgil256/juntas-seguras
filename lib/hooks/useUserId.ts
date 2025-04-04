import { useSession } from "next-auth/react";

export function useUserId(): string | null {
  const { data: session } = useSession();
  return session?.user?.id || null;
}

export function useMockUserId(): string {
  return 'user123';
}

// Use this hook in your app to get the current user ID
// In a demo, you can choose to use the mock user ID for testing
export function useCurrentUserId(): string | null {
  const realUserId = useUserId();
  const mockUserId = useMockUserId();
  
  // If we're in a demo or test environment, or if auth isn't set up yet
  const isDemo = process.env.NODE_ENV !== 'production';
  
  // Return the real user ID if available, otherwise use the mock ID in demo environments
  return realUserId || (isDemo ? mockUserId : null);
}