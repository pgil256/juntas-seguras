import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// This function can be marked `async` if using `await` inside
export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    const token = req.nextauth.token;
    
    // If the request is for the API and there's no token, deny access
    if (req.nextUrl.pathname.startsWith('/api/') && !token) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
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
    '/profile/:path*',
    '/my-pool/:path*',
    '/member-management/:path*',
    '/pools/:path*',
    '/payments/:path*',
    '/create-pool/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/api/pools/:path*',
    '/api/payments/:path*',
    '/api/notifications/:path*',
    '/api/security/:path*',
    
    // Exclude public routes
    '/((?!api|_next/static|_next/image|favicon.ico|auth/signin).*)',
  ],
};