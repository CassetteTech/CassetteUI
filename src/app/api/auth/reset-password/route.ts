import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
  readJsonResponse,
  requireSameOrigin,
} from '@/lib/server/auth-proxy';

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const body = await request.text();
  const backendResponse = await fetch(buildBackendUrl('/api/web-auth/password/reset'), {
    method: 'POST',
    headers: buildForwardHeaders(request, {
      includeSessionHeader: false,
      extraHeaders: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
    }),
    body,
    cache: 'no-store',
  });

  const data = await readJsonResponse<Record<string, unknown>>(backendResponse);
  return NextResponse.json(data ?? {}, { status: backendResponse.status });
}
