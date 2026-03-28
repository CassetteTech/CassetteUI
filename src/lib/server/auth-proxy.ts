import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/utils/url';

export const SESSION_COOKIE_NAME = 'cassette_session';
export const WEB_SESSION_HEADER = 'X-Cassette-Web-Session';
export const INTERNAL_WEB_AUTH_HEADER = 'X-Cassette-Web-Internal';
export const INTERNAL_WEB_AUTH_HEADER_VALUE = 'cassette-ui';
export const WEB_AUTH_PURPOSES = {
  interactive: 'interactive',
  oauthCallback: 'oauth_callback',
  passwordReset: 'password_reset',
} as const;

const FORWARDED_RESPONSE_HEADERS = ['content-type', 'content-disposition'] as const;
const FORWARDED_REQUEST_HEADERS = ['accept', 'authorization', 'content-type', 'x-idempotency-key'] as const;
const INTERACTIVE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_RESET_MAX_AGE_SECONDS = 15 * 60;

function buildCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    ...(typeof maxAgeSeconds === 'number' ? { maxAge: maxAgeSeconds } : {}),
  };
}

export function getSessionIdFromCookies(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export function setSessionCookie(
  response: NextResponse,
  sessionId: string,
  purpose: string = WEB_AUTH_PURPOSES.interactive
) {
  const maxAgeSeconds =
    purpose === WEB_AUTH_PURPOSES.passwordReset
      ? PASSWORD_RESET_MAX_AGE_SECONDS
      : INTERACTIVE_MAX_AGE_SECONDS;

  response.cookies.set(SESSION_COOKIE_NAME, sessionId, buildCookieOptions(maxAgeSeconds));
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', buildCookieOptions(0));
}

export function buildBackendUrl(path: string, search = ''): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiUrl().replace(/\/+$/, '')}${normalizedPath}${search}`;
}

export function buildForwardHeaders(
  request: NextRequest,
  options?: {
    includeSessionHeader?: boolean;
    extraHeaders?: HeadersInit;
  }
): Headers {
  const headers = new Headers(options?.extraHeaders);

  for (const headerName of FORWARDED_REQUEST_HEADERS) {
    const headerValue = request.headers.get(headerName);
    if (headerValue && !headers.has(headerName)) {
      headers.set(headerName, headerValue);
    }
  }

  if (!headers.has('origin')) {
    headers.set('origin', request.headers.get('origin') ?? request.nextUrl.origin);
  }

  if (!headers.has('referer')) {
    headers.set('referer', request.headers.get('referer') ?? request.nextUrl.href);
  }

  if (!headers.has(INTERNAL_WEB_AUTH_HEADER)) {
    headers.set(INTERNAL_WEB_AUTH_HEADER, INTERNAL_WEB_AUTH_HEADER_VALUE);
  }

  if (options?.includeSessionHeader !== false && !headers.has(WEB_SESSION_HEADER)) {
    const sessionId = getSessionIdFromCookies(request);
    if (sessionId) {
      headers.set(WEB_SESSION_HEADER, sessionId);
    }
  }

  return headers;
}

export function requireSameOrigin(request: NextRequest): NextResponse | null {
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return null;
  }

  const expectedOrigin = request.nextUrl.origin;
  const origin = request.headers.get('origin');
  if (origin === expectedOrigin) {
    return null;
  }

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin === expectedOrigin) {
        return null;
      }
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid request origin' },
        { status: 403 }
      );
    }
  }

  return NextResponse.json(
    { success: false, message: 'Invalid request origin' },
    { status: 403 }
  );
}

export async function readRequestBody(request: NextRequest): Promise<ArrayBuffer | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

export async function createProxyResponse(response: Response): Promise<NextResponse> {
  const headers = new Headers();
  for (const headerName of FORWARDED_RESPONSE_HEADERS) {
    const headerValue = response.headers.get(headerName);
    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  const body =
    response.status === 204 || response.status === 205
      ? null
      : await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers,
  });
}

export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as T;
}

export function stripInternalSessionFields<T extends Record<string, unknown> | null>(data: T): T {
  if (!data) {
    return data;
  }

  const sanitized = { ...data };
  delete sanitized.sessionId;
  delete sanitized.purpose;
  delete sanitized.exchangeCode;
  return sanitized as T;
}
