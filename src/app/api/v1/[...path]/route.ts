import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  buildForwardHeaders,
  createProxyResponse,
  readRequestBody,
} from '@/lib/server/auth-proxy';

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

async function handleRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  if (path[0] === 'auth') {
    return new Response(
      JSON.stringify({ success: false, message: 'Use /api/auth routes for browser auth flows' }),
      {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }
    );
  }

  if (process.env.PLAYWRIGHT_TEST === 'true') {
    return NextResponse.json(
      { success: false, message: 'Backend is not configured for Playwright SSR proxy requests' },
      { status: 503 }
    );
  }

  const backendUrl = buildBackendUrl(`/api/v1/${path.join('/')}`, request.nextUrl.search);

  const backendResponse = await fetch(
    backendUrl,
    {
      method: request.method,
      headers: buildForwardHeaders(request),
      body: await readRequestBody(request),
      cache: 'no-store',
    }
  );

  return createProxyResponse(backendResponse);
}

export function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function OPTIONS(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}
