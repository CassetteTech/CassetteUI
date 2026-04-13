import { NextRequest, NextResponse } from 'next/server';
import {
  WEB_AUTH_PURPOSES,
  buildBackendUrl,
  buildForwardHeaders,
  clearSignupAttributionCookie,
  readJsonResponse,
  resolveForwardedOrigin,
  setSessionCookie,
} from '@/lib/server/auth-proxy';

type ExchangeResponse = {
  success?: boolean;
  sessionId?: string;
  purpose?: string;
};

function buildPublicRedirectUrl(request: NextRequest, path: string): URL {
  const origin = resolveForwardedOrigin(request) ?? request.nextUrl.origin;
  return new URL(path, `${origin}/`);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(buildPublicRedirectUrl(request, '/auth/signin?error=oauth-error'));
  }

  if (!code) {
    return NextResponse.redirect(buildPublicRedirectUrl(request, '/auth/signin?error=callback-failed'));
  }

  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/exchange/redeem'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    }),
    body: JSON.stringify({
      code,
      purpose: WEB_AUTH_PURPOSES.oauthCallback,
    }),
    cache: 'no-store',
  });

  const data = await readJsonResponse<ExchangeResponse>(backendResponse);
  if (!backendResponse.ok || !data?.sessionId) {
    return NextResponse.redirect(buildPublicRedirectUrl(request, '/auth/signin?error=callback-failed'));
  }

  const response = NextResponse.redirect(buildPublicRedirectUrl(request, '/auth/google/callback'));
  setSessionCookie(response, data.sessionId, data.purpose);
  clearSignupAttributionCookie(response);
  return response;
}
