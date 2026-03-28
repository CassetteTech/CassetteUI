import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
  clearSessionCookie,
  getSessionIdFromCookies,
  readJsonResponse,
  stripInternalSessionFields,
} from '@/lib/server/auth-proxy';

export async function GET(request: NextRequest) {
  const sessionId = getSessionIdFromCookies(request);
  if (!sessionId) {
    return NextResponse.json(
      { success: false, message: 'No authenticated session found' },
      { status: 401 }
    );
  }

  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/session'), {
    method: 'GET',
    headers: buildForwardHeaders(request, {
      extraHeaders: {
        accept: 'application/json',
      },
    }),
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
