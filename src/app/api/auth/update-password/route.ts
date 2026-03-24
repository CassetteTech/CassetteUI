import { NextRequest, NextResponse } from 'next/server';
import {
  WEB_AUTH_PURPOSES,
  buildBackendUrl,
  buildForwardHeaders,
  clearSessionCookie,
  readJsonResponse,
  requireSameOrigin,
  setSessionCookie,
  stripInternalSessionFields,
} from '@/lib/server/auth-proxy';

type UpdatePasswordResponse = {
  success?: boolean;
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = await request.text();
  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/password/update'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      extraHeaders: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    }),
    body,
    cache: 'no-store',
  });

  const data = await readJsonResponse<UpdatePasswordResponse & Record<string, unknown>>(backendResponse);
  const response = NextResponse.json(
    stripInternalSessionFields(data ?? {}) ?? {},
    { status: backendResponse.status }
  );

  if (backendResponse.ok && data?.sessionId) {
    setSessionCookie(response, data.sessionId, WEB_AUTH_PURPOSES.interactive);
  } else if (backendResponse.status === 401) {
    clearSessionCookie(response);
  }

  return response;
}
