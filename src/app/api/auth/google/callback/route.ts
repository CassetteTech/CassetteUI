import { NextRequest, NextResponse } from 'next/server';
import {
  WEB_AUTH_PURPOSES,
  buildBackendUrl,
  buildForwardHeaders,
  readJsonResponse,
  setSessionCookie,
} from '@/lib/server/auth-proxy';

type ExchangeResponse = {
  success?: boolean;
  sessionId?: string;
  purpose?: string;
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/auth/signin?error=oauth-error', request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin?error=callback-failed', request.url));
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
    return NextResponse.redirect(new URL('/auth/signin?error=callback-failed', request.url));
  }

  const response = NextResponse.redirect(new URL('/auth/google/callback', request.url));
  setSessionCookie(response, data.sessionId, data.purpose);
  return response;
}
