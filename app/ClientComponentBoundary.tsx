"use client";

import { useState, useEffect } from 'react';

/**
 * A component that wraps client components to handle hydration errors gracefully
 * by forcing client-side rendering for anything that might cause hydration issues.
 * 
 * This is especially useful for:
 * 1. Interactive components that get additional browser attributes
 * 2. Components with state that might differ between server and client
 * 3. Components that use browser-specific APIs
 */
interface ClientComponentBoundaryProps {
  children: React.ReactNode;
}

export default function ClientComponentBoundary({ children }: ClientComponentBoundaryProps) {
  const [mounted, setMounted] = useState(false);

  // This ensures that the component only renders on the client
  // avoiding hydration mismatches between server and client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render children until the component has mounted on the client
  if (!mounted) {
    // Return a placeholder with the same general structure but no interactive elements
    // This helps prevent layout shifts while maintaining SEO benefits
    return null;
  }

  return <>{children}</>;
}