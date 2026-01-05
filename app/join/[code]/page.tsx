'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect handler for shareable invite links
 * Routes like /join/abc123 redirect to /pools/join?code=abc123
 */
export default function JoinRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  useEffect(() => {
    if (code) {
      // Redirect to the actual join page with the code as a query parameter
      router.replace(`/pools/join?code=${encodeURIComponent(code)}`);
    } else {
      // If no code, redirect to the join page without a code
      router.replace('/pools/join');
    }
  }, [code, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to join page...</p>
      </div>
    </div>
  );
}
