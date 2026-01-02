import { useSession } from "next-auth/react";

export function useUserId(): string | null {
  const { data: session } = useSession();
  return session?.user?.id || null;
}

// Alias for consistency - returns the real user ID from session
export function useCurrentUserId(): string | null {
  return useUserId();
}
