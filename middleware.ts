import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// List of public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/help',
  '/help/documentation',
  '/api/auth', // Allow all NextAuth routes (signin, callback, session, providers, etc.)
];

// List of API routes that require authentication
const protectedApiRoutes = [
  '/api/pools',
  '/api/payments',
  '/api/notifications',
  '/api/users',
  '/api/admin',
  '/api/audit',
  '/api/security',
];

// List of routes that require MFA verification
const mfaProtectedRoutes = [
  '/settings/security',
  '/admin',
];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }
  
  // Allow static files and Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  try {
    // Check for authentication token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    // Redirect to signin if no token
    if (!token) {
      // For API routes, return 401
      if (pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'content-type': 'application/json' } }
        );
      }
      
      // For regular routes, redirect to signin
      const signInUrl = new URL('/auth/signin', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
    
    // Check if MFA is required but not completed
    if (token.requiresMfa && pathname !== '/mfa/verify') {
      // Allow API calls for MFA verification
      if (pathname.startsWith('/api/auth/verify-mfa') || 
          pathname.startsWith('/api/auth/resend-mfa')) {
        return NextResponse.next();
      }
      
      // Redirect to MFA verification
      return NextResponse.redirect(new URL('/mfa/verify', request.url));
    }
    
    // Check for MFA-protected routes that require additional verification
    if (mfaProtectedRoutes.some(route => pathname.startsWith(route))) {
      // You could implement additional MFA checks here if needed
      // For now, just ensure the user has completed initial MFA
      if (!token.mfaSetupComplete) {
        return NextResponse.redirect(new URL('/mfa/setup', request.url));
      }
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // SECURITY: Never fail-open - redirect to signin or return 401
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication error' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    // For page routes, redirect to signin
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('error', 'SessionError');
    return NextResponse.redirect(signInUrl);
  }
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};