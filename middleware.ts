import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// This function can be marked `async` if using `await` inside
export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    const token = req.nextauth.token;
    
    // If the token isn't present, no need to do additional checks - withAuth will handle it
    if (!token) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }
      return NextResponse.next();
    }
    
    // Check if MFA verification is required
    // Skip this check in development mode
    if (process.env.NODE_ENV !== 'development' && token.requiresMfa) {
      // Requests to MFA verification page or API should be allowed
      const isMfaPath = req.nextUrl.pathname.includes('/profile/security/two-factor/verify');
      const isMfaApi = req.nextUrl.pathname.includes('/api/security/two-factor');
      const isSignInPath = req.nextUrl.pathname === '/auth/signin';
      
      // Allow requests to MFA verification page, API, and sign-in page
      if (isMfaPath || isMfaApi || isSignInPath) {
        return NextResponse.next();
      }
      
      // For other requests, redirect to MFA verification
      const returnUrl = encodeURIComponent(req.nextUrl.pathname);
      return NextResponse.redirect(
        new URL(`/profile/security/two-factor/verify?returnUrl=${returnUrl}`, req.url)
      );
    }
    
    // Check for payment-related routes that need additional MFA
    // Skip this check in development mode
    if (process.env.NODE_ENV !== 'development') {
      const isPaymentApi = req.nextUrl.pathname.startsWith('/api/payments');
      const isPaymentPage = req.nextUrl.pathname.startsWith('/payments');
      
      // For payment routes, we'll rely on the client-side MFA protection
      // This is just an extra layer of protection for the API
      if (isPaymentApi && !req.headers.get('X-MFA-Verified')) {
        return new NextResponse(
          JSON.stringify({ error: 'MFA verification required for payment operations' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// Configure which paths require authentication
export const config = {
  matcher: [
    // Protected routes that require auth
    '/dashboard/:path*',
    '/profile/:path*',
    '/my-pool/:path*',
    '/member-management/:path*',
    '/pools/:path*',
    '/payments/:path*',
    '/create-pool/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/analytics/:path*',
    
    // Protected API routes
    '/api/pools/:path*',
    '/api/payments/:path*',
    '/api/notifications/:path*',
    '/api/security/:path*',
    '/api/users/:path*',
  ],
};