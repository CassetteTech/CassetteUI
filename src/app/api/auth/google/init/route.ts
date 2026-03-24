import { NextRequest, NextResponse } from 'next/server';
import { buildBackendUrl, buildForwardHeaders, readJsonResponse, requireSameOrigin } from '@/lib/server/auth-proxy';

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/google/init'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        accept: 'application/json',
      },
    }),
    cache: 'no-store',
  });

  const data = await readJsonResponse<Record<string, unknown>>(backendResponse);
  return NextResponse.json(data ?? {}, { status: backendResponse.status });
}
