'use client';

import React, { useEffect, useState } from 'react';

export default function ClientComponentBoundary({
  children,
  className = "",
  suppressHydration = false,
}: {
  children: React.ReactNode;
  className?: string;
  suppressHydration?: boolean;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (suppressHydration && !isMounted) {
    return null;
  }

  return (
    <span suppressHydrationWarning className={className}>
      {children}
    </span>
  );
}