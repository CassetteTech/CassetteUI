import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
  clearSessionCookie,
  requireSameOrigin,
} from '@/lib/server/auth-proxy';

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  await fetch(buildBackendUrl('/api/web-auth/signout'), {
    method: 'POST',
    headers: buildForwardHeaders(request),
    cache: 'no-store',
  }).catch(() => undefined);

  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  clearSessionCookie(response);
  return response;
}
