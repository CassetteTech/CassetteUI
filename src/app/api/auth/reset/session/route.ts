import { NextRequest, NextResponse } from 'next/server';
import {
  WEB_AUTH_PURPOSES,
  buildBackendUrl,
  buildForwardHeaders,
  clearSessionCookie,
  getSessionIdFromCookies,
  readJsonResponse,
  requireSameOrigin,
  setSessionCookie,
  stripInternalSessionFields,
} from '@/lib/server/auth-proxy';

type ResetExchangeResponse = {
  success?: boolean;
  exchangeCode?: string;
  purpose?: string;
};

type RedeemResponse = {
  success?: boolean;
  sessionId?: string;
  purpose?: string;
  user?: Record<string, unknown>;
};

type ResetSessionBody = {
  accessToken?: string;
  refreshToken?: string;
};

export async function GET(request: NextRequest) {
  const sessionId = getSessionIdFromCookies(request);
  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'No password reset session found' },
      { status: 401 }
    );
  }

  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/password/reset/session'), {
    method: 'GET',
    headers: buildForwardHeaders(request),
    cache: 'no-store',
  });

  const data = await readJsonResponse<Record<string, unknown>>(backendResponse);
  const response = NextResponse.json(
    stripInternalSessionFields(data ?? {}) ?? {},
    { status: backendResponse.status }
  );
  if (backendResponse.status === 401) {
    clearSessionCookie(response);
  }
  return response;
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = (await request.json()) as ResetSessionBody;
  const backendExchange = await fetch(buildBackendUrl('/api/web-auth/password/reset/exchange'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    }),
    body: JSON.stringify({
      token: body.accessToken,
      refreshToken: body.refreshToken,
    }),
    cache: 'no-store',
  });

  const exchangeData = await readJsonResponse<ResetExchangeResponse>(backendExchange);
  if (!backendExchange.ok || !exchangeData?.exchangeCode) {
    return NextResponse.json(exchangeData ?? {}, { status: backendExchange.status });
  }

  const redeemResponse = await fetch(buildBackendUrl('/api/web-auth/exchange/redeem'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    }),
    body: JSON.stringify({
      code: exchangeData.exchangeCode,
      purpose: WEB_AUTH_PURPOSES.passwordReset,
    }),
    cache: 'no-store',
  });

  const redeemData = await readJsonResponse<RedeemResponse>(redeemResponse);
  const response = NextResponse.json(
    stripInternalSessionFields(redeemData ?? {}) ?? {},
    { status: redeemResponse.status }
  );

  if (redeemResponse.ok && redeemData?.sessionId) {
    setSessionCookie(response, redeemData.sessionId, redeemData.purpose);
  }

  return response;
}
