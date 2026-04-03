import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
  clearSignupAttributionCookie,
  getSignupAttributionFromCookie,
  requireSameOrigin,
  readJsonResponse,
  setSessionCookie,
  stripInternalSessionFields,
} from '@/lib/server/auth-proxy';

type AuthRouteResponse = {
  success?: boolean;
  authenticated?: boolean;
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const payload = await request.json() as Record<string, unknown>;
  const signupAttribution = getSignupAttributionFromCookie(request);
  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/signup'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
    }),
    body: JSON.stringify(
      signupAttribution
        ? {
            ...payload,
            signupAttribution,
          }
        : payload,
    ),
    cache: 'no-store',
  });

  const data = await readJsonResponse<AuthRouteResponse>(backendResponse);
  const response = NextResponse.json(stripInternalSessionFields(data) ?? {}, { status: backendResponse.status });

  if (backendResponse.ok && data?.authenticated === true && data.sessionId) {
    setSessionCookie(response, data.sessionId);
  }

  if (backendResponse.ok && data?.success === true) {
    clearSignupAttributionCookie(response);
  }

  return response;
}
