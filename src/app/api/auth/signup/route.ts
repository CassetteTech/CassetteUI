import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
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

  const body = await request.text();
  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/signup'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
    }),
    body,
    cache: 'no-store',
  });

  const data = await readJsonResponse<AuthRouteResponse>(backendResponse);
  const response = NextResponse.json(stripInternalSessionFields(data) ?? {}, { status: backendResponse.status });

  if (backendResponse.ok && data?.authenticated === true && data.sessionId) {
    setSessionCookie(response, data.sessionId);
  }

  return response;
}
