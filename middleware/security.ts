import { NextRequest, NextResponse } from 'next/server';

/**
 * Apply security headers to all responses
 */
export function securityHeaders(req: NextRequest): NextResponse {
  // Create a new response with security headers
  return applySecurityHeaders(NextResponse.next(), req);
}

export function applySecurityHeaders(response: NextResponse, req: NextRequest): NextResponse {
  // Set security headers
  const headers = response.headers;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    'https://js.stripe.com',
  ].join(' ');
  const connectSrc = [
    "'self'",
    ...(isDevelopment ? ['ws:', 'http://localhost:3000', 'http://127.0.0.1:3000'] : []),
    'https://api.stripe.com',
  ].join(' ');
  
  // Content Security Policy
  // Customize this based on your application needs
  headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://*.stripe.com; font-src 'self' https://fonts.gstatic.com; connect-src ${connectSrc}; frame-src 'self' https://js.stripe.com https://hooks.stripe.com;`
  );
  
  // Prevent browsers from incorrectly detecting non-scripts as scripts
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // XSS Protection
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Disable caching for API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    headers.set('Cache-Control', 'no-store, max-age=0');
  } else {
    // For non-API routes, allow caching with revalidation
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
  }
  
  // Add Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS for secure HTTPS connections
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * Implements rate limiting for sensitive routes
 * This is a simple in-memory implementation and should be replaced with
 * a more robust solution (e.g., Redis) in production
 */
const ipRequestCount: Record<string, { count: number; timestamp: number }> = {};
const MAX_REQUESTS_PER_MINUTE = 60;
const WINDOW_SIZE_MS = 60 * 1000; // 1 minute

export function rateLimit(req: NextRequest): NextResponse | null {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === 'development') {
    return null;
  }
  
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  const now = Date.now();
  
  // Initialize or reset counter if window expired
  if (!ipRequestCount[ip] || now - ipRequestCount[ip].timestamp > WINDOW_SIZE_MS) {
    ipRequestCount[ip] = { count: 1, timestamp: now };
    return null;
  }
  
  // Check rate limit
  if (ipRequestCount[ip].count >= MAX_REQUESTS_PER_MINUTE) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests', message: 'Please try again later' }),
      { 
        status: 429, 
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }
  
  // Increment counter
  ipRequestCount[ip].count++;
  return null;
}
