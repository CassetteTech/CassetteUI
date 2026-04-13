import { NextRequest, NextResponse } from 'next/server';
import {
  SIGNUP_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  SIGNUP_ATTRIBUTION_COOKIE_NAME,
  extractSignupAttributionFromUrl,
  parseSignupAttributionCookie,
  serializeSignupAttributionCookie,
} from '@/lib/auth/signup-attribution';

function buildCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    ...(typeof maxAgeSeconds === 'number' ? { maxAge: maxAgeSeconds } : {}),
  };
}

export function middleware(request: NextRequest) {
  const existingAttribution = parseSignupAttributionCookie(
    request.cookies.get(SIGNUP_ATTRIBUTION_COOKIE_NAME)?.value,
  );

  if (existingAttribution) {
    return NextResponse.next();
  }

  const attribution = extractSignupAttributionFromUrl(
    request.nextUrl,
    request.headers.get('referer'),
  );

  if (!attribution) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(
    SIGNUP_ATTRIBUTION_COOKIE_NAME,
    serializeSignupAttributionCookie(attribution),
    buildCookieOptions(SIGNUP_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS),
  );

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
