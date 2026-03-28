import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
  clearSessionCookie,
  readJsonResponse,
  requireSameOrigin,
} from '@/lib/server/auth-proxy';

export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/account'), {
    method: 'DELETE',
    headers: buildForwardHeaders(request),
    cache: 'no-store',
  });

  const data = await readJsonResponse<Record<string, unknown>>(backendResponse);
  const response = NextResponse.json(data ?? {}, { status: backendResponse.status });

  if (backendResponse.ok || backendResponse.status === 401) {
    clearSessionCookie(response);
  }

  return response;
}
