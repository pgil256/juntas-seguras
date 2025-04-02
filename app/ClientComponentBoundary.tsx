'use client';

import React from 'react';

/**
 * A component that wraps client components to handle hydration errors gracefully
 * by forcing client-side rendering for anything that might cause hydration issues.
 */
export default function ClientComponentBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasMounted, setHasMounted] = React.useState(false);

  // This ensures that the component only renders on the client
  // avoiding hydration mismatches between server and client
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  // Don't render children until the component has mounted on the client
  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}