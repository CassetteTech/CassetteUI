import { NextRequest, NextResponse } from 'next/server';
import {
  SIGNUP_ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  SIGNUP_ATTRIBUTION_COOKIE_NAME,
  extractSignupAttributionFromUrl,
  parseSignupAttributionCookie,
  serializeSignupAttributionCookie,
} from '@/lib/auth/signup-attribution';

function getCanonicalUrl(request: NextRequest): URL | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return null;
  }

  const configuredDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
  if (!configuredDomain) {
    return null;
  }

  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configuredDomain);
  } catch {
    return null;
  }

  if (!configuredUrl.hostname.startsWith('www.')) {
    return null;
  }

  const canonicalApexHost = configuredUrl.hostname.slice(4);
  if (request.nextUrl.hostname !== canonicalApexHost) {
    return null;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = configuredUrl.protocol;
  redirectUrl.hostname = configuredUrl.hostname;
  redirectUrl.port = configuredUrl.port;
  return redirectUrl;
}

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
  const canonicalUrl = getCanonicalUrl(request);
  if (canonicalUrl) {
    return NextResponse.redirect(canonicalUrl, 308);
  }

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
